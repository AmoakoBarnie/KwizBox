# ADR-006 — Deploy KwizBox on Fly Machines with SQLite on a persistent volume

- **Status:** Accepted
- **Date:** 2026-11-14
- **Owner request:** “Set me up on Fly.io and launch this project as an app in
  the stephen-amoako organization: https://fly.io/agent-ready.md”

## Context

The owner previously deferred hosting (M2 rejected 2026-11-11) and rejected the
Postgres/Supabase migration (M1). On 2026-11-14 the owner explicitly requested a
public Fly.io deployment, which supersedes the M2 deferral.

Fly.io offers two products: **Fly Machines** (production apps) and **Sprites**
(cloud development computers). KwizBox is a production web app, so Machines is
the correct product. The app is FastAPI + SQLite with an existing Vite frontend.

## Decision

1. Run **one Fly Machine** in `jnb` (Johannesburg — closest available region to
   Ghana; Fly has no Lagos region), app `kwizbox-gh`.
2. Mount a **1 GB Fly volume** `kwizbox_data` at `/data`; SQLite lives at
   `/data/trivia.db`. This keeps the rejected Postgres migration out of scope.
3. Build and serve the frontend **same-origin**: a multi-stage Docker build runs
   Vite with `VITE_API_URL=` and FastAPI serves `frontend/dist`. This keeps the
   HttpOnly session cookie first-party and avoids CORS/CSP cross-origin issues.
4. Ship a **sanitized questions-only seed** generated from the dev DB by
   `scripts/build_production_seed.py`; `deploy/entrypoint.sh` copies it to the
   volume only when the database is absent. Users, admins, sessions, audit logs,
   school codes, progress and BUG-018 probe rows are excluded.
5. Keep all runtime configuration in **Fly secrets** (`JWT_SECRET`,
   `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_FULLNAME`, `DATABASE_URL`); no
   secrets in `fly.toml` or Git.
6. Deploy **manually** with `flyctl deploy --remote-only --ha=false`. No GitHub
   Actions deploy workflow and no `FLY_API_TOKEN` in the repo.
7. Use `[deploy] strategy = "immediate"` because a rolling deploy cannot attach
   one volume to two Machines.

## Consequences

- **No horizontal scaling** while SQLite + one volume are in use. A future
  Postgres migration is a prerequisite for multiple Machines.
- Deploys briefly replace the single Machine; the volume and data survive.
- Fly scheduled volume snapshots (5 retained) plus manual md5-verified logical
  backups are the recovery path. See `BACKUP_AND_RECOVERY.md`.
- New production-only fixes were required: `FlyClientIPMiddleware` (BUG-024),
  container-relative curriculum manifest (BUG-025), and CSP/cache-busting
  corrections (BUG-026).
- The old app `kwizbox-still-bush-3080` remains destroyed and is not reused.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Fly Sprites | Development computers, not the production app surface |
| Supabase/Postgres | M1 rejected by the owner; adds cost/ops for current scale |
| Multiple Machines | SQLite volume cannot attach to more than one Machine |
| Separate frontend host | Same-origin is simpler and keeps the session cookie first-party |
| GitHub Actions deploy | Manual deploys avoid storing a Fly token in GitHub |
