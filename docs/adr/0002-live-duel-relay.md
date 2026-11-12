# ADR 0002 — Live duels over a thin, display-only WebSocket relay

- **Status:** Accepted (2026-11-12)
- **Context:** Engagement upgrade Group D — make friend challenges feel live
  (see who joined, watch the rival advance) without weakening the existing
  server-authoritative scoring model.

## Decision

A duel **is** a friend challenge. There is no separate duel entity, no second
question generator and no client-trusted score path.

1. **Room key = challenge code.** The creator gets a 6-character code from the
   existing `/quiz/challenge/create` endpoint. Both players join the same
   deterministic question pack through `/quiz/challenge/{code}/questions`.
2. **WebSocket is display only.** `GET /ws/duel/{code}?nickname=…` (upgrade to
   WS) keeps an in-memory room of connected players per code. It relays:
   - `joined` (private snapshot: you, current players, peers' last progress)
   - `presence` (unique nicknames / count)
   - `progress` (question index, total, correct so far, display score)
   - `finished` (final display score/correct/total)
   - `left`
   It **never** accepts answers, never grades, never writes to the database and
   never changes challenge status.
3. **Scores stay server-authoritative.** The only score that counts is the
   response from `POST /quiz/challenge/{code}/submit`, which re-grades every
   answer against stored answer keys and marks the challenge completed once two
   distinct players have submitted.
4. **Identity.** During the handshake the server reads the existing HttpOnly
   `kwizbox_access` cookie and uses the account nickname when present, so a
   signed-in player cannot impersonate another by editing the query string.
   Cookie-less/guest callers fall back to a sanitised `nickname` query value
   (letters, digits, spaces, `.`, `-`, `'`; max 24 chars).
5. **Robustness.** Messages are JSON, capped at 4 KB, unknown types ignored.
   Numeric fields are clamped; a late `progress` can never un-finish a player.
   Rooms are capped at 32 connections and deleted when empty. The client
   reconnects with capped exponential backoff (1 s → 15 s).
6. **Dev transport.** Vite proxies `/ws` to `ws://127.0.0.1:8001` so the
   handshake is same-origin and the auth cookie is sent, mirroring the fetch
   API. Production uses the same origin as the app (`wss://` under HTTPS).

## Consequences

- No new dependency: FastAPI/Starlette WebSockets, no broker, no database
  migration, no challenge changes.
- The relay is intentionally **single-process**: rooms live in the worker's
  memory. A future multi-worker deployment must add a shared pub/sub layer
  (e.g. Redis) or sticky sessions; until then the feature degrades gracefully
  (players simply do not see each other) while the quiz and official scoring
  keep working.
- Cheating the display board (e.g. a modified client sending fake progress) is
  possible by design; it cannot affect the leaderboard, badges or XP.
- Chat/moderation is out of scope — there is no chat message type.

## Verification

- Backend: `backend/tests/test_duel_ws.py` (3 tests) — presence, relay,
  clamping, late-joiner snapshot, nickname sanitising, invalid code rejection.
- Browser: `frontend/tests/e2e-duel.mjs` — two isolated contexts register,
  create/join one code, see each other in the lobby and quiz, watch progress
  advance to 1/12 and `Finished`, with zero fatal page errors.
- Evidence: `docs/05-testing/TEST_RESULTS.md` (2026-11-12, Group D).
