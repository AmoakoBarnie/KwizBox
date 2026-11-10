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

## 2026-11-10 — PR #2 review, merge, and question import

| Check | Command | Result |
|---|---|---|
| PR branch structural QA (180 questions) | `python3` analysis of extracted branch JSON | 180/180 valid: answer letters match `answer_index`, 4 distinct options, explanations present, classes B4–B9, subjects Math/Science/Computing |
| Intra-batch duplicates | normalized-text comparison | 0 duplicates |
| Cross-DB duplicates (vs live bank) | normalized text vs all DB questions | 0 of 180 already present (bank was 7,710) |
| Content sample review | 12 random questions read | all correct & curriculum-aligned; explanations match answers; Ghanaian context present |
| Merge PR #2 | `git merge --no-ff origin/manus/add-180-questions-546-725` | clean 'ort' merge (commit `40e155d`), 3,241 insertions in `scripts/questions.json`, no conflicts |
| Pre-import backup (mandatory) | `cp trivia.db trivia.db.bak_20261110_110311_pre_pr2` + `md5sum` | identical hashes `510732c34ee9893b65723a218d121bb9` |
| Import into live DB | `python3 scripts/import_pr2_180.py` | before 7,710 → added 180, skipped 0 → after **7,890**; all 180 verified present; distribution B4–B9 ×30, Math/Science/Computing ×60 |
| Post-import spot-check | direct row query (id 36948846) | options mapped in order, `answer_index` 0 = "7,402" ✓, explanation intact, `is_active`=1, `question_type`='mcq' |
| New bank totals | DB queries | **7,890 questions** — mcq 7,816 + image_mcq 74; Math 3,395 · Science 1,415 · Computing 724; B4 559 · B5 586 · B6 595 · B7 900 · B8 574 · B9 644 |

> Note: app-level tests (backend serving the new questions) were **not** run —
> no runtime environment exists yet (M1 deferred by owner). DB-level
> verification only. Run `smoke-auth.mjs` + a quiz-pack spot check when M1
> environment setup is authorized.

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
