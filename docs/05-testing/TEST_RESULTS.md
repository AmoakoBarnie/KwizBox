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

## 2026-11-11 — Engagement upgrade session (owner approved all 6): Group A challenge-flow fix

Context: owner approved all six engagement upgrades. Pre-flight DB backup taken before any
backend change (md5 verified). Playwright browser still unavailable (version mismatch —
BUG-012), so verification = live-server curl chains + `npm run build` + synthetic unit checks.

| Check | Command | Result |
|---|---|---|
| DB backup before engagement work | `cp backend/trivia.db backend/trivia.db.bak_20261111_115214_pre_engagement`; `md5sum` both | md5 `445abb45c02fbf8b511ff6971efddf5b` — **matches live DB** (3,489,792 bytes) |
| Frontend production build (all Group A client edits) | `npm run build` (frontend/) | **OK** — 1058 modules, built in 19.77 s (pre-existing >500 kB chunk warning, unchanged) |
| Backend imports with Group A edits | `venv/bin/python -c "import src.main"` | OK |
| Challenge chain e2e — pack determinism | curl: `POST /auth/register` ×2 users, `POST /quiz/challenge/create` (B4/Science → code `73MSSD`), `GET /quiz/challenge/{code}/questions` as both users | Both players get the **same 12 question IDs in the same order**; no `answer_index` leak in payload; 12 questions returned |
| Challenge chain e2e — server-authoritative grading + duplicate guard | curl: `/quiz/check` per question (client flow), `POST /quiz/challenge/73MSSD/submit` ×2 players, resubmit | B: 12/12 correct → **150 pts** (session 480); A: 7/12 → **95 pts** (session 481); second submit by same player → **HTTP 409**; `GET /compare` ranks both (150 > 95) |
| Challenge completion flip (autoflush bug fix) | curl chain on fresh code `746MAV` after `db.flush()` fix; DB inspected via `python3 -c "import sqlite3 …"` | Before fix: 2 players completed but `challenges.status` stayed `open` (pending `existing_cs.status` invisible to the count query — `autoflush=False`). After fix: second submit flips status → **`completed`** in DB and `/compare` |
| Challenge T/F option packing | synthetic `Question(question_type='true_false', option_c='', option_d='')` through `q_to_public_dict` | `['True','False']` (2 options) — matches `/quiz/pack` packing; mcq → 4 options. Live DB has 0 T/F rows (BUG-004), so verified synthetically |
| Backend pytest regression check | `git stash` → `pytest tests/ -q` → `git stash pop` | **4 errors both with and without my changes** (TestClient lifespan `CancelledError`, environment-level) — pre-existing, not caused by Group A. `pytest`+`httpx` were installed into the venv for this check only (requirements.txt untouched) |
| System Python (BUG-008 recheck) | `/usr/bin/python3 -c "import fastapi, pydantic"` | **OK now** — fastapi 0.162.4 / pydantic 2.9.2 imports clean (the broken user-site install was repaired by the concurrent session; BUG-008 marked Resolved) |
| Test-users cleanup | admin status endpoint | Two `e2e-chal-a/b-*` users + 4 quiz sessions (480–483) left in dev DB — dev-only data, harmless; delete via admin users screen if the owner wants them gone |

## 2026-11-12 — Full end-to-end test pass (owner request: "test the app end to end")

Context: Group B (XP/levels/leagues, streak calendar, school leaderboard, avatar fix) was
code-complete but unverified in a browser. Playwright was unblocked by installing the
matching headless-shell build. Dev API access moved to the **same-origin Vite proxy**
(`VITE_API_URL=` empty) because Chrome drops the cross-site `Secure` cookie between
`localhost:5174` and `127.0.0.1:8001` — the app appeared to register but had no session.

