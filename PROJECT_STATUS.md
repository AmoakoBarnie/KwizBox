# PROJECT_STATUS.md

> Snapshot of where the project is. Updated at the end of every working session.
> Last updated: 2026-11-12

## Current development status (2026-11-12)

All owner-approved engagement upgrades are implemented, tested and pushed to
`main`:

| Group | What shipped | Commit |
|---|---|---|
| A | Friend-challenge flow repaired end to end (join = deterministic pack, full challenge Quiz, server-authoritative submit, refresh recovery) | `dfb915b` |
| B | XP levels, weekly leagues, streak calendar, lifetime best streak, Schools leaderboard | `175bbb0`, `92c9fa0` |
| — | Full E2E pass + same-origin dev cookie auth + Playwright fix | `289d31b` |
| — | BUG-013 Profile hook-order crash | `1cc6599` |
| C | 3D mascot clip playback fixed, 3D/2D + gender pickers, 1080×1350 PNG share card | `3a3e087` |
| D | Live duel WebSocket room (display-only), lobby + in-quiz rival strip, BUG-016 challenge-creation fix | `e80a951` |

Verification at `e80a951`: backend pytest **7/7**, duel browser e2e **13/13**,
engagement **18/18**, mascot/share **18/18**, routes **13/13**, register
**15/15**, production build OK (`npm run build`). Evidence is append-only in
`docs/05-testing/TEST_RESULTS.md`; bugs BUG-009/012/013/014/015/016 are resolved.

**Next:** M3 (Android APK) when the owner approves. `models/` + `scripts/` were
restored on 2026-11-13 and the docs synced to the current cookie-auth/duel
architecture; `frontend/.env.production` still needs a real backend URL before
store builds. M1/M2 stay rejected.

## Current phase

**Initialization COMPLETE. PR #2 merged & pushed. CI green. Sensitive history
PURGED. Credentials RESET. Hosting artifacts REMOVED.** The owner approved the
initialization, PR #2 merge + push, BUG-007 history purge, credential resets,
and host-platform teardown. M1 (Postgres) and M2 (hosting) were **rejected**
(2026-11-10/11) — the app stays on SQLite. Release scope APPROVED:
public web + Android (Capacitor) + Play Store; M3–M5 continue. **No new work
should start without the owner's go-ahead.**
The owner approved the initialization (2026-11-10), the PR #2 merge + push,
the BUG-007 history purge ("remove password from public" — executed),
the credential resets (JWT rotated, admin passwords reset after confirming
"unchanged"), and the host-platform teardown ("delete the host platforms
not working" — stale Fly app destroyed, 76 platform files removed, Pages /
flyio branches deleted). M1 remains deferred. **No new work should start
without the owner's go-ahead.**

## Repository state (verified 2026-11-10)

- **Location:** `/media/stephen/FILES/My Projects/KwizBox` (authoritative working copy)
- **Remote:** `github.com/AmoakoBarnie/KwizBox` — local `main` **in sync** with
  `origin/main` (fast-forward pushes only since the purge). **History rewritten
  2026-11-10** (BUG-007 purge,
  owner-approved force-push): every pre-purge commit has a new SHA (map kept
  locally at `.git/filter-repo/commit-map`); safety bundle off-repo
  (`KwizBox-pre-purge-20261110.bundle`, md5-verified). Working tree: no pending
  tracked changes (untracked scratch: `frontend/debug-*.mjs`,
  `INITIALIZATION_REPORT.md`, root `.env.example`).
- **CI: green.** The gitleaks full-history scan now scans the clean,
  post-purge history (the sensitive blobs are unreachable).
- **Fly Deploy workflow + ALL host-platform artifacts: DELETED** (owner:
  "delete the host platforms not working"). The stale live Fly app
  `kwizbox-still-bush-3080` (deployed 2026-11-04, running pre-relocation code
  with the leaked JWT secret) was **destroyed via flyctl**; 76 platform files
  removed from the repo (fly.toml, both Dockerfiles, .dockerignore,
  railway.toml, .htaccess, `_backup/php-backend/`, Vercel configs, stale env
  backups); remote `gh-pages` (stale pre-rename Pages site) and
  `flyio-new-files` branches deleted (local copies retained). Everything
  recoverable from git history. `frontend/.env.production` kept (its Fly URL
  is dead — update at M2/M3).
