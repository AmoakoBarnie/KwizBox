# ROADMAP.md

> Part of `docs/01-project-planning/`. Milestone view with acceptance criteria.
> Day-to-day board (Now/Next/Done/Later/Blocked) lives at the repo root
> `roadmap.md`; append-only history in `project-log.md`.

## Milestone overview

| ID | Milestone | Status | Depends on |
|---|---|---|---|
| M0 | Professional initialization & governance | ✅ Done 2026-11-10 (approval pending) | — |
| M1 | SQLite → Postgres (Supabase) migration | ⛔ Blocked on connection string | M0 |
| M2 | Backend public deployment (Fly.io) | Not started | M1 |
| M3 | Android APK rebuild against public backend | Not started | M2 |
| M4 | Play Store submission | Not started | M3, owner accounts |
| M5 | Post-release stabilization | Not started | M4 |

## M0 — Initialization & governance ✅ (2026-11-10)

Delivered: authoritative repo at `/media/stephen/FILES/My Projects/KwizBox`;
full history + branches; gitignored data copied and checksum-verified;
governance docs (AGENTS/STATUS/HANDOFF/CHANGELOG/CONTRIBUTING + docs tree +
ADRs + traceability). **Acceptance:** owner approves the initialization
report. *Not yet approved.*

## M1 — Database migration to Postgres (Supabase)

Goal: production database off the SQLite file, zero data loss.

Tasks:
1. Owner provides Supabase connection URI
   (`Settings ⚙️ → Database → Connection string → URI`, port 5432 — not 6543).
2. Back up `backend/trivia.db` (see BACKUP_AND_RECOVERY.md).
3. Run `backend/scripts/migrate_sqlite_to_pg.py "<uri>"` (script already proven
   on 9,276 rows with 3 bug fixes: VARCHAR, booleans, self-ref FK).
4. Verify **all 13 tables** match row counts between SQLite and Postgres.
5. Run the API against Postgres (temporary port, e.g. 8002) and exercise the
   core loop (guest → pack → submit → leaderboard).

Acceptance criteria:
- [ ] Row counts identical for all 13 tables (script output recorded).
- [ ] Smoke test (`smoke-auth.mjs`) passes against the Postgres-backed API.
- [ ] `/health` returns `{"status":"ok","service":"kwizbox"}`.
- [ ] Rollback possible: SQLite file untouched + backup exists.

## M2 — Backend deployment (Fly.io)

Tasks: set `DATABASE_URL` + `JWT_SECRET` as Fly secrets; deploy via existing
Dockerfile/workflow; set `ALLOWED_ORIGINS`; verify public `/health`; smoke test
from the public URL; record the backend URL in env files.

Acceptance criteria:
- [ ] `https://<fly-app>.fly.dev/health` returns 200 from the public internet.
- [ ] Rate limits + security headers verified on the public URL.
- [ ] Secrets only in Fly/GitHub secret stores — gitleaks clean.

## M3 — Android APK rebuild

Tasks: set `VITE_API_URL` to the public backend; rebuild debug + release;
emulator sanity check (Android 11 AVD, TCG); sign release build.

Acceptance criteria:
- [ ] Guest → quiz → submit works in the rebuilt APK against the public backend.
- [ ] Release artifact signed and archived (with keystore backed up safely).

## M4 — Play Store submission

Tasks: developer account ($25, identity verification); listing assets
(screenshots exist: `~/Desktop/KwizBox` slide PNGs); privacy policy linked;
upload signed AAB/APK.

Acceptance criteria:
- [ ] Listing submitted and review status recorded in PROJECT_STATUS.
- [ ] Policy pages reachable from the listing and the app.

## M5 — Post-release stabilization

Hardening remainder (REMEDIATION_PLAN P1/P2), question bank growth via reviewed
PRs, backup automation for the production DB, then reopen the "Later" queue
(offline packs, push, multi-language, analytics) — each via the scope-change
rule.
