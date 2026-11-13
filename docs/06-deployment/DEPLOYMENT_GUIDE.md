# DEPLOYMENT_GUIDE.md

> Part of `docs/06-deployment/`. How KwizBox is (and will be) deployed.
> Status: local dev only — hosting deferred to M2 (platform artifacts
> removed 2026-11-10; nothing is deployed anywhere).

## Local development (the only currently running mode)

```bash
# Backend  (port 8001) — ADMIN_PASSWORD is required
cd "/media/stephen/FILES/My Projects/KwizBox/backend"
ADMIN_PASSWORD='<choose-one>' ./venv/bin/python -m uvicorn src.main:app --host 0.0.0.0 --port 8001
# health: curl http://localhost:8001/health  → {"status":"ok","service":"KwizBox"}

# Frontend (port 5174; same-origin proxy keeps the session cookie first-party)
cd "/media/stephen/FILES/My Projects/KwizBox/frontend"
npm run dev -- --port 5174 --strictPort
```

First-time environment setup: `ENVIRONMENT_SETUP.md`.

## Production target (M2) — hosting deferred

> **2026-11-10: all host-platform artifacts were removed from the repo and the
> stale deployments were torn down** (owner instruction: "delete the host
> platforms not working"): the Fly.io app `kwizbox-still-bush-3080` was
> destroyed via flyctl (it was a stale Nov-4 deployment running the leaked
> pre-rotation JWT secret), `fly.toml`, both Dockerfiles, `.dockerignore`,
> `railway.toml`, the InfinityFree `_backup/php-backend/`, root `.htaccess`,
> Vercel configs, and the stale env backups were deleted, and the
> `gh-pages` / `flyio-new-files` remote branches were removed (local copies
> retained). Everything is recoverable from git history (`git log --all --
> <path>`) and the pre-purge bundle.

When M2 starts, choose a host fresh:

1. Recreate a deploy workflow (the old one is in git history:
   `git log --all -- .github/workflows/fly-deploy.yml`) or deploy manually.
2. Set secrets on the platform: `DATABASE_URL` (Supabase URI), `JWT_SECRET`,
   `ALLOWED_ORIGINS` (deployed frontend origin; remove localhost entries).
3. Verify `/health` returns 200 publicly.
4. Run `smoke-auth.mjs` against the public URL; record in TEST_RESULTS.

Note: `frontend/.env.production` still points at the (now dead) Fly URL —
update it during M2/M3 before building for production.

## Frontend hosting

- **Android (primary):** Capacitor build from `frontend/`, `VITE_API_URL`
  pointing at the public backend (M3 rebuild).
- **Web PWA:** static build (`npm run build`) — final hosting decided in M2
  (the legacy `gh-pages` branch was removed 2026-11-10; it served a stale
  pre-rename build).

## Legacy / dev-only infrastructure (do not use for production)

- `cloudflared.yml`, `cloudflared-trivia.yml`, `current_tunnel_url.txt`,
  `keepalive*.sh` — Cloudflare quick tunnels used to expose local dev.
- ~~`railway.toml`~~ — Railway alternative; removed 2026-11-10 with the other
  host-platform artifacts.

## Rollback

- Backend: redeploy previous image (`fly releases` / workflow re-run on prior
  commit). Database is external (Supabase) — unaffected by app rollback.
- SQLite fallback: `backend/trivia.db` remains the pre-migration snapshot
  until M5 removes it deliberately.
- Never roll back by force-pushing; roll forward with a `fix:` commit.

## Post-deploy checklist (each release)

- [ ] `/health` 200 public
- [ ] smoke-auth against public URL (headers + rate limits)
- [ ] gitleaks clean; no secrets in the deployed config
- [ ] CHANGELOG entry; PROJECT_STATUS updated
