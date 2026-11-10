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

**Changed**
- `README.md`: added the project organization map; corrected stale facts
  (question bank is 7,710, not 3,230; run paths now point at the new repo home).
- `docs/README.md` marked as a historical artifact (describes the 200-question
  MVP era).

**Fixed (repository)**
- Local `main` was mis-tracking `origin/mascot-3d-and-models`; now correctly
  tracks `origin/main`.

**Notes**
- `backend/trivia.db`, `backend/.env`, `frontend/.env` were copied outside Git
  (gitignored by design — live data / secrets) and verified by checksum.
- Nothing was deleted; the old project location remains as a frozen snapshot.
