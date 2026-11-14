"""Duel WebSocket relay tests — two clients in one room, display-only messages.

Run from backend/:  ./venv/bin/python -m pytest tests/test_duel_ws.py -q

The relay is deliberately independent of the database: cookie-less callers use
the sanitised nickname query value, so these tests need no seeded DB and never
touch trivia.db.
"""
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from src.routes import duel  # noqa: E402

app = FastAPI()
app.include_router(duel.router)


def test_two_players_see_presence_and_progress():
    with TestClient(app) as client:
        with client.websocket_connect("/ws/duel/abc123?nickname=Alpha") as alpha:
            joined = alpha.receive_json()
            assert joined["type"] == "joined"
            assert joined["you"] == "Alpha"
            assert joined["players"] == ["Alpha"]
            assert joined["code"] == "ABC123"

            with client.websocket_connect("/ws/duel/ABC123?nickname=Beta") as beta:
                beta_joined = beta.receive_json()
                assert beta_joined["type"] == "joined"
                assert beta_joined["players"] == ["Alpha", "Beta"]
                assert beta_joined["peers"] == [{"nickname": "Alpha", "progress": None}]

                presence = alpha.receive_json()
                assert presence["type"] == "presence"
                assert presence["count"] == 2

                # Progress is relayed to the opponent only (no echo to sender).
                beta.send_json({"type": "progress", "index": 3, "total": 12,
                                "correct": 2, "score": 30})
                event = alpha.receive_json()
                assert event == {
                    "type": "progress", "nickname": "Beta",
                    "index": 3, "total": 12, "correct": 2, "score": 30,
                    "finished": False,
                }

                # Finished is also display-only relay.
                beta.send_json({"type": "finished", "index": 12, "total": 12,
                                "correct": 7, "score": 95})
                finished = alpha.receive_json()
                assert finished == {
                    "type": "finished", "nickname": "Beta",
                    "score": 95, "correct": 7, "total": 12,
                }

                # Out-of-range numbers are clamped, junk is ignored.
                beta.send_json({"type": "progress", "index": -50, "total": 9999,
                                "correct": 9999, "score": -7})
                clamped = alpha.receive_json()
                assert clamped["index"] == 0 and clamped["total"] == 100
                assert clamped["correct"] == 100 and clamped["score"] == 0

                # A late joiner receives the last known progress of everyone.
                with client.websocket_connect("/ws/duel/ABC123?nickname=Gamma") as gamma:
                    gamma_joined = gamma.receive_json()
                    peers = {p["nickname"]: p["progress"] for p in gamma_joined["peers"]}
                    assert peers["Beta"] == {
                        "index": 0, "total": 100, "correct": 100,
                        "score": 0, "finished": True,
                    }
                    # Both existing players learn about Gamma.
                    assert alpha.receive_json()["type"] == "presence"
                    assert beta.receive_json()["type"] == "presence"

                # Gamma left first (inner context) — both survivors are told.
                assert alpha.receive_json() == {"type": "left", "nickname": "Gamma"}
                gamma_left_presence = alpha.receive_json()
                assert gamma_left_presence["type"] == "presence"
                assert gamma_left_presence["players"] == ["Alpha", "Beta"]

            # Beta left: Alpha sees the departure, then the updated presence.
            left = alpha.receive_json()
            assert left == {"type": "left", "nickname": "Beta"}
            after = alpha.receive_json()
            assert after["type"] == "presence"
            assert after["players"] == ["Alpha"]


def test_reconnect_inherits_progress_and_does_not_announce_leave():
    """A second socket for the same nickname must not wipe the rival's board.

    React StrictMode (and a flaky phone connection) can open a new socket
    before the old one is closed. The relay must treat them as one player:
    inherit the last progress, do not broadcast "left" while any socket for
    that nickname remains, and keep relaying updates from the new socket.
    """
    with TestClient(app) as client:
        alpha_cm = client.websocket_connect("/ws/duel/RECON1?nickname=Alpha")
        alpha = alpha_cm.__enter__()
        beta_cm = client.websocket_connect("/ws/duel/RECON1?nickname=Beta")
        beta = beta_cm.__enter__()
        try:
            assert alpha.receive_json()["type"] == "joined"
            assert beta.receive_json()["type"] == "joined"
            assert alpha.receive_json()["type"] == "presence"

            beta.send_json({"type": "progress", "index": 4, "total": 12,
                            "correct": 3, "score": 40})
            assert alpha.receive_json()["index"] == 4

            beta2_cm = client.websocket_connect("/ws/duel/RECON1?nickname=Beta")
            beta2 = beta2_cm.__enter__()
            try:
                beta2_joined = beta2.receive_json()
                assert beta2_joined["players"] == ["Alpha", "Beta"]
                # Own nickname is excluded from peers even with two sockets.
                assert beta2_joined["peers"] == [{"nickname": "Alpha", "progress": None}]
                # The room sees presence for the reconnect, not a new player.
                assert alpha.receive_json()["type"] == "presence"

                # Retire the old socket. Beta is still connected, so Alpha must
                # NOT receive a "left" event that clears the progress board.
                beta_cm.__exit__(None, None, None)
                beta = None
                event = alpha.receive_json()
                assert event["type"] == "presence", event
                assert event["players"] == ["Alpha", "Beta"]
                assert beta2.receive_json()["type"] == "presence"

                # The inherited progress survives on the new socket.
                with client.websocket_connect("/ws/duel/RECON1?nickname=Gamma") as gamma:
                    gamma_joined = gamma.receive_json()
                    peers = {p["nickname"]: p["progress"] for p in gamma_joined["peers"]}
                    assert peers["Beta"]["index"] == 4
                    assert peers["Beta"]["correct"] == 3
                    assert alpha.receive_json()["type"] == "presence"
                    assert beta2.receive_json()["type"] == "presence"
                # Gamma left; Beta's board is still not cleared.
                assert alpha.receive_json()["type"] == "left"
                assert beta2.receive_json()["type"] == "left"
                assert alpha.receive_json()["type"] == "presence"
                assert beta2.receive_json()["type"] == "presence"

                # Updates from the new socket still relay.
                beta2.send_json({"type": "progress", "index": 5, "total": 12,
                                 "correct": 4, "score": 50})
                assert alpha.receive_json()["index"] == 5

                # Closing the last socket for Beta emits exactly one "left".
                beta2_cm.__exit__(None, None, None)
                beta2 = None
                left = alpha.receive_json()
                assert left == {"type": "left", "nickname": "Beta"}
                assert alpha.receive_json()["type"] == "presence"
            finally:
                if beta2 is not None:
                    beta2_cm.__exit__(None, None, None)
        finally:
            if beta is not None:
                beta_cm.__exit__(None, None, None)
            alpha_cm.__exit__(None, None, None)


def test_nickname_is_sanitised_and_required_fields_are_bounded():
    with TestClient(app) as client:
        with client.websocket_connect("/ws/duel/ROOM42?nickname=%3Cscript%3E%20Ada") as ws:
            joined = ws.receive_json()
            # Markup characters removed, whitespace collapsed.
            assert joined["you"] == "script Ada"


def test_invalid_room_code_is_rejected():
    with TestClient(app) as client:
        try:
            with client.websocket_connect("/ws/duel/no?nickname=A"):
                raise AssertionError("invalid code should close the socket")
        except Exception as exc:  # starlette raises WebSocketDisconnect on close
            assert getattr(exc, "code", None) == 1008 or "1008" in str(exc) or "Invalid" in str(exc)
