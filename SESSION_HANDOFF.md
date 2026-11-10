# SESSION_HANDOFF.md

> Written so that a completely fresh AI agent (or developer) can continue this
> project **without access to any previous conversation**.
> Last updated: 2026-11-10 (end of purge + deploy removal session)

## Read first

`AGENTS.md` → `PROJECT_STATUS.md` → this file → `brain.md`.

## Owner's standing decisions (2026-11-10 — do not override without asking)

1. **Initialization report: APPROVED.**
2. **Push to GitHub: DONE.** History was rewritten 2026-11-10 (BUG-007 purge,
   owner: "remove password from public") — all branches were force-pushed;
   pre-purge SHAs are dead; the old→new map is `.git/filter-repo/commit-map`
   (local only). Do NOT force-push again without a new explicit reason.
3. **Hosting/M2: LATER** — owner said "we will work on the hosting later".
   The Fly Deploy workflow is **DELETED** (owner: "delete the deployment not
   working"). Do not re-add deploy automation or configure `FLY_API_TOKEN`
   until the owner starts hosting work.
4. **BUG-007: EXECUTED 2026-11-10** (purge + JWT rotation done). Open
   follow-ups are owner actions: GitHub residue cleanup + admin password
   reset. Never re-publish the old history (the frozen
   `~/Desktop/KwizBoz Andriod` copy and the pre-purge bundle contain it).
5. **M1 (dev environment + Supabase migration): WAIT** — owner said
   "let's wait". No M1 work until authorized.

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

## Files modified / created this session

- **Repo:** history rewritten via `git-filter-repo` (all pre-purge SHAs dead;
  map in `.git/filter-repo/commit-map`, local only). Post-rewrite commits:
  the Fly Deploy deletion and the purge documentation sync. Local `main` =
  `origin/main` = `5d906a1` (plus this session's final docs commit).
- **Deleted from the repo:** `.github/workflows/fly-deploy.yml` (owner
  instruction; recoverable from git history).
- **Purged from all history (never re-add, never re-publish):**
  `backend/trivia.db.bak_20260819_081244`, `_backup/backend/trivia.db`,
  `_backup/backend/trivia.db.bak_20260819_081244`, `backend_deploy.tar.gz`,
  root `trivia.db`.
- **Off-repo artifacts:** `KwizBox-pre-purge-20261110.bundle` (full
  pre-rewrite history — contains the sensitive files by design; keep
  private) and `KwizBox-prepurge-info-20261110.txt` (pre-purge SHAs +
  exposed-secret record for the support request), both at
  `/media/stephen/FILES/`.
- **Rotated:** `JWT_SECRET` in the gitignored `backend/.env`.
- **Not touched:** `~/Desktop/KwizBoz Andriod` (frozen snapshot — contains
  PRE-PURGE history, keep private); live `backend/trivia.db`; application
  source code.

## Current implementation state

- Application code: **unchanged** (relocation, docs, merge, DB import,
  workflow repairs, history purge only).
- Live DB: **7,890 questions** (16 subjects, 12 class levels). Users/sessions
  data untouched by the import (questions table only).
- No runtime environment in the new home (`backend/venv`,
  `frontend/node_modules` deliberately not copied — regenerate per
  `docs/06-deployment/ENVIRONMENT_SETUP.md` when M1 is authorized). Note:
  CI's cloud runners DO run the smoke test, but no local runtime exists.
- Local `main` **in sync** with `origin/main` on the rewritten history;
  working tree clean after this session's commits. CI green on the clean
  history. Fly Deploy workflow deleted.

## Tests performed this session

- All repository-level, CI, and purge verifications recorded in
  `docs/05-testing/TEST_RESULTS.md` (checksums, counts, merge/import
  evidence, push/CI diagnosis evidence, then the full purge evidence table
  including GitHub-side API checks and residue verification).
- **No local application tests were run** — no local runtime env exists
  (M1 deferred). The imported questions are verified at DB level only; the
  app serving them locally is untested until the env is built.

## Outstanding problems

1. **GitHub residue (BUG-007 follow-up):** `refs/pull/1/head` pins old
   commits — DB backup + tarball still downloadable at old SHAs. Owner
   action: support request (draft below) or repo delete + recreate. JWT
   already rotated, so the tarball leak is defanged; remaining residue is
   bcrypt hashes without contact PII.
2. **Admin passwords:** 4 admin hashes were public; the live DB may still
   use those passwords. Reset when the owner provides new passwords.
3. Supabase connection string still missing (M1 external blocker).
4. Stale legacy copies undecided (archival recommended; nothing touched;
   the frozen old repo must never be republished as-is).
5. App-level verification of the 180 imported questions pending (M1 env).
6. GitHub repo description is stale (cosmetic; owner action in Settings);
   the failed Fly Deploy run lingers in the Actions tab (deletable in UI).

## Draft: GitHub Support request (owner to send — residue cleanup)

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

1. **Do not force-push again, do not re-add the deploy workflow, and do not
   start M1 or hosting work without the owner's explicit go-ahead** —
   standing gates.
2. Owner sends the GitHub Support request above (or chooses repo delete +
   recreate instead); then verify residue is gone via the API checks in
   TEST_RESULTS.md.
3. Owner provides a new admin password → reset the 4 admin hashes in the
   live `backend/trivia.db` (direct sqlite UPDATE or at M1 runtime).
4. If the owner authorizes M1: environment setup
   (`docs/06-deployment/ENVIRONMENT_SETUP.md`), run
   `node frontend/tests/smoke-auth.mjs` + `route-smoke.mjs` + a quiz-pack
   spot check for the PR #2 questions, record results in TEST_RESULTS.
5. When the Supabase URI arrives: back up `trivia.db`, run
   `backend/scripts/migrate_sqlite_to_pg.py`, verify all 13 table counts.
6. When the owner starts hosting (M2): re-create a deploy workflow from git
   history (`git log --all -- .github/workflows/fly-deploy.yml`), set the
   `FLY_API_TOKEN` repo secret, review `fly.toml`, and deploy.

## Relevant documentation to read before continuing

- `PROJECT_STATUS.md` — current state + pending decisions.
- `docs/02-architecture/SECURITY_ARCHITECTURE.md` — BUG-007 execution record
  (purge scope, steps, residue, follow-ups).
- `docs/05-testing/TEST_RESULTS.md` — evidence log (merge, import, CI,
  purge).
- `docs/06-deployment/BACKUP_AND_RECOVERY.md` — pre-purge bundle location.
- `docs/01-project-planning/ROADMAP.md` — milestone plan (M1–M5).
- `scripts/import_pr2_180.py` — the import tool (idempotent; safe to re-run).