| Check | Command | Result |
|---|---|---|
| Backend test suite | `backend/venv/bin/python -m pytest tests/ -q` | **4 passed** (5 warnings) — BUG-009 regression coverage now green |
| Frontend production build | `npm run build` (frontend/) | **OK**, 1,371.13 kB JS / 38.91 kB CSS (pre-existing >500 kB chunk warning only) |
| Route smoke — all pages render, no fatal errors | `node tests/route-smoke.mjs http://localhost:5174` | **13/13 routes** (landing, chooser, play, challenge, quiz, summary, leaderboard, profile, settings, admin, 3 policy pages) |
| UI journey — register → play → summary | `node tests/e2e-register.mjs http://localhost:5174` | **15/15 PASS** — sign-up with class/age/sex, `/auth/me` cookie session, 9 questions answered, summary rendered |
| UI journey — guest | `node tests/e2e-guest.mjs http://localhost:5174` | **5/5 PASS** — guest session, age/gender persisted, `is_guest` |
| UI journey — engagement surfaces | `node tests/e2e-engagement.mjs http://localhost:5174` | **18/18 PASS** — Best-streak card + day-streak chip; Profile XP bar (`20 / 100 pts → Level 2`), Bronze league chip, 56-cell streak calendar with today lit; new badges listed; avatar PATCH 200 + persisted `skin=deep` + selected after reload; 5 leaderboard tabs; Schools board rows; **0 page errors** |
| API end-to-end | `KWIZBOX_ADMIN_USERNAME=Pblack KWIZBOX_ADMIN_PASSWORD=… node tests/full-e2e.mjs` | **37/37 PASS** — register/login cookies (HttpOnly/Secure/SameSite=Strict), `/auth/me`, guest, anonymous 401 guard, 7 security headers, register rate-limit 429, quiz pack/check, admin token (good + bad creds), full challenge create→questions→submit→compare |
| Dev-cookie origin fix | `curl -X POST http://localhost:5174/auth/register` | 200 through the Vite proxy with `Set-Cookie: kwizbox_access=…; HttpOnly; SameSite=strict; Secure` — session stored first-party, browser `/auth/me` 200 |
| New bug found during the pass | Playwright page-error capture | **BUG-013**: `/profile` crashed with *"Rendered more hooks than during the previous render"* — `useState` calls sat below the `if (!user) return` early exit. Fixed by hoisting avatar state above the return and syncing it from `user.avatar`; re-ran the engagement suite 18/18 |
| Suite re-run after the fix | route-smoke + all 4 UI/API suites + build + pytest | All green as recorded above |

Notes:
- Admin credentials are no longer hardcoded in `full-e2e.mjs`; supply `KWIZBOX_ADMIN_USERNAME` / `KWIZBOX_ADMIN_PASSWORD`. The dev DB's `admin` account has an older local password, so the run used the `Pblack` super-admin account from the 2026-11-10 reset.
- Rate-limited suites need a ~60 s quiet window before re-running (register 10/min, admin token 5/min).
- Test users created this session: `e2e_mwdo…`, `e2e_eng_…`, `dbg…`, `proxytest_…` in the dev DB (harmless; dev-only).

## 2026-11-12 — Engagement Group C: mascot animation/style/gender + PNG share card

Context: the GLB clips were inspected directly before coding — the exports name
clips `idle_youth_Mascot_Rig`, `celebrate_shs_Mascot_Rig`, … while only `walk`
is bare — confirming why every non-walking 3D mascot T-posed (BUG-015).

| Check | Command | Result |
|---|---|---|
| Clip-name resolver unit checks | `node tests/verify-mascot-clips.mjs` | **9/9 PASS** — exact `walk`, suffix `idle`/`celebrate`/`encourage`, `Armature|idle` style, case-insensitivity, null/empty safety |
| GLB clip inventory | GLB JSON-chunk parse | `walk`; `idle_*_Mascot_Rig`; `celebrate_*`; `encourage_*`; `blink_*` in all four models (youth/shs × male/female) |
| Group C browser e2e | `node tests/e2e-mascot-share.mjs http://localhost:5174` | **18/18 PASS** — 3D resolves `idle_youth_Mascot_Rig`; 2D toggle unmounts canvases, persists `kwiz_mascot_style=2d` across reload; back to 3D; gender PATCH 200 + server `female` + reload uses `data-model="female"`; Summary walking clip = `walk`; **Save PNG** downloads `kwizbox-<nick>-2026-11-12.png`, 658,479 bytes, signature PNG, **1080×1350**; **Share Image** falls back to download where File Share is unsupported; 0 page errors |
| Summary refresh fallback (new bug BUG-014) | browser repro + rerun | Seeded `kwizbox_last_result` then opened `/summary`: previously rendered “No results to show.” because the component called `setTriedStorage()` during render (tree discarded) and its effects sat below the early return. Fixed with a lazy `useState` read + unconditional effects. Now renders and the PNG test above passes |
| Regression — engagement UI | `node tests/e2e-engagement.mjs` | **18/18 PASS** |
| Regression — routes | `node tests/route-smoke.mjs` | **13/13 PASS** |
| Regression — register journey | `node tests/e2e-register.mjs` | **15/15 PASS** |
| Regression — backend | `./venv/bin/python -m pytest tests/ -q` | **4 passed** |
| Production build | `npm run build` | **OK** (same pre-existing chunk warning) |



