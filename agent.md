# KwizBox — Agent Runbook

## Purpose
Compact reference so any session can act on this repo correctly without re-deriving the ground truth.

## Map
| | |
|---|---|
| **Project root** | `/home/stephen/Desktop/KwizBoz Andriod` |
| **Backend** | `backend/src/` (FastAPI, :8001) |
| **Frontend** | `frontend/` (React + Vite, :5173) |
| **DB** | `backend/trivia.db` (SQLite, 7,710 questions, 3.3 MB) |
| **Supabase** | `gfjcoowxijvmmkdwciwq` (Europe) — target DB |
| **Android** | `frontend/android/` (Capacitor, com.kwizbox.app) |
| **3D mascots** | `models/` (masters + clips + GLBs, meshopt-compressed) |
| **Docs** | `README.md`, `project-log.md`, `roadmap.md`, `docs/APP_DOCUMENTATION.md` |

## Ground truth (verified)
- Questions: **7,710** (Math 3,335 · Science 1,355 · Computing 664 · Physics 794 · ICT 242 · Biology 185 · Chemistry 302 + …)
- Classes: B4–B9, S1–S3, SHS 1–3
- Dev ports: backend `8001`, frontend `5173` (Vite proxies API → backend 8001)
- Backend venv: `backend/venv/bin/python`; run `./venv/bin/python -m uvicorn src.main:app --port 8001`
- Migration script: `backend/scripts/migrate_sqlite_to_pg.py`
- Android APKs: `backend/_backup/preview/KwizBox-emulator.apk` + `KwizBox-phone.apk`

## Working rules
1. **Verify before changing.** Read the real file (or `trivia.db` via sqlite3) before editing.
2. **Appending:** `project-log.md` is append-only — add `## YYYY-MM-DD` sections; never rewrite history.
3. **Agent context files** (all three live in the repo root): `brain.md` (facts/state),
   `CLAUDE.md` (runbook), `agent.md` (this file). Keep them in sync.
4. **Run tests:** `frontend/tests/*.mjs` are Playwright-style scripts (run from `frontend/`).
   `.github/workflows/fly-deploy.yml` deploys the backend to Fly.io.
5. **No KVM:** Android emulator only in TCG software mode; Android 11 survives, Android 14 crashes the WebView.
6. **`bcrypt` 4.0.1** pinned in `backend/requirements.txt` — do not bump blindly.
7. **Do not delete the real `trivia.db`.** Use seed/VETters only after backing it up.

## When blocked
- Push to the board / use `kanban_create` instead of blocking-loop on a single blocker.
- Real blockers for the Play Store: developer account ($25 one-time) + identity verification.

## Creds (do not expose; rotate on use)
- Admin: `admin` / `Admin@1234` — removed from `seed_admin.py`; requires `ADMIN_PASSWORD` env var in prod.
- Demo users (pets): `peswa` / `password123`, `testuser` / `password123` — for demos only; never commit real credentials.
