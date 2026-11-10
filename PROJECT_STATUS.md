# PROJECT_STATUS.md

> Snapshot of where the project is. Updated at the end of every working session.
> Last updated: 2026-11-10 (post PR #2 merge)

## Current phase

**Initialization COMPLETE & APPROVED. PR #2 merged. Awaiting owner go-aheads.**
The owner approved the initialization report on 2026-11-10, directed a full
review + merge of PR #2 (done), a privacy-cleanup **plan** for BUG-007 (written,
not executed), deferred pushing to GitHub ("not yet"), and deferred starting
M1 ("let's wait"). **No new work should start without the owner's go-ahead.**

## Repository state (verified 2026-11-10)

- **Location:** `/media/stephen/FILES/My Projects/KwizBox` (authoritative working copy)
- **Remote:** `github.com/AmoakoBarnie/KwizBox` — local `main` is **8 commits
  ahead**, 0 behind (4 release-hardening + relocation capture `cf1d9be` +
  governance `70bbd75` + PR #2 merge `40e155d` + this session's import/docs
  commit). **Not pushed — owner said "not yet" (standing decision).**
- Working tree: clean after this session's commit.
- PR #2 **merged locally** (`40e155d`, clean 'ort' merge). GitHub still shows
  the PR as open until the merge commit is pushed; closing it on GitHub is a
  post-push step.
- `backend/trivia.db`: **7,890 questions** (7,710 + 180 from PR #2). Pre-import
  backup taken and md5-verified (`trivia.db.bak_20261110_110311_pre_pr2`,
  gitignored).

## Milestones

| ID | Milestone | Status |
|---|---|---|
| M0 | Project initialization & governance | ✅ Done & **approved** 2026-11-10 |
| M0.5 | PR #2 merge + question import | ✅ Done 2026-11-10 (local only; unpushed) |
| M1 | SQLite → Postgres (Supabase) migration | ⏸ Deferred by owner ("let's wait"); also blocked on Supabase connection string |
| M2 | Backend deployment (Fly.io) | Not started; configs exist (`Dockerfile`, `fly.toml`, workflow) |
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

## Outstanding tasks (all gated on owner decisions)

- [ ] **Push the 8 local commits to GitHub** — owner said "not yet"; fastest
      path is `git push origin main` (fast-forward) once authorized. The
      BUG-007 purge (if executed) should happen in that same window.
- [ ] **BUG-007 execution** — needs push authorization + explicit approval of
      the history rewrite (force-push). Plan of record ready.
- [ ] Close PR #2 on GitHub after push (it is merged locally already).
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

1. Push the 8 local commits to GitHub (standing: "not yet").
2. Approve executing the BUG-007 history purge during the push window.
3. Start M1 (dev environment + Supabase migration prep).
4. Stale-copy handling (~6 legacy copies; archival recommended).

## Next recommended actions

1. Owner decides push + BUG-007 execution + M1 start (items above).
2. When push is authorized: optionally execute the BUG-007 purge first
   (bundle backup → filter-repo → force-push all branches in one window),
   then push; close PR #2 on GitHub.
3. When M1 is authorized: environment setup per
   `docs/06-deployment/ENVIRONMENT_SETUP.md`, run `smoke-auth.mjs` +
   `route-smoke.mjs` + a quiz-pack spot check (verify PR #2 questions are
   served), record in TEST_RESULTS; then migration when the URI arrives.
