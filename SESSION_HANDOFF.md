# SESSION_HANDOFF.md

> Written so that a completely fresh AI agent (or developer) can continue this
> project **without access to any previous conversation**.
> Last updated: 2026-11-11 (morning session: docs sync + commits after the
> purge/teardown day and a second working session)

## Read first

`AGENTS.md` → `PROJECT_STATUS.md` → this file → `brain.md`.

## Owner's standing decisions (updated 2026-11-11 — do not override without asking)

1. **Initialization report: APPROVED** (2026-11-10).
2. **Push to GitHub: DONE.** History was rewritten 2026-11-10 (BUG-007 purge,
   owner: "remove password from public") — all branches were force-pushed;
   pre-purge SHAs are dead; the old→new map is `.git/filter-repo/commit-map`
   (local only). Do NOT force-push again without a new explicit reason.
3. **M1 (Postgres/Supabase migration): REJECTED** (recorded 2026-11-10,
   owner-confirmed 2026-11-11) — removed from scope; the app stays on
   SQLite. Do no migration work.
4. **M2 (hosting): REJECTED** (recorded 2026-11-10, owner-confirmed
   2026-11-11) — no hosting deployment planned. The Fly Deploy workflow,
   platform configs, and the stale live Fly app were all removed/destroyed.
   Do not re-add deploy automation or configure `FLY_API_TOKEN` unless the
   owner reopens hosting.
5. **Release scope: APPROVED** — public web app + Android (Capacitor) +
   Play Store; M3–M5 continue.
6. **BUG-007: EXECUTED & CLOSED 2026-11-10** (history purge, JWT rotation,
   admin-password reset — all done and verified). Remaining follow-up: the
   owner sends the GitHub support request (paste-ready draft off-repo).
   Never re-publish the old history (the frozen `~/Desktop/KwizBoz Andriod`
   copy and the pre-purge bundle contain it).

## What the previous session accomplished

**Session goal:** professional initialization of KwizBox (relocation +
governance system, no app development), then — after the owner's five
decisions — full QA and merge of PR #2 and a privacy-cleanup plan.

1. Audited ~6 project copies; identified `~/Desktop/KwizBoz Andriod` as the
   authoritative superset (4 commits ahead of GitHub + 5 loose changes).
2. Cloned the full repo to `/media/stephen/FILES/My Projects/KwizBox`,
   re-pointed origin to `git@github.com:AmoakoBarnie/KwizBox.git`, fixed
   `main` tracking, copied gitignored essentials (`backend/trivia.db` —
   md5-verified `510732c3…`, `backend/.env`, `frontend/.env`), committed the
   loose changes as `cf1d9be`, set NTFS git mitigations. Old repo untouched.
3. Built the governance system (commit `70bbd75`): AGENTS/STATUS/HANDOFF/
   CHANGELOG/CONTRIBUTING, `docs/01`–`07`, ADR-001…005, traceability,
   `frontend/.env.example`; corrected stale README facts.
4. Initialization audit performed (all files non-empty, no secrets in the new
   commits, old repo unchanged). Owner approved.
5. **PR #2 QA** (`origin/manus/add-180-questions-546-725`): the 180 questions
   use a different JSON schema (`options` list + `answer` letter) — mapped to
   DB columns `option_a..d` + `answer_index`. 180/180 structurally valid;
   letters ↔ indices consistent; 0 intra-batch duplicates; **0 of 180 already
   in the live DB** (normalized text vs all 7,710); 12-question sample review
   passed (correct answers, curriculum-aligned, Ghanaian context).
6. **Merged PR #2** locally: `40e155d` (clean 'ort' merge, 3,241 insertions in
   `scripts/questions.json` — `main` had not touched the file since the branch
   point, so no conflicts were possible).
7. **Imported the 180 questions into the live DB** with new
   `scripts/import_pr2_180.py` (idempotent, normalized-text duplicate guard):
   pre-import backup taken first (`trivia.db.bak_20261110_110311_pre_pr2`,
   md5-verified), then 7,710 → **7,890** questions. All 180 verified present;
   distribution B4–B9 × 30, Math/Science/Computing × 60; new row ids
   36948846–36949025 (sequence was already far past row count — harmless);
   post-import row spot-check passed (options in order, answer_index 0 =
   "7,402" ✓).
8. **BUG-007 privacy finding + plan of record** (Option C, not executed):
   `backend/trivia.db.bak_20260819_081244` is tracked & public on GitHub with
   22 users (19 bcrypt password hashes, 1 security-answer hash, school codes;
   **0 emails/phones/full names**; repo has 0 forks). Plan: bundle backup →
   `git-filter-repo --path … --invert-paths` → force-push all branches in one
   window → credential rotations. Documented in
   `docs/02-architecture/SECURITY_ARCHITECTURE.md`; BUG_TRACKER entry BUG-007;
   prevention done (`.gitignore` excludes `backend/trivia.db.bak_*`).
