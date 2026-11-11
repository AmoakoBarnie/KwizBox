# Project: KwizBox

STEM trivia app for Ghanaian learners (Primary 4 / B4 → JHS 3 / B9), NaCCA-aligned.
React + Vite PWA wrapped in Capacitor for Android. FastAPI + SQLite backend, JWT auth.

## Stack
- **Frontend:** `frontend/` — React 18 + Vite + vite-plugin-pwa. Mobile-first, low-data
  for low-end Android/3G. Playwright test suite in `frontend/tests/`.
- **Backend:** `backend/src/` — FastAPI + SQLAlchemy 2.0. JWT auth (registered + guest).
- **Content:** 7,890 questions (Math 3,395 · Science 1,415 · Computing 724 + Physics 794 ·
  ICT 242 · Biology 185 · Chemistry 302 + …), tagged class (B4–B9 / S1–S3 / SHS 1–3) • subject
  • strand • difficulty, each with a 1–4 sentence explanation.

## Release status
- Android (Capacitor) builds + emulator-tested (Android 11, TCG mode, no KVM). APKs in
  `backend/_backup/preview/`.
- Postgres target: Supabase (`gfjcoowxijvmmkdwciwq`, Europe); hosting deferred to M2 (all platform configs removed 2026-11-10)
  + `railway.toml` + `backend/.env.example`.
- Release hardening: `REMEDIATION_PLAN.md` (P0/P1/P2), `HARDENING_LOG.md` (in progress),
  `roadmap.md` (Now / Next / Done / Later / Blocked).
- CI: `.github/workflows/ci.yml` (build + smoke + secret scan). No deploy workflow — hosting deferred to M2 (old workflow recoverable from git history).

## Run (dev)
- Backend :8001: `cd backend && ./venv/bin/python -m uvicorn src.main:app --host 0.0.0.0 --port 8001`
  (port 8000 taken by MusicApp; 8001 = KwizBox).
- Frontend :5173: `cd frontend && npm run dev`. `vite.config.js` proxies all API routes
  (`/auth`, `/quiz/*`, `/admin/*`, `/curriculum`, `/health`, `/media`) → `127.0.0.1:8001`.
- Health: `curl http://localhost:8001/health` → `{"status":"ok","service":"kwizbox"}`.

## Verified conventions
- Do NOT leak the correct answer in `/quiz/pack` responses (only options + metadata).
  Pack items include `question_type` and `image_url`; never `answer_index` or `explanation`.
- Guest submissions are graded but NOT persisted (no leaderboard entry); registered users accumulate.
- `bcrypt` pinned to 4.0.1 in `backend/requirements.txt` — newer bcrypt breaks passlib import.
- SQLite `create_all()` never alters; `backend/src/database.py` runs idempotent `ALTER TABLE`
  + `CREATE UNIQUE INDEX` migrations (see `_migrate_*` functions).
- Supporting: `frontend/src/api.js` (fetch client), `frontend/src/auth.jsx` (AuthContext,
  JWT in localStorage, auto-validate on mount), `frontend/src/badges.js` (24 badges).

## Architecture
- Backend: `backend/src/models.py` (14 models), `auth.py`, `question_types.py`,
  `database.py`, `progress.py`, `mastery.py`, `periods.py`, `routes/` (auth, quiz, admin,
  curriculum, challenge).
- Question images: `backend/static/questions/*.svg` mounted at `/media`.
- Frontend pages: `frontend/src/pages/` (Landing, ChooseQuiz, Challenge, Play, Quiz,
  Summary, Leaderboard, Profile, Admin).

## Agent notes
- Project log: `project-log.md` (append-only: asked / decided / shipped).
- Brain: this file. CLAUDE.md = this runbook.
- Do not delete the real `trivia.db`. Run seed/VETters only after backing it up.
