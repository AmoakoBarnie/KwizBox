# DEPLOYMENT_GUIDE.md

> Part of `docs/06-deployment/`. How KwizBox is deployed and operated.
> **Live:** <https://kwizbox-gh.fly.dev> (Fly.io, `jnb` / Johannesburg).
> This supersedes the 2026-11-10 hosting deferral: the owner explicitly
> requested a Fly.io deployment on 2026-11-14.

## Current production deployment

| Item | Value |
|---|---|
| Fly app | `kwizbox-gh` (personal org, display name "Stephen Amoako") |
| Public URL | <https://kwizbox-gh.fly.dev> |
| Region | `jnb` (Johannesburg — the closest Fly region to Ghana; there is no Lagos region) |
| Machine | 1 × `shared-cpu-1x`, 512 MB RAM |
| Persistent volume | `kwizbox_data`, 1 GB, mounted at `/data` |
| Database | SQLite at `/data/trivia.db` |
| Container port | `8080` (declared as `internal_port` in `fly.toml`) |
| Image | Multi-stage `Dockerfile`: Vite build → Python 3.12 runtime |
| Frontend | Built same-origin and served by FastAPI from `/app/frontend/dist` |
| Admin | `/admin` (seeded super-admin `Pblack`) |

**One Machine only.** SQLite lives on a single volume and Fly volumes cannot
be attached to two Machines. Do not scale this app to multiple Machines while
it uses SQLite. Migrating to Postgres is a prerequisite for horizontal scale.

## Deployment artifacts in the repo

| Path | Purpose |
|---|---|
| `Dockerfile` | Frontend build + backend runtime image |
| `fly.toml` | App name, region, port, volume mount, health check, VM size |
| `.dockerignore` | Keeps secrets, dev DBs, venvs, `node_modules` and docs out of the image |
| `deploy/entrypoint.sh` | Seeds `/data/trivia.db` once, then starts uvicorn on `$PORT` |
| `scripts/build_production_seed.py` | Builds the sanitized questions-only seed DB |
| `deploy/trivia-seed.db` | Generated seed (gitignored; baked into the image) |

## Secrets and runtime configuration

Secrets are **only** in Fly (`fly secrets`), never in `fly.toml` or Git:

| Secret | Purpose |
|---|---|
| `JWT_SECRET` | Signs user/admin JWTs; rotating it invalidates all sessions |
| `ADMIN_USERNAME` | Seeded super-admin username (`Pblack`) |
| `ADMIN_PASSWORD` | Seeded super-admin password (set once; admin seeding is idempotent) |
| `ADMIN_FULLNAME` | Display name for the seeded admin |
| `DATABASE_URL` | `sqlite:////data/trivia.db` (four slashes = absolute path) |

Create/rotate them without writing values into a tracked file:

```bash
export PATH="$HOME/.fly/bin:$PATH"
flyctl secrets set --app kwizbox-gh --stage \
  JWT_SECRET="$(python3 -c 'import secrets;print(secrets.token_urlsafe(64))')" \
  ADMIN_USERNAME="Pblack" \
  ADMIN_PASSWORD="$(python3 -c 'import secrets;print(secrets.token_urlsafe(18))')" \
  ADMIN_FULLNAME="Stephen Amoako" \
  DATABASE_URL="sqlite:////data/trivia.db"
```

`flyctl secrets set` stages changes; the next `fly deploy` applies them. The
current production secrets were set on 2026-11-14. The admin password is not
stored in the repo; the owner holds it.

## Data: sanitized seed + persistent volume

The deployment never ships the development database. `build_production_seed.py`
copies the schema and question bank, then removes **everything else**:

- users, guest accounts, subjects/topics progress, seen-question history
- quiz sessions, challenges/challenge sessions, leaderboard periods
- admin accounts, audit logs, school codes
- the 32 probe questions created by the old BUG-018 test-isolation leak

It keeps **7,890 curated questions** and two safe system settings
(`maintenance_mode=false`, `max_class_level=B9`), resets per-question answer
counters, runs `PRAGMA integrity_check`, and writes `deploy/trivia-seed.db`.

At container start, `deploy/entrypoint.sh` copies the seed to `/data/trivia.db`
**only when the file is absent**. On every later boot the existing volume
database is used untouched. FastAPI then runs idempotent migrations and seeds
the super-admin if that username does not exist.

Regenerate the seed after changing the question bank:

```bash
cd "/media/stephen/FILES/My Projects/KwizBox"
python3 scripts/build_production_seed.py \
  --source backend/trivia.db \
  --output deploy/trivia-seed.db
```

The seed is gitignored. It is still included in the Docker build context
(`.dockerignore` explicitly does not exclude it).

## First-time deployment (already done 2026-11-14)

