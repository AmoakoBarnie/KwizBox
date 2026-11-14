# IMPLEMENTATION_PLAN.md

> Part of `docs/04-development/`. The task breakdown for the **current**
> milestone. M1 (Postgres) is rejected; M2 (hosting) completed on 2026-11-14.
> Next: M3 (Android APK). Milestone definitions and acceptance criteria:
> `docs/01-project-planning/ROADMAP.md`.

## M0 — Initialization (COMPLETE 2026-11-10)

All tasks delivered; see `PROJECT_STATUS.md`. Approval gate pending.

## M1 — SQLite → Postgres (Supabase) — REJECTED (2026-11-11)

Kept for history. The owner rejected the migration; the app runs on SQLite.
Do not execute these tasks unless the owner explicitly reopens M1.

| # | Task | Depends on | Done when |
|---|---|---|---|
| 1.1 | Owner provides Supabase connection URI (port 5432) | owner action | URI stored in `backend/.env` only |
| 1.2 | Back up `backend/trivia.db` (copy + checksum, per BACKUP_AND_RECOVERY.md) | — | backup exists, md5 recorded |
| 1.3 | Run `backend/scripts/migrate_sqlite_to_pg.py "<uri>"` | 1.1, 1.2 | script exits 0 |
| 1.4 | Verify row counts — all 13 tables match | 1.3 | counts recorded in TEST_RESULTS |
| 1.5 | Start API against Postgres on a temp port (8002) with `DATABASE_URL` | 1.4 | `/health` OK |
| 1.6 | Run core-loop checks: `smoke-auth.mjs`, `route-smoke.mjs`, `e2e-guest.mjs` against 8002 | 1.5 | results in TEST_RESULTS |
| 1.7 | Update env docs + DECISION_LOG entry marking ADR-004 executed | 1.6 | docs updated |
| 1.8 | Decide SQLite fallback policy (keep file read-only as rollback) | 1.6 | documented in ADR-004 addendum |

## M2 — Backend deployment (Fly.io) — ✅ COMPLETE 2026-11-14

| # | Task | Done when | Status |
|---|---|---|---|
| 2.1 | Set Fly secrets (`JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_FULLNAME`, `DATABASE_URL`) | secrets exist in Fly only | ✅ |
| 2.2 | Deploy with `flyctl deploy --remote-only --ha=false` (manual; no GitHub workflow) | deployment green | ✅ |
| 2.3 | Public `/health` 200 + security headers + per-client rate limits verified | curl evidence in TEST_RESULTS | ✅ |
| 2.4 | Same-origin frontend, CSP (blob textures/fonts), curriculum manifest | verified from public URL | ✅ |
| 2.5 | Frontend env: production web same-origin (`VITE_API_URL=`); native build uses public URL | committed | ✅ |

## M3 — Android APK rebuild

| # | Task | Done when |
|---|---|---|
| 3.1 | Rebuild with public `VITE_API_URL` | APK builds |
| 3.2 | Emulator sanity (Android 11 AVD, TCG): guest → quiz → submit | recorded in TEST_RESULTS |
| 3.3 | Sign release build; back up keystore **outside** the repo | signed artifact archived |

## M4 — Play Store submission

| # | Task | Done when |
|---|---|---|
| 4.1 | Developer account + identity verification | active account |
| 4.2 | Listing: screenshots (existing slide PNGs can be sourced), description, privacy policy link | listing complete |
| 4.3 | Upload signed AAB/APK | submitted for review |
| 4.4 | Record review status | PROJECT_STATUS updated |

## Standing rules

- One milestone at a time; no feature work from the "Later" queue during M1–M4.
- Each task completion updates `PROJECT_STATUS.md` and, if code changed,
  CHANGELOG + relevant docs.
- Any surprise discovered mid-task becomes a BUG_TRACKER entry before work
  continues.
