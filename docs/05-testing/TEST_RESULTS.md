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

## 2026-11-10 — First GitHub push, first CI run, CI repair

| Check | Command / method | Result |
|---|---|---|
| Push 9 local commits to GitHub | `git push origin main` (after pre-flight: ahead 9 / behind 0, no `.env`/DB files in diff) | fast-forward `9077758..e0366a9`; local `main` = `origin/main` |
| PR #2 state on GitHub | PR page check | auto-marked **Merged** (closed) once `40e155d` landed — no manual close needed |
| CI run #1 (first-ever run of `ci.yml`) | Actions run `42805071620` on `e0366a9` | **failure** — `frontend` ✅ build; `secret-scan` ❌ at "Install gitleaks" (0s); `smoke` ❌ at "Start backend" (~41s health-poll timeout) |
| gitleaks asset name | GitHub release API for v8.18.0 | no `linux_amd64` asset exists → download 404; actual asset is `linux_x64` |
| smoke root cause | code read: `seed_admin.py` + `ci.yml` env block | `seed_super_admin()` calls `sys.exit(1)` when `ADMIN_PASSWORD` unset; job set only `DATABASE_URL` + `JWT_SECRET` → backend exited at startup, health poll exhausted its 40×1s |
| Local gitleaks full-history scan | `/tmp/opencode/gitleaks detect --source . -v` (binary sha256 `6e19050a…` verified against official checksums; v8.18.0) | **52 commits scanned, no leaks found**, exit 0 — pushed history contains no gitleaks-detectable secrets |
| Shallow-checkout scan coverage | depth-1 clone + same gitleaks command | only **1 commit** scanned → CI checkout needs `fetch-depth: 0` (added) or the gate covers just the latest commit |
| Fly Deploy run #1 (first-ever run) | Actions run `42805071750` | failed after 14s — `FLY_API_TOKEN` repo secret never configured; **nothing was deployed** (failed at auth, pre-deploy) |
| Workflow YAML validity after edits | `python3 -c "yaml.safe_load(…)"` | both `ci.yml` and `fly-deploy.yml` valid |
| CI run #2 (fix commits `b2dd269` + `a3a32b2`) | Actions run `42805908080` | **success** in 32s — all 3 jobs green: frontend build ✅; smoke ✅ (backend started with throwaway `ADMIN_PASSWORD`, all smoke checks passed); secret-scan ✅ (gitleaks installed + full scan clean) |
| Fly Deploy gate effective | Actions API: runs of `fly-deploy.yml` | push of `a3a32b2` triggered **no** deploy run (workflow is now manual-only, `workflow_dispatch`) |

> Fixes shipped as `b2dd269` (ci.yml: `linux_x64` asset name, `fetch-depth: 0`,
> throwaway `ADMIN_PASSWORD` for the smoke job) and `a3a32b2` (fly-deploy.yml
> gated to `workflow_dispatch` — hosting deferred by owner). Both CI failures
> were **latent workflow bugs, not regressions from the PR #2 merge**: these
> workflows had never run before this push, and nothing reads
> `scripts/questions.json` at backend startup (verified by code read).

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