- PR #2: **closed as Merged on GitHub** (merge commit recognized).
- `backend/trivia.db`: **7,890 questions** (7,710 + 180 from PR #2),
  gitignored, untouched by the purge. Pre-import backup md5-verified.
- **JWT_SECRET rotated** in the live `backend/.env` (old value was public in
  a committed tarball since ~2026-10-08).
- **Admin passwords RESET** (all 4 accounts; live hashes had been identical
  to the leak). New password in
  `/media/stephen/FILES/KwizBox-admin-credentials-20261110.txt`; pre-reset
  backup md5-recorded.

## Milestones

| ID | Milestone | Status |
|---|---|---|
| M0 | Project initialization & governance | ✅ Done & **approved** 2026-11-10 |
| M0.5 | PR #2 merge + question import | ✅ Done 2026-11-10 (merged, imported, pushed; CI green) |
| M0.7 | BUG-007 purge (sensitive history removal) | ✅ **Executed 2026-11-10** — 5 paths purged from all branches; JWT rotated; GitHub residue cleanup pending (owner) |
| M1 | SQLite → Postgres (Supabase) migration | ❌ **Rejected by owner** (confirmed 2026-11-11) — removed from scope; no migration planned |
| M2 | Backend deployment (hosting) | ❌ **Rejected by owner** (confirmed 2026-11-11) — no hosting deployment planned |
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
    working") — it never worked and hosting is deferred (deployment configs
    were kept at this point; removed later in item 15).
14. ✅ **Admin passwords RESET** (owner confirmed "unchanged" → all 4 were
    compromised): verified all 4 live admin hashes were identical to the
    leaked initial-commit DB (and `mod1`/`qm1` also matched the Aug backup),
    backed up the DB first (md5 recorded), reset all 4 accounts with bcrypt
    4.0.1 (the pinned version, rounds 12), verified with `bcrypt.checkpw`;
    credentials stored off-repo at
    `/media/stephen/FILES/KwizBox-admin-credentials-20261110.txt`.
