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

## 2026-11-10 — BUG-007 history purge (owner-approved "remove password from public")

| Check | Command / method | Result |
|---|---|---|
| Full-history sensitive-path scan (pre-flight) | `git log --all --name-only` filtered for db/bak/env + large-blob listing | found 5 sensitive paths, not 1: the known Aug backup, `_backup/backend/trivia.db` (user + 4 admin hashes, 1,701 audit rows), a `_backup/` duplicate of the Aug backup, `backend_deploy.tar.gz` (50 MB), root `trivia.db` (empty) |
| Tarball content inspection | `git cat-file blob` → `tar tzf` / extract | tarball contains `backend/.env` with `JWT_SECRET` **byte-identical to the live secret** (md5 match) + a copy of the Aug DB backup; committed 2026-10-08 — gitleaks never saw it (compressed binary) |
| Other env files in history | `git cat-file blob` on every `.env*` blob | all templates or `VITE_API_URL`-only (public URLs); no other secrets |
| Secret-in-text check | `git grep <JWT value> $(git rev-list --all)` | no matches — the secret existed only inside the tarball |
| Safety bundle | `git bundle create … --all` + `git bundle verify` + md5 | complete history, 85 MB, md5 `7f9f31d5e242430fe10f0f6479f553cd` (off-repo) |
| History rewrite | `git filter-repo v2.47.0 --sensitive-data-removal --replace-refs delete-no-add --invert-paths --path ×5` | completed; 63 commits preserved; 6 branches rewritten (gh-pages kept its SHA — clean lineage) |
| Local post-purge verification | `git log --all --oneline -- <5 paths>`; `git cat-file -e <3 blobs>` | all empty / all blobs unreachable; live `trivia.db` + `backend/.env` untouched on disk |
| Force-push (approved) | `git push origin --force --all` | all 5 rewritten branches landed (`main` `d0dd420`→`5d906a1`, feature/question-types-tf-image→`2d7fd7b`, flyio-new-files→`d29729a`, manus/…→`d23a339`, mascot…→`1d61b55`; gh-pages no-op) |
| GitHub-side verification | API `commits?path=backend/trivia.db.bak_20260819_081244` | **0 commits** touch the purged path |
| JWT rotation | new 256-bit hex in gitignored `backend/.env` (temp copy removed) | old secret (public ~1 month) now invalid; format validated; `git status` confirms .env untracked |
| Residue check | raw.githubusercontent at old SHAs + API commit lookups | `refs/pull/2/head` clean (404 on purged paths); **`refs/pull/1/head` still pins old lineage — DB backup + tarball downloadable at `8c0dd77` (HTTP 200)** → GitHub Support request pending (owner) |

> Also this session: Fly Deploy workflow deleted (owner: "delete the
> deployment not working") — the file never worked (FLY_API_TOKEN never
> configured; nothing ever deployed) and hosting is deferred. Deployment
> configs (`Dockerfile`, `fly.toml`) kept for M2.

## 2026-11-10 — Admin password reset + host-platform teardown (owner directives)

