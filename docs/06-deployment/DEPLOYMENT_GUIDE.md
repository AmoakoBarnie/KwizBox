# DEPLOYMENT_GUIDE.md

> Part of `docs/06-deployment/`. How KwizBox is (and will be) deployed.
> Status: local dev today; Fly.io target in M2.

## Local development (the only currently running mode)

```bash
# Backend  (port 8001)
cd "/media/stephen/FILES/My Projects/KwizBox/backend"
./venv/bin/python -m uvicorn src.main:app --host 0.0.0.0 --port 8001
# health: curl http://localhost:8001/health  → {"status":"ok","service":"kwizbox"}

# Frontend (port 5173, auto-bumps to 5174 if busy)
cd "/media/stephen/FILES/My Projects/KwizBox/frontend"
npm run dev
```

First-time environment setup: `ENVIRONMENT_SETUP.md`.

## Production target (M2) — Fly.io

Components:
- **Dockerfile** (root) — multi-stage build (hardened in `c3de450`).
- **fly.toml** — Fly app config (app `kwizbox-still-bush-3080`).
- **.github/workflows/fly-deploy.yml** — deploy on push (uses GitHub secret
  `FLY_API_TOKEN`).

Required secrets (Fly): `DATABASE_URL` (Supabase URI), `JWT_SECRET`,
`ALLOWED_ORIGINS` (deployed frontend origin; finalize and remove localhost
entries in M2).

Steps (M2):
1. `fly secrets set DATABASE_URL=… JWT_SECRET=… ALLOWED_ORIGINS=…`
2. Deploy via workflow push or `fly deploy`.
3. Verify `https://<app>.fly.dev/health` returns 200 publicly.
4. Run `smoke-auth.mjs` against the public URL; record in TEST_RESULTS.

## Frontend hosting

- **Android (primary):** Capacitor build from `frontend/`, `VITE_API_URL`
  pointing at the public backend (M3 rebuild).
- **Web PWA:** static build (`npm run build`) — final hosting decided in M2
  (GitHub Pages `gh-pages` branch exists as a legacy deploy of an older build;
  treat as historical, not current).

## Legacy / dev-only infrastructure (do not use for production)

- `cloudflared.yml`, `cloudflared-trivia.yml`, `current_tunnel_url.txt`,
  `keepalive*.sh` — Cloudflare quick tunnels used to expose local dev.
- `railway.toml` — Railway alternative considered; Fly chosen.

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