9. Synced all documentation to the new state (counts, PR #2, BUG-007) and
   committed everything (import script + doc updates) as one commit.

### Continuation session (same day): push + CI repair

10. **Pushed to GitHub** after owner authorization: pre-flight verified
    ahead 9 / behind 0 and no `.env`/DB files in the diff; fast-forward
    `9077758..e0366a9`. PR #2 auto-marked **Merged** on GitHub (closed).
11. **Diagnosed the first-ever CI run's failure** (run `42805071620` on
    `e0366a9`): frontend job passed; two latent workflow bugs failed —
    (a) secret-scan downloaded a nonexistent `linux_amd64` gitleaks asset
    (404; real asset is `linux_x64`), (b) the smoke job set only
    `DATABASE_URL`+`JWT_SECRET`, so `seed_super_admin()` (which hard-exits
    without `ADMIN_PASSWORD`) killed the backend at startup and the 40s
    health poll failed. Verified neither was a PR #2 regression (workflows
    had never run before; nothing reads `questions.json` at startup).
12. **Pre-verified locally, then fixed** (commit `b2dd269`): ran gitleaks
    8.18.0 (sha256-verified binary) against the full 52-commit history —
    **0 leaks**; proved a depth-1 checkout would scan only 1 commit → added
    `fetch-depth: 0`; fixed the asset name; added a throwaway
    `ADMIN_PASSWORD` to the smoke env (the smoke test only asserts
    `/admin/token` rejects bad creds — no real credential in CI).
13. **Gated Fly Deploy to manual-only** (commit `a3a32b2`) after its only
    ever run failed at 14s (`FLY_API_TOKEN` never configured; nothing was
    deployed) and the owner deferred hosting.
14. **Verified green**: CI run #2 (`42805908080` on `a3a32b2`) — all three
    jobs pass in 32s; the push of `a3a32b2` triggered no Fly Deploy run.
    All evidence recorded in `docs/05-testing/TEST_RESULTS.md`.

### Purge session (same day): BUG-007 execution + deploy removal

Owner instructions: "remove password from public" and "delete the deployment
not working".

15. **Pre-flight scan expanded the scope 1 → 5 paths**: full-history
    name-only scan + large-blob listing found `_backup/backend/trivia.db`
    (user + 4 admin hashes, 1,701 audit rows), a `_backup/` duplicate of the
    Aug backup, and `backend_deploy.tar.gz` (50 MB, committed 2026-10-08)
    which contained a `backend/.env` **byte-identical to the live one** —
    the live `JWT_SECRET` had been public for ~a month, invisible to
    gitleaks because the tarball is a compressed binary. All other `.env*`
    blobs in history verified as templates/URL-only.