## 2026-11-12 — Engagement Group D: live duel room (display-only WebSocket)

Context: a duel reuses the existing challenge code and deterministic question
pack. The new `/ws/duel/{code}` relay carries presence/progress/finish only;
scores remain server-authoritative via `/quiz/challenge/{code}/submit` (see
`docs/adr/0002-live-duel-relay.md`).

| Check | Command | Result |
|---|---|---|
| Duel relay backend tests | `./venv/bin/python -m pytest tests/test_duel_ws.py -q` | **3/3 PASS** — two clients share presence; progress/finished relayed to the rival only; numeric fields clamped; a late `progress` cannot un-finish a player; `joined` snapshot includes peers' last progress; `<script> Ada` sanitises to `script Ada`; invalid room code closes with 1008 |
| Full backend suite | `./venv/bin/python -m pytest tests/ -q` | **7 passed** (4 existing + 3 duel) |
| Two-player browser e2e | `node tests/e2e-duel.mjs http://localhost:5174` | **13/13 PASS** — two isolated contexts register; creator makes code `39EJQE`; creator lobby goes live and waits; joiner sees creator; creator sees joiner arrive; 2 lobby avatars; both enter the quiz and see each other in `.duel-strip`; rival advance reads `1/12`; after the joiner answers all 12 and reaches Summary the creator sees `🏁 … Finished · 8/12`; **0 page errors** |
| Dev transport | Vite proxy `/ws → ws://127.0.0.1:8001` (`ws: true`) | Handshake is same-origin so the HttpOnly `kwizbox_access` cookie authenticates the room; nickname comes from the account, not the query string |
| New bug found (BUG-016) | browser repro | Creator page showed **“Not signed in”** despite a valid cookie session: `Challenge.jsx` still checked the now-always-null `token` state. Guard removed; creator flow green in the e2e above |
| Regression — engagement UI | `node tests/e2e-engagement.mjs` | **18/18 PASS** |
| Regression — mascot/share UI | `node tests/e2e-mascot-share.mjs` | **18/18 PASS** |
| Regression — routes | `node tests/route-smoke.mjs` | **13/13 PASS** |
| Regression — register journey | `node tests/e2e-register.mjs` | **15/15 PASS**, exit 0 |
| Production build | `npm run build` | **OK** (same pre-existing >500 kB chunk warning) |

Notes:
- Restart the backend after deploying: the relay lives in process memory and is
  registered in `main.py`. Restart Vite after editing `vite.config.js` so the
  `/ws` proxy is active.
- Rooms are single-worker by design; a multi-worker deployment would need a
  shared pub/sub layer (documented in the ADR).
- Test users from this pass: `e2e_duel_a_…`, `e2e_duel_b_…`, `dbg_duel_…`
  (dev-only, harmless).

## 2026-11-13 — Restore `models/` + `scripts/` and documentation sync

Owner decision: restore the two documented source libraries from before
`e013937` (the unrelated `.agents/skills` deletions stay deleted).

| Check | Command | Result |
|---|---|---|
| Restored file count | `git checkout e013937^ -- models scripts` | **70 files** (26 MB models + 2.4 MB scripts), staged as additions; no other paths touched |
| Manifest integrity | `models/README.md` verification one-liner | **26/26 assets OK** — after recording the committed md5/bytes for the four masters and preserving the export checksums as `source_md5`/`source_bytes` |
| Runtime copy parity | `cmp models/models/<slug>.glb frontend/public/assets/mascots-v2/animated/<shipped>` | **4/4 identical** (`shs_male`, `shs_female`, `youth_male`, `youth_female`) |
| Docs reference check | grep for `models/`, `scripts/`, `VITE_API_URL`, `localStorage` auth, Fly URL | All restored paths resolve; dev guides now describe cookie auth + same-origin proxy; only the known `.env.production` Fly URL remains, flagged for M3/M4 |
| Code impact | none — assets/docs only | No backend/frontend source changed; earlier Group A–D test results remain valid |

Notes:
- `scripts/seed.py` was never at the repo root; it lives at `backend/scripts/seed.py`
  and resolves `../scripts/questions.json`, which is back.
- `frontend/.env.production` still points at the retired Fly URL; replacing it
  requires an approved production backend URL.

### Follow-up — hardcoded admin password scrub (BUG-017)

