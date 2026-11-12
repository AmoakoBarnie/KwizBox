# CHANGELOG.md

All notable changes to KwizBox are documented here, newest first.
Format based on [Keep a Changelog](https://keepachangelog.com/); the project
does not use semantic versioning yet (pre-1.0, unreleased).

> History before 2026-11-10 lives in the Git history (`git log`) and the
> append-only `project-log.md`. This changelog starts at project
> professionalization (relocation to the FILES drive + governance system).

## [Unreleased]

### 2026-11-11 → 2026-11-12 — Engagement upgrades (Groups A & B) + full end-to-end pass

**Added**
- Friend-challenge flow repaired end to end (BUG-010/011): join fetches the
  deterministic question pack, Quiz plays it and submits server-authoritative
  scores, refresh recovery via `?challenge=CODE`, duplicate-submit guard, and
  challenges now flip to `completed` (explicit `db.flush()`).
- Progress payload now includes XP level (`backend/src/xp.py`, 10 levels),
  weekly league (Bronze→Diamond), 56-day activity calendar, weekly/monthly
  points, and lifetime best streak; quiz submit returns `best_streak`,
  `daily_streak`, `lifetime_score`.
- Profile: XP level bar, league chip, streak heat-map; avatar save fixed
  (explicit next-value PATCH) and new engagement badges (streak/day-streak,
  daily player, level 5/10).
- Leaderboard: fifth **Schools** tab — monthly points aggregated per
  `school_code` with top player and player count (`GET /quiz/leaderboard/schools`).
- Summary: server-computed Best-streak card + day-streak chip.
- Browser e2e suites: `e2e-engagement.mjs` (new), refreshed `e2e-register.mjs`
  / `e2e-guest.mjs` (cookie auth), env-driven admin credentials in
  `full-e2e.mjs`, and the matching Playwright headless-shell build.

**Fixed**
- BUG-009: anonymous `/quiz/pack`, `/quiz/check`, `/quiz/submit`, and challenge
  compare no longer 401 — `optional_user` returns `None` when no session exists.
- BUG-012: Playwright/browser version mismatch unblocked.
- BUG-013: Profile crashed with “Rendered more hooks than during the previous
  render” — avatar state hooks now sit above the `!user` early return.
- Dev API calls use the same-origin Vite proxy (`VITE_API_URL=` empty) so the
  HttpOnly `Secure` session cookie is first-party and actually stored.

**Verified** — see `docs/05-testing/TEST_RESULTS.md` (2026-11-12): backend
pytest 4/4, production build OK, route smoke 13/13, UI register 15/15, guest
5/5, engagement 18/18, API e2e 37/37.

### 2026-11-10 — Project professionalization & relocation

**Added**
- Professional project home at `/media/stephen/FILES/My Projects/KwizBox`
  (full Git history migrated from `~/Desktop/KwizBoz Andriod`).
- Governance & documentation system: `AGENTS.md`, `PROJECT_STATUS.md`,
  `SESSION_HANDOFF.md`, `CONTRIBUTING.md`, `frontend/.env.example`, and the
  `docs/01`–`docs/07` documentation tree including Architecture Decision
  Records (ADR-001 … ADR-005) and a traceability matrix.
- Pre-relocation loose work captured in commit `cf1d9be`: Fly.io deploy
  workflow (`.github/workflows/fly-deploy.yml`), Dockerfile tweak,
  `frontend/.env.production` pointing at the Fly backend, promo/mascot test
  scripts (`promo-shots.mjs`, `record-mascots.mjs`).
- **PR #2 merged locally** (`40e155d`): 180 reviewed questions for B4–B9
  added to `scripts/questions.json` (Math/Science/Computing × 60; Easy 54 /
  Medium 90 / Hard 36).
- **Live question bank grew 7,710 → 7,890**: the 180 questions imported into
  `backend/trivia.db` via new `scripts/import_pr2_180.py` (idempotent,
  normalized-text duplicate guard; pre-import backup taken, md5 recorded).
- Privacy remediation plan of record for BUG-007 (tracked legacy DB backup
  on public GitHub): full history purge + credential rotation — documented
  in `docs/02-architecture/SECURITY_ARCHITECTURE.md`, execution deferred
  until push authorization.

**Changed**
- `README.md`: added the project organization map; corrected stale facts
  (question bank is 7,890 after PR #2, not 3,230; run paths now point at the
  new repo home).
- `docs/README.md` marked as a historical artifact (describes the 200-question
  MVP era).
- `.gitignore`: excludes `backend/trivia.db.bak_*` (prevents accidental
  commits of live-data snapshots — see BUG-007).
- Question counts synchronized across `brain.md`, `CLAUDE.md`,
  `docs/` (database schema, requirements, traceability) to the verified
  post-import values.

**Fixed (repository)**
- Local `main` was mis-tracking `origin/mascot-3d-and-models`; now correctly
  tracks `origin/main`.

**Fixed (CI) — 2026-11-10, after the first-ever CI run failed**
- `ci.yml` secret-scan: gitleaks 8.18.0 download URL requested a nonexistent
  `linux_amd64` release asset (404). Corrected to `linux_x64`.
- `ci.yml` secret-scan: checkout upgraded to `fetch-depth: 0` — the default
  shallow clone would have limited gitleaks to the latest commit instead of
  the full history (verified: depth-1 scans 1 of 52 commits).
- `ci.yml` smoke: the backend exited at startup because the job set no
  `ADMIN_PASSWORD` and `seed_super_admin()` refuses to run without it. The
  job now sets a throwaway value (the smoke test only asserts `/admin/token`
  rejects bad credentials; no real credential is used).
- Result: CI run #2 fully green (frontend build + backend smoke + gitleaks).

**Security — 2026-11-10: sensitive history purge (BUG-007, owner-approved)**
- **Executed** the Option C history rewrite with `git-filter-repo` after a
  pre-flight scan expanded the scope from 1 to **5 paths**: the documented
  Aug DB backup, two additional DB copies under `_backup/`, and
  `backend_deploy.tar.gz` (50 MB) which contained a `backend/.env`
  **byte-identical to the live one** — the live `JWT_SECRET` had been public
  since ~2026-10-08, invisible to gitleaks inside the compressed archive.
- All 6 branches rewritten and force-pushed (gh-pages kept its SHA — clean
  lineage). Verified: 0 commits touch any purged path (local + GitHub API);
  63 commits preserved; safety bundle kept off-repo (md5-verified).
- **`JWT_SECRET` rotated** in the live gitignored `backend/.env` (old value
  invalidates any forged tokens; backend not deployed, so no user impact).
- Residue: `refs/pull/1/head` still pins old commits on GitHub — paste-ready
  support request written off-repo for the owner to submit
  (`/media/stephen/FILES/GitHub-support-request-20261110.md`).
- **All 4 admin passwords reset** (follow-up executed the same day): the
  live admin hashes were verified byte-identical to the leaked DBs, backed
  up, and reset with bcrypt 4.0.1 (rounds 12); credentials stored off-repo.
- **Stale live deployment destroyed**: the Fly app `kwizbox-still-bush-3080`
  (deployed 2026-11-04, running pre-relocation code with the leaked JWT
  secret) was found still live and destroyed via flyctl — no volumes, no
  data lost.

**Decisions — 2026-11-10 (owner-confirmed 2026-11-11): owner advanced the project**
- **M1 (Postgres migration) — REJECTED**: no Postgres migration planned;
  the app stays on SQLite.
- **M2 (hosting/deployment) — REJECTED**: no hosting deployment planned
  (workflow + configs removed; recoverable from git history).
- **Release scope — APPROVED**: public web app + Android (Capacitor) +
  Play Store remain in scope; M3, M4, M5 continue.

**Removed — 2026-11-10: host platforms (owner: "delete the host platforms not working")**
- `.github/workflows/fly-deploy.yml` — its only ever run failed at 14s
  (`FLY_API_TOKEN` never configured; nothing was ever deployed).
- **76 host-platform files** (all recoverable from git history): `fly.toml`,
  root `Dockerfile`, `backend/Dockerfile`, `.dockerignore`, `railway.toml`,
  root `.htaccess`, `_backup/php-backend/` (the dead InfinityFree platform —
  its domain no longer resolves), `_backup/vercel.json`,
  `frontend/.env.production.bak_kwizbox`, `frontend/.env.production.lan_bak`.
- Remote branches `gh-pages` (served a stale pre-rename build via GitHub
  Pages) and `flyio-new-files` deleted; local copies retained.

**Changed (deploy gating)**
- ~~`fly-deploy.yml`: deploy-on-push disabled; workflow is manual-only~~
  (superseded the same day by full removal — see Removed above).

**Fixed (dev) — 2026-11-10, second working session**
- `backend/src/main.py`: CORS now allows the Vite dev origins
  (`http://localhost:5173`, `http://localhost:5174`) so the locally served
  frontend can call the API during development.
- `frontend/tests/e2e-guest.mjs`: re-query the guest-form selects after the
  form renders (the old script held a stale locator, breaking option
  selection).
- Dev environment rebuilt in the new repo home (`backend/venv`,
  `frontend/node_modules`).

**Notes**
- `backend/trivia.db`, `backend/.env`, `frontend/.env` were copied outside Git
  (gitignored by design — live data / secrets) and verified by checksum.
- The old project location remains as a frozen snapshot (nothing was deleted
  from it; it contains PRE-PURGE history — keep private). The 2026-11-10
  teardown removed only non-working host platforms: repo files are
  recoverable from git history, and the stale Fly app was destroyed with no
  data loss (no volumes).
- Push history: 9 commits fast-forward `9077758..e0366a9` (authorized), then
  `b2dd269` + `a3a32b2` (CI repair + deploy gate), then the 2026-11-10
  owner-approved history rewrite (force-push of all branches — the only
  force-push ever used) and subsequent normal pushes.
- **Commit SHAs:** every SHA quoted in pre-2026-11-10-purge documents refers
  to the pre-rewrite history; the old→new map is kept locally
  (`.git/filter-repo/commit-map`) and in the off-repo safety bundle.