```bash
export PATH="$HOME/.fly/bin:$PATH"
cd "/media/stephen/FILES/My Projects/KwizBox"

flyctl auth login
flyctl apps create kwizbox-gh --org personal
flyctl volumes create kwizbox_data --region jnb --size 1 --app kwizbox-gh
# set the secrets (section above), then:
flyctl deploy --app kwizbox-gh --remote-only --ha=false
```

`fly.toml` uses `[deploy] strategy = "immediate"` because a rolling deploy
cannot attach one volume to two Machines. A deploy briefly replaces the single
Machine; the volume and database survive.

## Redeploying a release

```bash
export PATH="$HOME/.fly/bin:$PATH"
cd "/media/stephen/FILES/My Projects/KwizBox"

# 1. If the question bank changed, rebuild the sanitized seed first.
python3 scripts/build_production_seed.py

# 2. Deploy (Fly's remote builder; no local Docker required).
flyctl deploy --app kwizbox-gh --remote-only --ha=false

# 3. Verify.
curl -sS https://kwizbox-gh.fly.dev/health
KWIZBOX_TEST_URL=https://kwizbox-gh.fly.dev node frontend/tests/smoke-auth.mjs
```

Run `smoke-auth.mjs` **last** — it intentionally trips register and quiz rate
limits. For UI verification:

```bash
node frontend/tests/route-smoke.mjs https://kwizbox-gh.fly.dev
node frontend/tests/e2e-guest.mjs https://kwizbox-gh.fly.dev
```

## Backups and recovery

Fly takes scheduled volume snapshots (5 retained). Create one manually before
any risky change:

```bash
flyctl volumes snapshots create <volume-id> --app kwizbox-gh
flyctl volumes list --app kwizbox-gh
flyctl volumes snapshots list <volume-id> --app kwizbox-gh
```

For a logical SQLite backup before any destructive operation, use the Fly
Machine's Python and download the copy:

```bash
flyctl ssh console --app kwizbox-gh
# inside the Machine:
python3 - <<'PY'
import sqlite3
src = sqlite3.connect('/data/trivia.db')
dst = sqlite3.connect('/data/trivia-backup.db')
src.backup(dst)
dst.close(); src.close()
PY
exit
flyctl ssh sftp get /data/trivia-backup.db ./trivia-backup.db --app kwizbox-gh
md5sum ./trivia-backup.db
```

**Never delete or replace `/data/trivia.db` without the owner's explicit
approval and an md5-verified backup.** Deleting it destroys all live accounts,
sessions, progress and audit history; the container will re-seed questions and
the super-admin on the next boot, but user data is gone.

## Rollback

- **Application code:** `flyctl releases --app kwizbox-gh`, then redeploy the
  previous image/commit (`flyctl deploy --image <image-ref>`). The volume is
  unaffected.
- **Database:** restore a volume snapshot or the md5-verified SQLite copy.
- Never roll back by force-pushing Git history; roll forward with a `fix:` commit.

## Local development

```bash
# Backend (port 8001) — ADMIN_PASSWORD is required
cd "/media/stephen/FILES/My Projects/KwizBox/backend"
ADMIN_PASSWORD='<choose-one>' ./venv/bin/python -m uvicorn src.main:app \
  --host 0.0.0.0 --port 8001

# Frontend (port 5174; Vite proxies API + WebSocket, keeping the cookie first-party)
cd "/media/stephen/FILES/My Projects/KwizBox/frontend"
npm run dev -- --port 5174 --strictPort
```

Production build (same-origin, served by the backend):

```bash
cd frontend
VITE_API_URL= npm run build
```

`frontend/.env.production` is intentionally empty (`VITE_API_URL=`), so a
normal `npm run build` is same-origin too. First-time environment setup:
`ENVIRONMENT_SETUP.md`.

## Post-deploy checklist (each release)

- [ ] `flyctl status` shows the Machine `started` and health check passing
- [ ] `GET /health` → `{"status":"ok","service":"KwizBox"}`
- [ ] `/admin` loads; admin login returns 200 and role `super_admin`
- [ ] Dashboard question count matches the seed (currently 7,890)
- [ ] `route-smoke.mjs` 13/13 against the public URL
- [ ] `e2e-guest.mjs` 5/5 against the public URL
- [ ] `smoke-auth.mjs` 30/30 against the public URL (run last)
- [ ] 3D mascots render in colour (CSP allows `blob:` textures + fonts)
- [ ] Restart the Machine and confirm data persists (volume is mounted)
- [ ] Record evidence in `docs/05-testing/TEST_RESULTS.md`
- [ ] No secrets in `fly.toml`, Git, or logs; gitleaks clean
- [ ] `CHANGELOG.md` and `PROJECT_STATUS.md` updated
