# TEST_RESULTS.md

> Part of `docs/05-testing/`. **Evidence log** — commands run, date, actual
> outcome. Never record an expectation as a result. Append only.

## 2026-11-10 — Initialization session

*No application tests were run this session* — the runtime environment
(`backend/venv`, `frontend/node_modules`) was deliberately not carried to the
new repository home (regenerate per ENVIRONMENT_SETUP.md before first run).
The session's verifications were repository-level:

| Check | Command | Result |
|---|---|---|
| Local vs GitHub divergence | `git fetch origin && git log origin/main..main` | local ahead 4, behind 0 (pre-migration) |
| Repo clone integrity | `git clone` (608 files) | success, working tree clean |
| Question bank copy integrity | `md5sum` both copies | identical: `510732c34ee9893b65723a218d121bb9` |
| Branch tracking fix | `git branch --set-upstream-to=origin/main main` | success |
| NTFS symlink risk | `find . -type l` | none found |
| DB facts for docs | `python3 -c "import sqlite3 …"` | 7,710 questions; 38 users; 141 sessions; 16 subjects; 12 class levels; 13 model classes in `models.py` |
| Loose work capture | `git add … && git commit` | `cf1d9be`, 5 files, tree clean |

## Historical results (from git/brain.md evidence — not re-run today)

| Claim | Evidence | Date |
|---|---|---|
| Full E2E flow (guest → quiz → submit → leaderboard) verified | commit `59cae97` "Add full-app end-to-end smoke test" + roadmap Done | 2026 (pre-relocation) |
| Mascot locomotion: traverse span, facing flips, bob amplitude measured | `measure-locomotion.mjs` (asserts in script) | 2026 |
| Reduced-motion: mascots hold still | `verify-reduced-motion.mjs` | 2026 |
| SQLite→Postgres migration script proven (9,276 rows, 3 bugs fixed) | roadmap Done + `migrate_sqlite_to_pg.py` | 2026 |
| Emulator full guest→quiz→submit flow (Android 11, TCG) | roadmap Done | 2026 |
| CI green with smoke + gitleaks | `.github/workflows/ci.yml` (verify last run on GitHub before relying on it) | — |

> **Rule for future sessions:** every test run gets a row here with the exact
> command, the date, and the real outcome (including failures). Screenshots/
> logs for release milestones may be committed under `docs/05-testing/artifacts/`.
