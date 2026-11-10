# CHANGELOG.md

All notable changes to KwizBox are documented here, newest first.
Format based on [Keep a Changelog](https://keepachangelog.com/); the project
does not use semantic versioning yet (pre-1.0, unreleased).

> History before 2026-11-10 lives in the Git history (`git log`) and the
> append-only `project-log.md`. This changelog starts at project
> professionalization (relocation to the FILES drive + governance system).

## [Unreleased]

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
- Residue: `refs/pull/1/head` still pins old commits on GitHub — support
  request drafted in SESSION_HANDOFF.md (owner action).
- Follow-up: reset the 4 admin-account passwords in the live DB (hashes were
  public in the purged DBs).

**Removed**
- `.github/workflows/fly-deploy.yml` (owner: "delete the deployment not
  working") — its only ever run failed at 14s (`FLY_API_TOKEN` never
  configured; nothing was ever deployed) and hosting work is deferred.
  Deployment configs (`Dockerfile`, `fly.toml`) are kept for M2; the
  workflow remains recoverable from git history.

**Changed (deploy gating)**
- ~~`fly-deploy.yml`: deploy-on-push disabled; workflow is manual-only~~
  (superseded the same day by full removal — see Removed above).

**Notes**
- `backend/trivia.db`, `backend/.env`, `frontend/.env` were copied outside Git
  (gitignored by design — live data / secrets) and verified by checksum.
- Nothing was deleted; the old project location remains as a frozen snapshot.
- Push history: 9 commits fast-forward `9077758..e0366a9` (authorized), then
  `b2dd269` + `a3a32b2` (CI repair + deploy gate), then the 2026-11-10
  owner-approved history rewrite (force-push of all branches — the only
  force-push ever used) and subsequent normal pushes.
- **Commit SHAs:** every SHA quoted in pre-2026-11-10-purge documents refers
  to the pre-rewrite history; the old→new map is kept locally
  (`.git/filter-repo/commit-map`) and in the off-repo safety bundle.