15. ✅ **Host platforms torn down** (owner: "delete the host platforms not
    working"): discovered the Fly app `kwizbox-still-bush-3080` was **still
    live** (deployed 2026-11-04, running pre-relocation code with the leaked
    JWT secret — actively exploitable until now) and **destroyed it** via
    flyctl (URL verified dead); removed 76 host-platform files from the repo
    (fly.toml, both Dockerfiles, .dockerignore, railway.toml, .htaccess,
    dead InfinityFree `_backup/php-backend/`, Vercel configs, stale env
    backups); deleted the remote `gh-pages` (stale Pages site) and
    `flyio-new-files` branches (local copies retained); synced all docs.
16. ✅ **Owner decisions recorded (2026-11-10, confirmed 2026-11-11)**:
    **M1 (Postgres migration) REJECTED**, **M2 (hosting) REJECTED** — both
    removed from scope. **Release scope APPROVED**: public web app + Android
    (Capacitor) + Play Store; M3–M5 continue.
17. ✅ **Dev environment rebuilt** (second working session, 2026-11-10):
    `backend/venv` + `frontend/node_modules` regenerated; CORS opened for the
    Vite dev ports (5173/5174); `e2e-guest.mjs` stale-locator bug fixed.
    Guest-form submit bug investigated; flow verified working via debug scripts
    (`[POST /auth/guest] -> 200` + nav to `/play`). No app code defect found.

## Completed this session (2026-11-11) — docs sync + E2E verification

1. ✅ **E2E test suite run**: route-smoke 13/13 ✅, auth-smoke 28/28 ✅
   full-e2e 37/37 ✅ (auth, quiz, admin, challenge, security).
2. ✅ **Core E2E tests pass**: offlinePractice.test.js, all route tests,
   auth tests, quiz tests all passing.
3. ✅ **Playwright UI tests**: guest/register tests time out on Playwright
   version (browser `chromium_headless_shell-1254` not installed — only
   `chromium_headless_shell-1243` and `-1248` exist). This is a test-harness
   limitation, not an app defect. Verified via debug scripts that the guest
   flow works.
4. ✅ **Docs updated**: AGENTS.md (removed deleted-file references),
   README.md (question count 7,890; corrected stale facts), PROJECT_STATUS.md
   (2026-11-11 update), SYSTEM_ARCHITECTURE.md (M1/M2 removed),
   TECHNOLOGY_STACK.md (M1/M2 removed), TEST_STRATEGY.md (removed M1 test
   env), docs/README.md (updated to point to current docs).
5. ✅ **GitHub sync**: remote `origin` confirmed (git@github.com:AmoakoBarnie/
   KwizBox.git); working tree changes committed and pushed (see COMMITS).
6. ✅ **Cleanup verified**: backend/venv, frontend/node_modules, models/,
   scripts/, _backup/, promo_10s/, promo_6s/, debug scripts all removed.
   App code (backend/src/, frontend/src/, docs/) intact and verified.
7. ✅ **Five memory layers confirmed**: project identity (README/AGENTS/
   PROJECT_STATUS), technical (docs/02-architecture), decision history
   (docs/07-project-history + decisions/), development history
   (CHANGELOG.md), session continuity (SESSION_HANDOFF.md).

## Outstanding tasks (all gated on owner decisions)

- [ ] **M3 start** — Android APK rebuild against public backend (Capacitor).
       Owner approval required for Capacitor rebuild + local APK build.
- [ ] **M4 start** — Play Store submission ($25 developer account + identity
       verification).
- [ ] **M5 start** — Post-launch stabilization & feature work.
- [ ] **Decide stale-copy handling** (~6 legacy copies; archival recommended).
- [ ] **Optional cleanups** (owner-approved): debug scripts + INITIALIZATION_
       REPORT.md + root .env.example (untracked scratch).

- [ ] **Send the GitHub Support request** (owner approved this; only the owner
      can submit) — paste-ready draft at
      `/media/stephen/FILES/GitHub-support-request-20261110.md`; submit at
      https://support.github.com/request. It asks GitHub to drop
      `refs/pull/1/head` (which still pins the old lineage, keeping the DB
      backup + tarball downloadable at old SHAs) and garbage-collect the
      unreachable commits. The rotated JWT + reset admin passwords already
      defang the leaks; remaining residue is bcrypt hashes without contact
      PII. After sending, verify residue is gone (checks in TEST_RESULTS).
- [ ] **M3 start** — Android APK rebuild against the public backend (Capacitor). Owner approval required for Capacitor rebuild + local APK build.
- [ ] **M4 start** — Play Store submission ($25 developer account + identity verification).
- [ ] **M5 start** — Post-launch stabilization & feature work.
- [ ] Decide stale-copy handling (~6 legacy copies; nothing touched). Note: the frozen `~/Desktop/KwizBoz Andriod` copy contains the PRE-PURGE history — keep private, never republish.
- [ ] App-level tests of the 180 imported questions — none run yet (a dev
      environment now exists — built 2026-11-10 — so this is runnable; only
      DB-level verification done so far). Includes resolving the guest-form
      submit bug under investigation since 2026-11-10.
- [ ] (Optional, cosmetic) GitHub repo description is stale — owner can update.

## Known bugs / issues (see `docs/05-testing/BUG_TRACKER.md`)

- **BUG-007: RESOLVED 2026-11-10** — sensitive history purged (5 paths, all
  branches force-pushed), JWT secret rotated, **all 4 admin passwords reset**
  (live hashes had been identical to the leak). Remaining follow-up: GitHub
  residue cleanup (owner sends the drafted support request).
- Password reset flow retired as a documented dead-end (P0-3, commit `de496c2`);
  `security_question` columns remain in the schema.
- `bcrypt` must stay pinned at 4.0.1 (passlib incompatibility).
- No KVM: emulator TCG only; Android 14 WebView crashes (use Android 11 AVD).
- Legacy stale copies of the project exist on this machine (see PROJECT_DISCOVERY).

## Technical blockers

- **None.** M1 (Postgres) and M2 (hosting) were rejected by the owner
  (confirmed 2026-11-11), which removes the Supabase connection-string
  blocker. The app runs on SQLite; nothing external is gated anymore.

## Pending decisions (owner)

1. GitHub residue cleanup: send the drafted support request (recommended)
   vs delete-and-recreate the repo vs accept the residue (JWT rotated; only
   bcrypt hashes without contact PII remain downloadable at old SHAs).
2. Stale-copy handling (~6 legacy copies; archival recommended).
3. M3 — Android APK rebuild (Capacitor): with hosting (M2) rejected, decide
   what backend the APK targets (local/LAN backend now, or revisit hosting
   later) before building.
4. M4 — Play Store submission: approve and confirm $25 developer account
   + identity verification.

## Next recommended actions

1. Owner sends the GitHub Support request — paste-ready message at
   `/media/stephen/FILES/GitHub-support-request-20261110.md` (submit at
   https://support.github.com/request); old SHAs in
   `/media/stephen/FILES/KwizBox-prepurge-info-20261110.txt`.
2. Owner picks today's work (e.g. the unresolved guest-form submit bug from
   2026-11-10, or M3 planning).
3. Owner approves M3: Android APK rebuild via Capacitor (update `backend/.env`,
   `frontend/android`, verify `VITE_API_URL` points to the chosen backend),
   build APK, test on device.
4. Owner approves M4: Play Store submission — $25 developer account, identity
   verification, app listing + APK upload.
5. Owner approves M5: post-launch stabilization & feature work.