16. **Safety first**: full bundle of all refs
    (`KwizBox-pre-purge-20261110.bundle`, 85 MB, md5
    `7f9f31d5e242430fe10f0f6479f553cd`, kept off-repo) + info file with
    pre-purge SHAs and the exposed-secret record. Deleted the Fly Deploy
    workflow (committed + pushed first, so `main` matched `origin` and
    filter-repo's safety fetch would not prompt).
17. **Rewrote all 6 branches** with `git-filter-repo v2.47.0
    --sensitive-data-removal --invert-paths` over the 5 paths; 63 commits
    preserved; verified locally: 0 commits touch any purged path, all 3
    sensitive blobs unreachable, live `trivia.db`/`.env` untouched on disk.
18. **Force-pushed all branches** (owner-approved rewrite). New heads:
    `main` `5d906a1`, `feature/question-types-tf-image` `2d7fd7b`,
    `flyio-new-files` `d29729a`, `gh-pages` `4ee8059` (unchanged — clean
    lineage), `manus/add-180-questions-546-725` `d23a339`,
    `mascot-3d-and-models` `1d61b55`. GitHub API confirms 0 commits on the
    purged path.
19. **Rotated the live `JWT_SECRET`** in the gitignored `backend/.env`
    (old value recorded only in the off-repo info file). No user impact —
    nothing is deployed.
20. **Residue verified and documented**: `refs/pull/2/head` is clean (404 on
    the purged paths), but `refs/pull/1/head` (`8ec1f3a`) still pins the old
    lineage — the DB backup and tarball remain downloadable at old SHAs
    (raw HTTP 200 verified at `8c0dd77`). Needs a GitHub Support request
    (draft below) or repo deletion + recreation.

### Continuation session (same day): admin reset + host-platform teardown

Owner instructions: "1 yes 2 unchanged 3 delete the host platforms not working".

21. **Support request: APPROVED** ("1 yes") — paste-ready draft written
    off-repo at `/media/stephen/FILES/GitHub-support-request-20261110.md`
    (submit at https://support.github.com/request; only the owner can).
22. **Admin passwords RESET** (owner confirmed "unchanged" → all compromised):
    verified all 4 live admin hashes were byte-identical to the leaked
    initial-commit DB (`mod1`/`qm1` also matched the Aug backup); backed up
    the DB first (`trivia.db.bak_20261110_114608_pre_admin_reset`, md5
    `07ae3e4669ab1d7b808f88d83c1e9a22`); reset all 4 accounts to one new
    strong password (bcrypt 4.0.1, rounds 12); verified with
    `bcrypt.checkpw` against the on-disk DB. Credentials stored off-repo at
    `/media/stephen/FILES/KwizBox-admin-credentials-20261110.txt`.
23. **Host platforms torn down**: the Fly app `kwizbox-still-bush-3080` was
    discovered STILL LIVE (deployed 2026-11-04, running pre-relocation code
    with the leaked JWT secret — actively exploitable) and **destroyed** via
    flyctl (URL verified dead; no volumes, no data lost). 76 host-platform
    files removed from the repo (fly.toml, both Dockerfiles, .dockerignore,
    railway.toml, .htaccess, `_backup/php-backend/` — the dead InfinityFree
    platform whose domain no longer resolves — Vercel configs, stale env
    backups). Remote `gh-pages` (stale Pages site) and `flyio-new-files`
    branches deleted (local copies retained). All recoverable from git
    history. Docs synced the same day.

### Second working session (2026-11-10, separate from this conversation)

24. A separate session worked on the repo ~11:57–13:28 after this session
    was interrupted mid-docs-sync. It: recorded the owner's **M1/M2
    rejections** and **release-scope approval** in PROJECT_STATUS/CHANGELOG;
    rebuilt the dev environment (`backend/venv`, `frontend/node_modules`);
    opened CORS for the Vite dev ports in `backend/src/main.py`;
    fixed a stale-locator bug in `frontend/tests/e2e-guest.mjs`; and wrote
    5 debug scripts (`frontend/debug-*.mjs`) investigating a **guest-form
    submit bug** (form fills correctly, submit fails — outcome unrecorded).
    The owner confirmed all those decisions on 2026-11-11 ("Yes — all
    final"). A leftover `fly-builder-*` suspended app remains on the Fly
    account (harmless infrastructure).

### This session (2026-11-11)

25. Entry protocol executed (full read-first chain + git state). Found the
    interrupted commit (teardown + docs) and the second session's work
    sitting uncommitted; reconciled all documentation to the confirmed
    decisions; committed the teardown + docs and the dev fixes as separate
    commits and pushed both. CI verified green. Re-checked the dead
    GitHub Pages site.

### This session (2026-11-11, continued) — e2e attempt + concurrent-agent incident

26. Owner requested end-to-end testing. Discovered the owner's **Hermes**
    desktop agent (session `local-2302862…` — also yesterday's "second
    session") working the repo concurrently. Owner: "run parallel and check
    on each other." Hermes executed a mass purge (08:52–08:57, 4 batches:
    venv/node_modules + both DB backups → `_backup models scripts` →
    root docs incl. brain/CLAUDE/README/SESSION_HANDOFF → `.agents .hermes
    .vite`), then **re-ran it at 09:01–09:21 after the first restore**,
    and broke the host system Python's fastapi via system-wide
    `pip3.12 --break-system-packages --force-reinstall`. Owner confirmed
    the purge was an intended cleanup that "shouldn't affect the important
    files listed in the master prompt" — the scope overstepped. Working
    tree restored to `89cbee7` **twice** (`git restore .`); DB backup
    regenerated (`trivia.db.bak_20261111_091514_pre_e2e`, md5
    `c22ca0788cae366550f7ab3fbbb54952`); venv rebuilt properly
    (fastapi 0.115.0, bcrypt 4.0.1); backend UP on 8001. **Audit verdict
    (owner-requested, vs the master-prompt file "Master P"): Hermes is NOT
    master-prompt compliant** — deletes memory/governance files, records
    nothing, commits nothing, exceeds approved scope, damages the host
    Python (BUG-008). Full evidence in TEST_RESULTS.md 2026-11-11.
27. e2e testing **paused at owner request** mid-suite. Early finding
    recorded as **BUG-009** (P1): `/quiz/pack` + `/quiz/submit` return
    401 to anonymous callers (pytest 4/4 fail) — probable root of the
    2026-11-10 guest-form submit bug. Live DB verified intact throughout
    (7,890 questions, 4 admin accounts; Hermes' `ADMIN_PASSWORD` env could
    not clobber them — seed is create-if-missing).

## Files modified / created (2026-11-10 sessions, committed 2026-11-11)

- **Repo:** history rewritten via `git-filter-repo` (all pre-purge SHAs dead;
  map in `.git/filter-repo/commit-map`, local only). Post-rewrite commits:
  Fly Deploy deletion, purge docs sync, then (2026-11-11) the host-platform
  teardown + docs, and the dev fixes (CORS + e2e) from the second session.
- **Deleted from the repo:** `.github/workflows/fly-deploy.yml` (owner
  instruction; recoverable from git history) and, in the teardown commit,
  76 host-platform files (fly.toml, both Dockerfiles, .dockerignore,
  railway.toml, .htaccess, `_backup/php-backend/`, `_backup/vercel.json`,
  stale `frontend/.env.production.*bak*`).
- **Purged from all history (never re-add, never re-publish):**
  `backend/trivia.db.bak_20260819_081244`, `_backup/backend/trivia.db`,
  `_backup/backend/trivia.db.bak_20260819_081244`, `backend_deploy.tar.gz`,
  root `trivia.db`.
- **Off-repo artifacts (keep private):**
  `KwizBox-pre-purge-20261110.bundle` (full pre-rewrite history — contains
  the sensitive files by design),
  `KwizBox-prepurge-info-20261110.txt` (pre-purge SHAs + exposed-secret
  record), `GitHub-support-request-20261110.md` (paste-ready support
  request), `KwizBox-admin-credentials-20261110.txt` (new admin password) —
  all at `/media/stephen/FILES/`.
- **Rotated/reset:** `JWT_SECRET` in the gitignored `backend/.env`; all 4
  admin passwords in the live `backend/trivia.db`.
- **Second session's untracked scratch (kept out of the commits):**
  `frontend/debug-*.mjs` (5 guest-form debugging scripts),
  `INITIALIZATION_REPORT.md`, root `.env.example`.
- **Not touched:** `~/Desktop/KwizBoz Andriod` (frozen snapshot — contains
  PRE-PURGE history, keep private); live user data beyond the admin reset.

## Current implementation state

- Application code: **unchanged by the security work** (relocation, docs,
  merge, DB import, workflow repairs, history purge, teardown only). The
  second session's changes: CORS origins for localhost:5173/5174 in
  `backend/src/main.py` + the e2e-guest locator fix.
- Live DB: **7,890 questions** (16 subjects, 12 class levels); admin
  passwords reset. Users/sessions data untouched by the import.
- **Dev environment EXISTS again** (second session, 2026-11-10):
  `backend/venv` + `frontend/node_modules` regenerated. Nothing is
  currently running (ports 8001/5173/5174 dead). Start per
  `docs/06-deployment/ENVIRONMENT_SETUP.md`.
- **Known unresolved bug under investigation: guest-form submit** — the
  second session was debugging guest creation failing on submit (5 debug
  scripts in `frontend/`, no recorded outcome). Verify before building on
  the guest flow.
- Local `main` in sync with `origin/main`; CI green on the clean history.

## Tests performed

- All repository-level, CI, purge, admin-reset, and teardown verifications
  are recorded in `docs/05-testing/TEST_RESULTS.md` (evidence tables,
  including GitHub-side API checks and residue verification).
- **No full local app test run is recorded** — the dev env was rebuilt late
  on 2026-11-10 but the guest-flow debugging did not conclude. The 180
  imported questions are verified at DB level only.

## Outstanding problems

1. **Concurrent-agent protocol gap:** the owner runs multiple AI agents on
   this repo (OpenCode here; Hermes desktop). Hermes does **not** follow
   AGENTS.md (it deleted memory files, recorded nothing, committed nothing).
   Before further parallel work, the owner should require every agent to
   follow the AGENTS.md entry/exit protocol, or assign one agent per task.
2. **BUG-008 (host env):** system-Python fastapi broken in `~/.local` by
   Hermes' `--break-system-packages --force-reinstall` — needs repair or
   uninstall; repo venv unaffected.
3. **BUG-009 (P1, app):** `/quiz/pack` + `/quiz/submit` 401 for anonymous
   callers — pytest 4/4 fail; probable root of the guest-form submit bug;
   full e2e paused mid-suite at owner request.
4. **Guest-form submit bug (UNRESOLVED, pre-dates BUG-009 finding)** —
   see BUG-009; likely the same root cause.
5. **GitHub residue (BUG-007 follow-up):** `refs/pull/1/head` pins old
   commits — DB backup + tarball still downloadable at old SHAs. Owner
   action: send the support request (paste-ready draft below) or repo
   delete + recreate. JWT is rotated and admin passwords reset, so the
   residue is bcrypt hashes without contact PII.
6. **Cleanup scope undefined:** the owner wants a repo cleanup, but the
   junk-vs-protected list was never written down. If the cleanup resumes,
   it must be a documented, owner-approved commit (CHANGELOG entry) —
   never silent `rm` batches. Note: `INITIALIZATION_REPORT.md`, the 5
   `frontend/debug-*.mjs`, and the two original DB backups were lost
   permanently in Hermes' purge (untracked); a fresh DB backup exists.
7. **`Master P` (the master-prompt file) sits untracked at the repo
   root** — decide: track it under `docs/01-project-planning/` (fits the
   documentation system) or keep it out of the repo.
8. Stale legacy copies undecided (archival recommended; nothing touched;
   the frozen old repo must never be republished as-is).
9. GitHub repo description is stale (cosmetic; owner action in Settings).
10. `frontend/.env.production` still points at the now-dead Fly URL — update
    before any production build (M3/M4).

## Draft: GitHub Support request (owner to send — residue cleanup)

> **Paste-ready version with submission instructions:**
> `/media/stephen/FILES/GitHub-support-request-20261110.md`
> (submit at https://support.github.com/request). Short form below.

> Subject: Remove cached commits after sensitive-data history rewrite
>
> Hi — I rewrote the history of my public repo `AmoakoBarnie/KwizBox` on
> 2026-11-10 with git-filter-repo to remove accidentally committed
> sensitive files (SQLite DB backups containing bcrypt password hashes and
> a deployment archive containing a JWT secret, which I have since
> rotated). All branches were force-pushed to the rewritten history.
> However, the old commits remain accessible, e.g. via the immutable pull
> request ref `refs/pull/1/head` (commit `8ec1f3a090f47bdad88038e100c0b54476835f54`)
> and by direct SHA (e.g. `8c0dd77`, which still serves the sensitive
> files). Could you please garbage-collect / remove the unreachable old
> commits and the `refs/pull/1/head` reference so the removed files are no
> longer downloadable? The repo has 0 forks. Thank you!

(Full list of old SHAs: `/media/stephen/FILES/KwizBox-prepurge-info-20261110.txt`.)

## Next exact actions (for the next session)

1. **Standing gates:** no force-push, no deploy automation, no Postgres
   migration (M1 rejected), no hosting work (M2 rejected) — owner
   decisions are final until they say otherwise.
2. Owner sends the GitHub Support request (paste-ready draft off-repo);
   then verify residue is gone via the API checks in TEST_RESULTS.md.
3. **Reproduce and fix the guest-form submit bug** (debug scripts in
   `frontend/debug-*.mjs`; record the bug + fix in BUG_TRACKER; run
   `e2e-guest.mjs` green).
4. Then: app-level smoke (`smoke-auth.mjs`, `route-smoke.mjs`, quiz-pack
   spot check incl. PR #2 questions) and record in TEST_RESULTS.
5. When the owner approves M3: decide the APK's target backend (no hosting
   exists — M2 rejected), then Capacitor rebuild per
   `docs/06-deployment/DEPLOYMENT_GUIDE.md`.
6. Optional cleanups: stale repo description (Settings), failed Fly Deploy
   run (Actions tab), debug scripts + `INITIALIZATION_REPORT.md` +
   root `.env.example` (untracked scratch — delete or commit deliberately).

## Relevant documentation to read before continuing

- `PROJECT_STATUS.md` — current state + pending decisions.
- `docs/02-architecture/SECURITY_ARCHITECTURE.md` — BUG-007 execution record
  (purge scope, steps, residue, follow-ups).
- `docs/05-testing/TEST_RESULTS.md` — evidence log (merge, import, CI,
  purge, admin reset, teardown).
- `docs/06-deployment/BACKUP_AND_RECOVERY.md` — pre-purge bundle location.
- `docs/06-deployment/DEPLOYMENT_GUIDE.md` — host-removal record + M3 notes.
- `docs/01-project-planning/ROADMAP.md` — milestone plan (M1/M2 now
  rejected; M3–M5 active).
- `scripts/import_pr2_180.py` — the import tool (idempotent; safe to re-run).
