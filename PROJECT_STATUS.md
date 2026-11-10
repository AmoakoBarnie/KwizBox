# PROJECT_STATUS.md

> Snapshot of where the project is. Updated at the end of every working session.
> Last updated: 2026-11-10 (post BUG-007 purge + deploy removal)

## Current phase

**Initialization COMPLETE. PR #2 merged & pushed. CI green. Sensitive history PURGED. Hosting deferred.**
The owner approved the initialization (2026-11-10), the PR #2 merge + push,
then directed: **"remove password from public"** (BUG-007 purge — executed:
full history rewrite, all branches force-pushed, live JWT secret rotated) and
**"delete the deployment not working"** (Fly Deploy workflow deleted).
M1 remains deferred ("let's wait"). **No new work should start without the
owner's go-ahead.**

## Repository state (verified 2026-11-10)

- **Location:** `/media/stephen/FILES/My Projects/KwizBox` (authoritative working copy)
- **Remote:** `github.com/AmoakoBarnie/KwizBox` — local `main` **in sync** with
  `origin/main` at `5d906a1`. **History rewritten 2026-11-10** (BUG-007 purge,
  owner-approved force-push): every pre-purge commit has a new SHA (map kept
  locally at `.git/filter-repo/commit-map`); safety bundle off-repo
  (`KwizBox-pre-purge-20261110.bundle`, md5-verified). Working tree: clean.
- **CI: green.** The gitleaks full-history scan now scans the clean,
  post-purge history (the sensitive blobs are unreachable).
- **Fly Deploy workflow: DELETED** (owner instruction — it never worked;
  `FLY_API_TOKEN` was never configured and nothing was ever deployed).
  `Dockerfile` + `fly.toml` remain for M2; the workflow is recoverable from
  git history.
- PR #2: **closed as Merged on GitHub** (merge commit recognized).
- `backend/trivia.db`: **7,890 questions** (7,710 + 180 from PR #2),
  gitignored, untouched by the purge. Pre-import backup md5-verified.
- **JWT_SECRET rotated** in the live `backend/.env` (old value was public in
  a committed tarball since ~2026-10-08).

## Milestones

| ID | Milestone | Status |
|---|---|---|
| M0 | Project initialization & governance | ✅ Done & **approved** 2026-11-10 |
| M0.5 | PR #2 merge + question import | ✅ Done 2026-11-10 (merged, imported, pushed; CI green) |
| M0.7 | BUG-007 purge (sensitive history removal) | ✅ **Executed 2026-11-10** — 5 paths purged from all branches; JWT rotated; GitHub residue cleanup pending (owner) |
| M1 | SQLite → Postgres (Supabase) migration | ⏸ Deferred by owner ("let's wait"); also blocked on Supabase connection string |
| M2 | Backend deployment (Fly.io) | Deferred by owner ("hosting later"); deploy workflow deleted; configs exist (`Dockerfile`, `fly.toml`) |
| M3 | Android APK rebuild against public backend | Not started |
| M4 | Play Store submission | Not started; needs $25 developer account + identity verification |
| M5 | Post-launch stabilization & feature work | Not started |

## Completed this session (2026-11-10)

1. ✅ Discovery audit; identified `~/Desktop/KwizBoz Andriod` as the
   authoritative superset; migrated repo (history + branches) to
   `/media/stephen/FILES/My Projects/KwizBox`; gitignored essentials copied
   and md5-verified; NTFS mitigations applied.
2. ✅ Governance/documentation system established (commit `70bbd75`):
   AGENTS/STATUS/HANDOFF/CHANGELOG/CONTRIBUTING + `docs/01`–`07` tree +
   ADR-001…005 + traceability matrix.
3. ✅ **Initialization report approved by owner** (five decisions recorded).
4. ✅ **PR #2 QA**: 180/180 structurally valid (answer letters ↔ indices, 4
   distinct options, explanations, B4–B9 × Math/Science/Computing × 60);
   0 intra-batch duplicates; **0 of 180 already in the live DB**; 12-question
   sample content review passed.
5. ✅ **PR #2 merged** locally as `40e155d` (clean 'ort' merge, no conflicts).
6. ✅ **180 questions imported into the live DB**: 7,710 → **7,890** via new
   `scripts/import_pr2_180.py` (idempotent, normalized-text duplicate guard);
   pre-import backup taken + md5 recorded; post-import spot-check passed.
7. ✅ **BUG-007 privacy cleanup planned** (plan only, per owner): Option C —
   full history purge via `git-filter-repo` + credential rotation, documented
   in `docs/02-architecture/SECURITY_ARCHITECTURE.md`; execution deferred until
   push authorization + explicit approval. Prevention in place: `.gitignore`
   excludes `backend/trivia.db.bak_*`.