| Check | Command / method | Result |
|---|---|---|
| Compromise confirmation (live vs leaked) | direct hash comparison live DB vs both leaked DB blobs (extracted from the pre-purge bundle) | ALL 4 live admin hashes (`admin`, `mod1`, `qm1`, `Pblack`) **identical to the leaked initial-commit DB**; `mod1`/`qm1` also identical to the Aug backup → all 4 compromised |
| Pre-reset backup (mandatory) | `cp trivia.db trivia.db.bak_20261110_114608_pre_admin_reset` + `md5sum` | identical `07ae3e4669ab1d7b808f88d83c1e9a22` (pre-reset state preserved; gitignored) |
| Password reset | sqlite UPDATE via python + system bcrypt **4.0.1** (the pinned version), rounds=12 | 4 accounts reset to one new strong password; `bcrypt.checkpw` verified against the on-disk DB for all 4 |
| Credentials stored off-repo | `/media/stephen/FILES/KwizBox-admin-credentials-20261110.txt` | written (not committed; DB itself is gitignored) |
| Stale Fly deployment discovered | `curl https://kwizbox-still-bush-3080.fly.dev/health` | **200 — a live KwizBox backend was still running**, deployed 2026-11-04 (pre-relocation code, pre-rotation JWT secret → forgeable tokens); no volumes (no data at risk) |
| Fly app destroyed (owner: "delete the host platforms not working") | `flyctl apps destroy kwizbox-still-bush-3080 --yes` (flyctl authenticated as owner) | "Destroyed app kwizbox-still-bush-3080"; URL now dead (curl 000). A suspended `fly-builder-*` app remains (harmless Fly infrastructure) |
| Host-platform artifacts removed from repo | `git rm` (76 files) | `fly.toml`, root `Dockerfile`, `backend/Dockerfile`, `.dockerignore`, `railway.toml`, root `.htaccess`, `_backup/php-backend/` (dead InfinityFree/PHP platform — its domain no longer resolves), `_backup/vercel.json`, `frontend/.env.production.bak_kwizbox`, `frontend/.env.production.lan_bak` |
| Dead-platform URL checks | curl | infinityfree.io: 000 (dead); fly.dev: destroyed (was 200) |
| Host-platform remote branches deleted | `git push origin --delete gh-pages flyio-new-files` | both deleted (local copies retained; gh-pages served a stale pre-rename "KwizBoz" build via GitHub Pages) |
| Docs synced to removal | DEPLOYMENT_GUIDE, brain.md, CLAUDE.md updated | no doc still claims Fly/Railway configs exist |

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

## 2026-11-11 — Environment repair, concurrent-agent audit, early e2e findings

| Check | Command | Result |
|---|---|---|
| Dev env rebuilt (after concurrent agent deleted venv/node_modules) | `backend/venv/bin/pip install -r requirements.txt` | OK — fastapi 0.115.0, **bcrypt 4.0.1 pin honored** |
| Backend started | `ADMIN_PASSWORD=<throwaway> ./venv/bin/python -m uvicorn src.main:app --host 0.0.0.0 --port 8001` | UP on 8001; `/health` → `{"status":"ok","service":"KwizBox"}` (docs record `"kwizbox"` — case mismatch, cosmetic) |
| DB backup before e2e | `cp trivia.db → trivia.db.bak_20261111_091514_pre_e2e`; md5 | md5 `c22ca0788cae366550f7ab3fbbb54952` (matches live DB; 3,489,792 bytes; 7,890 questions, 4 admin accounts verified present) |
| Backend pytest | `ADMIN_PASSWORD=<throwaway> ./venv/bin/python -m pytest tests/ -q` | **4/4 FAILED** — `/quiz/pack` and `/quiz/submit` return **401 "Not authenticated"** to cookie-less callers (live curl confirms submit 401); one response-shape mismatch (`KeyError: 'correct'`); tests also need `pytest`+`httpx` installed manually (absent from requirements.txt). Probable link to the 2026-11-10 guest-form submit bug → BUG-009. Full e2e paused at owner request |
| Concurrent agent (Hermes) audit | `~/.hermes/logs/process-results/*.json`, `git status`, `stat` | Purge 08:52–08:57 (284 tracked files in 4 batches: venv/node_modules/DB backups → `_backup models scripts` → root docs → `.agents .hermes .vite`); **re-executed 09:01–09:21 after restore**; deleted both DB safety backups + untracked `INITIALIZATION_REPORT.md` + 5 `frontend/debug-*.mjs`; broke host system-Python fastapi (user-site files stamped 09:09:23). Working tree restored to `89cbee7` **twice** via `git restore .` (all 281–284 tracked deletions recovered; nothing committed by it) |
| System Python integrity | `/usr/bin/python3 -c "import fastapi"` | **BROKEN** — `ImportError: cannot import name 'PYDANTIC_V2'` from `~/.local/lib/python3.12/site-packages` (BUG-008). Repo venv unaffected. |
| Protected-files verification | `for f in README.md AGENTS.md … scripts/questions.json models/README.md _backup/preview …` | All OK after second restore |
