"""Live duel relay — a thin, display-only WebSocket room per challenge code.

Design (see docs/adr/0002-live-duel-relay.md):

* The challenge code is the room key. Players who already have the code can
  join; nothing here creates or owns a challenge.
* This socket only relays *display* signals (progress, score-so-far, finished).
  It never grades, never stores scores, and never marks a challenge completed —
  `/quiz/challenge/{code}/submit` remains the single source of truth.
* Rooms live in memory in the current worker. That is deliberate for the
  single-process deployment; a multi-worker setup would need a shared broker.

Auth: the HttpOnly session cookie is read during the handshake. When it is
valid, the nickname comes from the account (so it cannot be spoofed). Guests or
cookie-less callers fall back to the sanitised `nickname` query parameter.
"""
from __future__ import annotations

import asyncio
import json
import re
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..auth import decode_token
from ..database import SessionLocal
from ..models import User

router = APIRouter(tags=["duel"])

# code -> connection id -> player record
_rooms: dict[str, dict[int, dict[str, Any]]] = defaultdict(dict)
_next_id = 0

MAX_PLAYERS_PER_ROOM = 32
MAX_MESSAGE_BYTES = 4096
NICKNAME_MAX = 24
_CODE_RE = re.compile(r"^[A-Z0-9]{4,8}$")
_BAD_NICK_RE = re.compile(r"[^\w\s.\-']", re.UNICODE)


def _sanitize_nickname(raw: str | None) -> str:
    name = _BAD_NICK_RE.sub("", str(raw or "")).strip()
    name = re.sub(r"\s+", " ", name)[:NICKNAME_MAX].strip()
    return name or "Player"


def _resolve_nickname(websocket: WebSocket, fallback: str | None) -> str:
    """Prefer the signed-in account's nickname; fall back to the query value."""
    token = websocket.cookies.get("kwizbox_access")
    payload = decode_token(token)
    if payload:
        try:
            user_id = int(payload.get("sub"))
        except (TypeError, ValueError):
            user_id = None
        if user_id is not None:
            db = SessionLocal()
            try:
                user = db.get(User, user_id)
                if user is not None and user.nickname:
                    return _sanitize_nickname(user.nickname)
            finally:
                db.close()
    return _sanitize_nickname(fallback)


def _players(code: str) -> list[str]:
    """Unique nicknames in connection order (a user with two tabs appears once)."""
    seen: list[str] = []
    for player in _rooms.get(code, {}).values():
        if player["nickname"] not in seen:
            seen.append(player["nickname"])
    return seen


def _peers(code: str, exclude_id: int | None = None) -> list[dict]:
    peers = []
    for pid, player in _rooms.get(code, {}).items():
        if pid == exclude_id:
            continue
        peers.append({
            "nickname": player["nickname"],
            "progress": player.get("progress"),
        })
    return peers


async def _send(ws: WebSocket, payload: dict) -> None:
    try:
        await ws.send_text(json.dumps(payload, separators=(",", ":")))
    except Exception:
        # A dead socket is cleaned up by its own handler; never let one failed
        # send break the broadcast for everyone else.
        pass


async def _broadcast(code: str, payload: dict, exclude_id: int | None = None) -> None:
    for pid, player in list(_rooms.get(code, {}).items()):
        if pid == exclude_id:
            continue
        await _send(player["ws"], payload)


def _clamp_int(value: Any, low: int, high: int, default: int = 0) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    return max(low, min(high, number))


def _clean_progress(data: dict) -> dict:
    return {
        "index": _clamp_int(data.get("index"), 0, 100),
        "total": _clamp_int(data.get("total"), 0, 100),
        "correct": _clamp_int(data.get("correct"), 0, 100),
        "score": _clamp_int(data.get("score"), 0, 100_000),
        "finished": bool(data.get("finished", False)),
    }


@router.websocket("/ws/duel/{code}")
async def duel_room(websocket: WebSocket, code: str):
    global _next_id

    room_code = code.strip().upper()
    if not _CODE_RE.match(room_code):
        await websocket.close(code=1008, reason="Invalid challenge code")
        return

    if len(_rooms[room_code]) >= MAX_PLAYERS_PER_ROOM:
        await websocket.close(code=1013, reason="Duel room is full")
        return

    await websocket.accept()

    nickname = _resolve_nickname(websocket, websocket.query_params.get("nickname"))
    _next_id += 1
    player_id = _next_id
    _rooms[room_code][player_id] = {
        "ws": websocket,
        "nickname": nickname,
        "progress": None,
    }

    try:
        # Private snapshot first: who am I, who is already here (with last
        # known progress), so a late joiner immediately sees the live board.
        await _send(websocket, {
            "type": "joined",
            "code": room_code,
            "you": nickname,
            "players": _players(room_code),
            "peers": _peers(room_code, exclude_id=player_id),
        })
        await _broadcast(room_code, {
            "type": "presence",
            "code": room_code,
            "players": _players(room_code),
            "count": len(_players(room_code)),
        }, exclude_id=player_id)

        while True:
            raw = await websocket.receive_text()
            if len(raw.encode("utf-8")) > MAX_MESSAGE_BYTES:
                continue
            try:
                data = json.loads(raw)
            except (ValueError, TypeError):
                continue
            if not isinstance(data, dict):
                continue

            kind = data.get("type")
            if kind == "ping":
                await _send(websocket, {"type": "pong"})
                continue

            if kind == "progress":
                progress = _clean_progress(data)
                # A late, out-of-order progress packet must never un-finish a
                # player — finishing is terminal for the display board.
                previous = _rooms[room_code][player_id].get("progress") or {}
                progress["finished"] = bool(progress["finished"] or previous.get("finished"))
                _rooms[room_code][player_id]["progress"] = progress
                await _broadcast(room_code, {
                    "type": "progress",
                    "nickname": nickname,
                    **progress,
                }, exclude_id=player_id)
                continue

            if kind == "finished":
                progress = _clean_progress({**data, "finished": True})
                _rooms[room_code][player_id]["progress"] = progress
                await _broadcast(room_code, {
                    "type": "finished",
                    "nickname": nickname,
                    "score": progress["score"],
                    "correct": progress["correct"],
                    "total": progress["total"],
                }, exclude_id=player_id)
                continue

            # Unknown message types are ignored — this is not a chat server.
    except WebSocketDisconnect:
        pass
    except (RuntimeError, asyncio.CancelledError):
        # RuntimeError: sending after the client vanished. Everything else is
        # expected teardown; the room cleanup below still runs.
        pass
    finally:
        _rooms[room_code].pop(player_id, None)
        if not _rooms[room_code]:
            _rooms.pop(room_code, None)
        else:
            await _broadcast(room_code, {"type": "left", "nickname": nickname})
            await _broadcast(room_code, {
                "type": "presence",
                "code": room_code,
                "players": _players(room_code),
                "count": len(_players(room_code)),
            })
