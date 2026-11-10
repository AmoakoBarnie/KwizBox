# PROJECT_STATUS.md

> Snapshot of where the project is. Updated at the end of every working session.
> Last updated: 2026-11-10 (post push + CI repair)

## Current phase

**Initialization COMPLETE & APPROVED. PR #2 merged AND pushed. CI green. Hosting deferred.**
The owner approved the initialization report on 2026-11-10, directed the PR #2
review + merge (done, pushed), authorized the push to GitHub (done — 11
commits total, fast-forward, no force), and deferred hosting work ("we will
work on the hosting later" → Fly deploy workflow gated to manual-only). M1
remains deferred ("let's wait"). **No new work should start without the
owner's go-ahead.**

## Repository state (verified 2026-11-10)

- **Location:** `/media/stephen/FILES/My Projects/KwizBox` (authoritative working copy)
- **Remote:** `github.com/AmoakoBarnie/KwizBox` — local `main` **in sync** with
  `origin/main` at `a3a32b2` (9 commits pushed `9077758..e0366a9`, then 2
  CI-repair commits `b2dd269` + `a3a32b2`). Fast-forward only; no force-push
  has ever been used. Working tree: clean.
- **CI: green** (run #2 on `a3a32b2` — frontend build, backend smoke test,
  gitleaks full-history scan all pass). Run #1 failed on two latent workflow
  bugs, fixed in `b2dd269` (see `docs/05-testing/TEST_RESULTS.md`).
- **Fly Deploy: gated manual-only** (`workflow_dispatch`) per owner's hosting
  deferral — pushes trigger no deploy; no deployment has ever happened (the
  one run failed at auth: `FLY_API_TOKEN` was never configured).
- PR #2: **closed as Merged on GitHub** (auto-recognized when `40e155d` landed).
- `backend/trivia.db`: **7,890 questions** (7,710 + 180 from PR #2). Pre-import
  backup taken and md5-verified (`trivia.db.bak_20261110_110311_pre_pr2`,
  gitignored).

## Milestones

| ID | Milestone | Status |
|---|---|---|
| M0 | Project initialization & governance | ✅ Done & **approved** 2026-11-10 |
| M0.5 | PR #2 merge + question import | ✅ Done 2026-11-10 (merged, imported, **pushed**; CI green) |
| M1 | SQLite → Postgres (Supabase) migration | ⏸ Deferred by owner ("let's wait"); also blocked on Supabase connection string |
| M2 | Backend deployment (Fly.io) | Deferred by owner ("hosting later"); deploy workflow gated manual-only; configs exist (`Dockerfile`, `fly.toml`) |
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

## Outstanding tasks (all gated on owner decisions)

- [ ] **BUG-007 execution** — needs a NEW push window (the first push is done)
      + the owner's explicit approval of the history rewrite (force-push).
      Plan of record ready in `docs/02-architecture/SECURITY_ARCHITECTURE.md`.
      Note: GitHub retains old commit SHAs via API/PR references after a
      rewrite; the plan includes the follow-ups (support request / repo
      re-check) for that.
- [ ] **M1 start** — deferred by owner. When authorized: regenerate dev
      environment (`backend/venv`, `frontend/node_modules`), run local smoke
      tests to prove relocation + import broke nothing, then Supabase
      migration when the connection string arrives.
- [ ] M1 blocker: obtain Supabase connection string (owner action:
      Supabase → Settings ⚙️ → Database → Connection string → URI, port 5432).
- [ ] Decide stale-copy handling (~6 legacy copies; nothing touched).
- [ ] App-level tests of the 180 imported questions — none run yet (no runtime
      environment exists; DB-level verification only). First task when M1 env
      setup is authorized.
- [ ] (Optional, cosmetic) GitHub repo description is stale ("3,230+
      questions… 15+ subjects") — owner can update it in repo Settings.

## Known bugs / issues (see `docs/05-testing/BUG_TRACKER.md`)

- **BUG-007** (P2): tracked legacy DB backup `backend/trivia.db.bak_20260819_081244`
  public on GitHub (22 users, 19 bcrypt hashes, school codes; **no
  emails/phones/names** — verified). Remediation planned, not executed.
- Password reset flow retired as a documented dead-end (P0-3, commit `de496c2`);
  `security_question` columns remain in the schema.
- `bcrypt` must stay pinned at 4.0.1 (passlib incompatibility).
- No KVM: emulator TCG only; Android 14 WebView crashes (use Android 11 AVD).
- Legacy stale copies of the project exist on this machine (see PROJECT_DISCOVERY).

## Technical blockers

- **Supabase connection string** — the single external blocker for the Postgres
  migration (M1). Everything downstream (deploy, APK, Play Store) waits on it.

## Pending decisions (owner)

1. Execute the BUG-007 history purge (force-push — needs explicit approval
   and its own push window).
2. Start M1 (dev environment + Supabase migration prep).
3. Stale-copy handling (~6 legacy copies; archival recommended).
4. When to start hosting/M2 (deploy workflow is ready but manual-only).

## Next recommended actions

1. Owner decides BUG-007 execution + M1 start (items above).
2. If BUG-007 is approved: follow Option C in
   `docs/02-architecture/SECURITY_ARCHITECTURE.md` exactly (bundle backup →
   `git-filter-repo` → force-push all branches in one window → credential
   rotations → GitHub-side residue check).
3. When M1 is authorized: environment setup per
   `docs/06-deployment/ENVIRONMENT_SETUP.md`, run `smoke-auth.mjs` +
   `route-smoke.mjs` + a quiz-pack spot check (verify PR #2 questions are
   served), record in TEST_RESULTS; then migration when the URI arrives.