| Check | Command | Result |
|---|---|---|
| Hardcoded password gone | `grep -rn "Admin@1234" backend/curriculum` | **No matches** — 8 scripts now use `admin_auth.admin_token()` / `ADMIN_PASSWORD`; docs table replaced with a no-credentials note (the value appears only in BUG-017's description) |
| Helper compiles | `python -m py_compile admin_auth.py check_*.py update_topics.py push_questions.py` | **OK** (9 files) |
| Graceful failure | inspect `admin_auth.admin_token()` | Raises `SystemExit("Set KWIZBOX_ADMIN_PASSWORD…")` when the env var is missing; no default secret |
| Docs | `docs/APP_DOCUMENTATION.md`, `docs/UPGRADE_PLAN_AVATAR_CHALLENGE.md` | Plaintext test-account passwords removed |

The `password123` string still appears as a distractor option inside a quiz
question (`scripts/incoming_204_303.json`); it is question content, not a
credential.

## 2026-11-13 — Full end-to-end regression (post-restore)

Environment: dev stack at `98b69b9` — backend `:8001` (SQLite dev DB), Vite
`:5174` with the same-origin proxy and `/ws`. Suites were run sequentially with
65 s gaps so the register rate limit (10/min) reset between them. Admin checks
used `KWIZBOX_ADMIN_USERNAME=Pblack` + `KWIZBOX_ADMIN_PASSWORD` from the local
credentials file.

| # | Check | Command | Result |
|---|---|---|---|
| 1 | Backend unit/relay tests | `./venv/bin/python -m pytest tests/ -q` | **7 passed** (3.61 s) |
| 2 | Production build | `npm run build` | **OK** (17.04 s; only the pre-existing >500 kB chunk warning) |
| 3 | Route smoke | `node tests/route-smoke.mjs http://localhost:5174` | **13/13 routes**, no fatal errors |
| 4 | Register → quiz → summary | `node tests/e2e-register.mjs http://localhost:5174` | **15/15 PASS**, 0 page errors |
| 5 | Guest journey | `node tests/e2e-guest.mjs http://localhost:5174` | **5/5 PASS** (cookie session, age/gender persisted, `is_guest`) |
| 6 | Engagement surfaces | `node tests/e2e-engagement.mjs http://localhost:5174` | **18/18 PASS**, 0 page errors |
| 7 | Mascot + PNG share | `node tests/e2e-mascot-share.mjs http://localhost:5174` | **18/18 PASS**, 0 page errors |
| 8 | Live duel (two contexts) | `node tests/e2e-duel.mjs http://localhost:5174` | **13/13 PASS**; challenge `8YJZ7S`; lobby presence, rival strip `1/12`, `Finished`; 0 page errors |
| 9 | Full API e2e | `KWIZBOX_TEST_URL=http://127.0.0.1:8001 node tests/full-e2e.mjs` | **37 passed, 0 failed** — “FULL APP END-TO-END PASSED” (auth/cookie, headers, rate limits, quiz, admin, challenge compare) |

**Outcome:** 9/9 suites green, no new bugs found (BUG-017 remains the only
change since the last full pass). Test users created during this run:
`e2e_mwestgyd`, `e2e_eng_mwesxmou`, `e2e_mascot_mwet07ud`, duel pair
`e2e_duel_*`, plus full-e2e `fullci_*` (dev DB only, harmless).

Raw log: `/tmp/opencode/e2e-2026-11-13.log` (local, not committed).

## 2026-11-13 — Offline practice (device-local packs + local grading)

Environment: dev stack with the offline changes — backend `:8001` (SQLite dev
DB), Vite `:5174` (same-origin proxy incl. `/quiz/offline-pack`). The backend
test suite uses an isolated temp SQLite DB, so the live dev DB is untouched.

| Check | Command | Result |
|---|---|---|
| Backend suite (incl. new offline test) | `./venv/bin/python -m pytest tests/ -q` | **8 passed** (5.94 s first run; 2.06 s in the regression) |
| Answer key only on the offline endpoint | `test_offline_pack_returns_answer_key_without_side_effects` | `/quiz/pack` has no `answer_index`/`explanation`; `/quiz/offline-pack` returns `answer_index=2` + explanation + 4 options |
| No live side effects | same test, DB assertions | **0** `QuizSession` and **0** `UserQuestionSeen` rows after an authenticated download |
| Daily challenge refusal | same test, `daily: true` | **HTTP 400** |
| Frontend unit tests | `node --test tests/offlinePractice.test.js` | **4/4 pass** — scoring parity (base/speed/streak), result shape, unknown-question rejection, storage fallback |
| Production build | `npm run build` | **OK** (7.55 s first run; 5.25 s in the regression; only the pre-existing >500 kB chunk warning) |
| Offline browser e2e | `node tests/e2e-offline.mjs http://127.0.0.1:5174` | **19/19 PASS** |
| Live endpoint spot check | `curl POST /quiz/offline-pack` | 200; keys include `answer_index` + `explanation`; `/quiz/pack` still leaks neither |

Offline e2e details (headless Chromium, 412×915, one context):
1. `/choose-quiz` renders the offline card; save downloads exactly one pack.
2. The selected topic (B4 Mathematics / Algebraic Expressions) had **9**
   questions, so the test asserts against the actual pack size, not a hardcoded
   12.
3. `context.setOffline(true)` switches the card status to offline; the saved
   pack starts at `/quiz?offline=true` and shows the device-only banner.
4. All 9 questions are answered and graded locally; Summary shows the offline
   banner, lists all 9 reviews, shows a score (sample run: 20 pts), hides the
   leaderboard action, and stores `offline: true` / `session_id: 0` / `total: 9`.
5. **Zero** `/quiz/*` or `/auth/*` requests were made after going offline; no
   uncaught page errors.

Notes:
- Storage: IndexedDB `kwizbox-offline-practice` / store `packs` / key `active`;
  localStorage fallback `kwizbox_offline_practice_pack`; media cache
  `kwizbox-offline-media` (removed by “Remove”).
- Pack size is capped at 12 but depends on the pool; a topic may yield fewer.
- Web caveat: with the PWA service worker disabled, an offline page reload needs
  a connection even though an open app keeps working. Native/Capacitor bundles
  the shell.
- No product bugs found. The first e2e run failed only because the test assumed
  12 questions; the assertion now uses the real pack size.

## 2026-11-13 — Full end-to-end regression (offline practice)

Environment: dev stack with the offline changes — backend `:8001` (SQLite dev
DB), Vite `:5174` with the same-origin proxy incl. `/quiz/offline-pack` and
`/ws`. Suites ran sequentially with 65 s gaps so the register rate limit
(10/min) reset. Admin checks used `KWIZBOX_ADMIN_USERNAME=Pblack` +
`KWIZBOX_ADMIN_PASSWORD` from the local credentials file.

| # | Check | Command | Result |
|---|---|---|---|
| 1 | Backend unit/relay/offline tests | `./venv/bin/python -m pytest tests/ -q` | **8 passed** (2.06 s) |
| 2 | Offline unit tests | `node --test tests/offlinePractice.test.js` | **4/4 pass** (63 ms) |
| 3 | Production build | `npm run build` | **OK** (5.25 s; only the pre-existing >500 kB chunk warning) |
| 4 | Route smoke | `node tests/route-smoke.mjs http://localhost:5174` | **13/13 routes**, no fatal errors |
| 5 | Offline practice e2e | `node tests/e2e-offline.mjs http://localhost:5174` | **19/19 PASS** — download, `setOffline(true)`, 9-question pack played, Summary device-only banner, zero quiz/auth requests offline |
| 6 | Register → quiz → summary | `node tests/e2e-register.mjs http://localhost:5174` | **15/15 PASS**, 0 page errors (`e2e_mweulfm2`) |
| 7 | Guest journey | `node tests/e2e-guest.mjs http://localhost:5174` | **5/5 PASS** (cookie session, age/gender persisted, `is_guest`) |
| 8 | Engagement surfaces | `node tests/e2e-engagement.mjs http://localhost:5174` | **18/18 PASS**, 0 page errors (`e2e_eng_mweupll7`) |
| 9 | Mascot + PNG share | `node tests/e2e-mascot-share.mjs http://localhost:5174` | **18/18 PASS**, 0 page errors (`e2e_mascot_mweus9k1`) |
| 10 | Live duel (two contexts) | `node tests/e2e-duel.mjs http://localhost:5174` | **13/13 PASS**; challenge `AAGXHE`; lobby presence, rival strip, `Finished`; 0 page errors |
| 11 | Full API e2e | `KWIZBOX_TEST_URL=http://127.0.0.1:8001 node tests/full-e2e.mjs` | **37 passed, 0 failed** — “FULL APP END-TO-END PASSED” |

**Outcome:** 11/11 suites green; no new bugs. Test users created this run:
`e2e_mweulfm2`, `e2e_eng_mweupll7`, `e2e_mascot_mweus9k1`, duel pair
`e2e_duel_*`, plus full-e2e `fullci_*` (dev DB only, harmless).

Raw log: `/tmp/opencode/e2e-offline-2026-11-13.log` (local, not committed).