8. ✅ All documentation synchronized to the new reality (7,890 questions,
   PR #2 merge, BUG-007 plan, evidence log, changelog, project log).
9. ✅ **Pushed to GitHub** (owner-authorized): 9 commits fast-forward
   `9077758..e0366a9`; no secrets/DB files in the pushed set (verified
   pre-push); PR #2 auto-marked Merged on GitHub.
10. ✅ **Diagnosed and fixed the first-ever CI failures** (both latent
    workflow bugs, not PR #2 regressions): gitleaks download URL used a
    nonexistent `linux_amd64` asset (→ `linux_x64`); smoke job lacked
    `ADMIN_PASSWORD` so `seed_super_admin()` exited the backend at startup
    (→ throwaway value added). Also upgraded the secret-scan checkout to
    `fetch-depth: 0` — the default shallow clone would have scanned only the
    latest commit. Local full-history gitleaks scan first confirmed the
    pushed history is clean (52 commits, 0 leaks).
11. ✅ **Gated Fly Deploy to manual-only** (`workflow_dispatch`) per the
    owner's hosting deferral; verified pushes no longer trigger it.
12. ✅ **BUG-007 purge EXECUTED** (owner: "remove password from public"):
    pre-flight scan found 5 sensitive paths (not just the 1 documented —
    including a 50 MB tarball holding the **live JWT secret**, invisible to
    gitleaks as a compressed binary); safety bundle taken; all 6 branches
    rewritten with `git-filter-repo`; force-pushed; verified 0 commits touch
    any purged path (locally and via the GitHub API); **live `JWT_SECRET`
    rotated** (old value public since ~2026-10-08).
13. ✅ **Fly Deploy workflow deleted** (owner: "delete the deployment not
    working") — it never worked and hosting is deferred; deployment configs
    kept for M2.

## Outstanding tasks (all gated on owner decisions)

- [ ] **GitHub-side residue cleanup (BUG-007 follow-up)** — `refs/pull/1/head`
      still pins the old lineage, so the DB backup + tarball remain
      downloadable at old SHAs. Fix: GitHub Support request (draft in
      SESSION_HANDOFF.md; old SHAs in the off-repo info file) or delete +
      recreate the repo. The rotated JWT secret already defangs the tarball
      leak; remaining residue is bcrypt hashes without contact PII.
- [ ] **Reset the 4 admin-account passwords** in the live DB (their hashes
      were public in the purged DBs; the live DB may still use the same
      passwords). Needs M1 runtime or a direct DB edit — ask the owner for a
      new password first.
- [ ] **M1 start** — deferred by owner. When authorized: regenerate dev
      environment (`backend/venv`, `frontend/node_modules`), run local smoke
      tests to prove relocation + import broke nothing, then Supabase
      migration when the connection string arrives.
- [ ] M1 blocker: obtain Supabase connection string (owner action:
      Supabase → Settings ⚙️ → Database → Connection string → URI, port 5432).
- [ ] Decide stale-copy handling (~6 legacy copies; nothing touched). Note:
      the frozen `~/Desktop/KwizBoz Andriod` copy contains the PRE-PURGE
      history — keep private, never republish.
- [ ] App-level tests of the 180 imported questions — none run yet (no runtime
      environment exists; DB-level verification only). First task when M1 env
      setup is authorized.
- [ ] (Optional, cosmetic) GitHub repo description is stale ("3,230+
      questions… 15+ subjects") — owner can update it in repo Settings. The
      failed Fly Deploy run also lingers in the Actions tab; deletable via
      the GitHub UI.

## Known bugs / issues (see `docs/05-testing/BUG_TRACKER.md`)

- **BUG-007: RESOLVED 2026-11-10** — sensitive history purged (5 paths, all
  branches force-pushed), JWT secret rotated. Open follow-ups: GitHub
  residue cleanup + admin password reset (see outstanding tasks).
- Password reset flow retired as a documented dead-end (P0-3, commit `de496c2`);
  `security_question` columns remain in the schema.
- `bcrypt` must stay pinned at 4.0.1 (passlib incompatibility).
- No KVM: emulator TCG only; Android 14 WebView crashes (use Android 11 AVD).
- Legacy stale copies of the project exist on this machine (see PROJECT_DISCOVERY).

## Technical blockers

- **Supabase connection string** — the single external blocker for the Postgres
  migration (M1). Everything downstream (deploy, APK, Play Store) waits on it.

## Pending decisions (owner)

1. GitHub residue cleanup: support ticket (draft ready) vs delete-and-
   recreate the repo vs accept the residue (JWT already rotated).
2. Reset the 4 admin passwords (provide a new admin password, or defer).
3. Start M1 (dev environment + Supabase migration prep).
4. Stale-copy handling (~6 legacy copies; archival recommended).
5. When to start hosting/M2 (workflow deleted; configs kept).

## Next recommended actions

1. Owner files the GitHub Support request (or picks another residue option) —
   draft message in SESSION_HANDOFF.md; old SHAs in
   `/media/stephen/FILES/KwizBox-prepurge-info-20261110.txt`.
2. Owner provides a new admin password → reset the 4 admin hashes in the live
   DB (or defer to M1).
3. When M1 is authorized: environment setup per
   `docs/06-deployment/ENVIRONMENT_SETUP.md`, run `smoke-auth.mjs` +
   `route-smoke.mjs` + a quiz-pack spot check (verify PR #2 questions are
   served), record in TEST_RESULTS; then migration when the URI arrives.
