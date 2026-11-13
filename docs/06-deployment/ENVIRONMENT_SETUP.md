# ENVIRONMENT_SETUP.md

> Part of `docs/06-deployment/`. Standing up a working KwizBox environment
> from a fresh clone of this repository.

## What a clone gives you (and what it doesn't)

`git clone` provides all tracked code and history. **It does not provide:**
`backend/trivia.db` (gitignored live data), `backend/.env`, `frontend/.env`
(secrets/local config), `backend/venv/`, `frontend/node_modules/` (regenerable).

If you are working from the canonical machine, the first two already exist in
the repo directory (copied and checksum-verified 2026-11-10). On a new machine
you must obtain a copy of `trivia.db` and create the `.env` files (values from
the owner — never commit them).

## Backend

```bash
cd backend
python3 -m venv venv            # create fresh — NEVER copy a venv between machines/locations
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
cp .env.example .env            # then set JWT_SECRET (required) and DATABASE_URL
ADMIN_PASSWORD='<choose-one>' ./venv/bin/python -m uvicorn src.main:app --host 0.0.0.0 --port 8001
```

`JWT_SECRET` and `ADMIN_PASSWORD` are both required — startup seeds the
super-admin and refuses to run without them.

Check: `curl http://localhost:8001/health` → `{"status":"ok","service":"KwizBox"}`.
On startup the app runs idempotent SQLite migrations and seeds the super-admin
account if missing.

## Frontend

```bash
cd frontend
npm ci                          # use ci (lockfile-exact), not install
npm run dev -- --port 5174 --strictPort
```

`.env.development` deliberately sets `VITE_API_URL=` **empty**, so requests are
same-origin and Vite proxies the API routes + `/ws` to `:8001`. That keeps the
HttpOnly session cookie first-party; calling `http://localhost:8001` directly
makes Chrome drop it. Open `http://localhost:5174` (not `127.0.0.1`).
Production build: `npm run build` → `dist/` (set `VITE_API_URL` first —
`.env.production` still has the retired Fly URL).

## Tests

```bash
# backend unit
cd backend && ./venv/bin/python -m pytest tests/ -q
# browser scripts (backend must be running on :8001)
cd frontend && node tests/smoke-auth.mjs
cd frontend && node tests/route-smoke.mjs
```

## Android (optional; only for M3 / release work)

- Capacitor project in `frontend/android/` (`com.kwizbox.app`).
- Emulator: Android 11 AVD `kwizbox_a11` (TCG software mode — this host has
  no KVM; Android 14 WebView crashes under TCG).
- Builds via Gradle from `frontend/android/`.

## Host-specific notes (this machine)

- Repo lives on NTFS (`/media/stephen/FILES`) — installs are slower; git has
  `core.fileMode=false` + `core.untrackedCache=true` (already configured).
- Ports 8000 & 5173 are often taken by another project (MusicApp).
- `sqlite3` CLI absent — use `python3 -c "import sqlite3; …"`.

## Verification (prove the environment works)

1. `/health` returns ok.
2. `node frontend/tests/smoke-auth.mjs` passes.
3. `node frontend/tests/route-smoke.mjs` passes.
4. Record all three in `docs/05-testing/TEST_RESULTS.md`.
