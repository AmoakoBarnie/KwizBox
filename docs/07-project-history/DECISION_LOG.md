# DECISION_LOG.md

> Part of `docs/07-project-history/`. Central index of Architecture Decision
> Records. Significant decisions get an ADR file in `decisions/`; trivial
> ones don't get an entry at all. Never silently replace an accepted decision —
> supersede it with a new ADR and update the status here.

| ADR | Title | Date | Status |
|---|---|---|---|
| [ADR-001](decisions/ADR-001-reuse-existing-codebase.md) | Adopt and relocate the existing KwizBox codebase (no greenfield rebuild) | 2026-11-10 | Accepted |
| [ADR-002](decisions/ADR-002-repository-location-ntfs.md) | Working repository on the NTFS FILES drive | 2026-11-10 | Accepted |
| [ADR-003](decisions/ADR-003-github-canonical-remote.md) | GitHub `AmoakoBarnie/KwizBox` as the canonical remote | 2026-11-10 | Accepted |
| [ADR-004](decisions/ADR-004-postgres-supabase-migration.md) | Migrate SQLite to Postgres on Supabase | 2026-11-10 | Rejected by owner 2026-11-11 |
| [ADR-005](decisions/ADR-005-governance-system.md) | Adopt the professional governance/documentation system | 2026-11-10 | Accepted |
| [ADR-006](decisions/ADR-006-fly-machines-sqlite-deployment.md) | Deploy on Fly Machines with SQLite on a persistent volume | 2026-11-14 | Accepted |

## Pre-existing implicit decisions (recorded for traceability; predates ADRs)

These were made by the project owner before 2026-11-10 and remain in force:

| Decision | Evidence |
|---|---|
| React + Vite PWA frontend | `frontend/package.json` |
| Capacitor for Android (not React Native) | `frontend/android/` |
| FastAPI + SQLAlchemy backend | `backend/requirements.txt` |
| JWT auth with guest mode; guests excluded from leaderboards | `auth.py`, code + CLAUDE.md conventions |
| Answer key never leaks in `/quiz/pack` | `QuestionOut` schema |
| NaCCA curriculum tagging (class → subject → strand → topic) | DB schema |
| bcrypt pinned 4.0.1 | `requirements.txt` (environmental constraint) |

## Rule

A new ADR is required for: technology additions/removals/replacements, data
model changes of intent, security posture changes, deployment topology
changes, and anything hard to reverse. See `AGENTS.md` §4.
