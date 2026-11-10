# PROJECT_STATUS.md

> Snapshot of where the project is. Updated at the end of every working session.
> Last updated: 2026-11-10

## Current phase

**Initialization & governance phase — COMPLETE (pending owner approval).**
No application development has started in the new repository home. The project
was relocated and the professional documentation system established. The next
phase (application development / deployment continuation) requires the owner's
explicit approval per the initialization plan.

## Repository state (verified 2026-11-10)

- **Location:** `/media/stephen/FILES/My Projects/KwizBox` (authoritative working copy)
- **Remote:** `github.com/AmoakoBarnie/KwizBox` — local `main` is **5 commits ahead**,
  0 behind (4 release-hardening commits + 1 relocation capture). **Not yet pushed —
  awaiting owner approval.**
- Working tree: clean.
- All remote branches fetched (`gh-pages`, `manus/add-180-questions-546-725`,
  `flyio-new-files`, `mascot-3d-and-models`, `feature/question-types-tf-image`).
- Open PR on GitHub: **#2 "Add 180 reviewed questions for B4–B9"** (not merged).
- `backend/trivia.db` present and checksum-verified identical to the pre-move copy.

## Milestones

| ID | Milestone | Status |
|---|---|---|
| M0 | Project initialization & governance (this session) | ✅ Done (pending approval) |
| M1 | SQLite → Postgres (Supabase) migration | ⛔ Blocked — waiting on Supabase connection string from owner |
| M2 | Backend deployment (Fly.io) | Not started; configs exist (`Dockerfile`, `fly.toml`, workflow) |
| M3 | Android APK rebuild against public backend | Not started |
| M4 | Play Store submission | Not started; needs $25 developer account + identity verification |
| M5 | Post-launch stabilization & feature work | Not started |

## Completed this session (2026-11-10)

1. ✅ Discovery audit of all KwizBox-related copies on this machine; identified
   `~/Desktop/KwizBoz Andriod` as the authoritative superset (local main 4 commits
   ahead of GitHub, plus 5 uncommitted changes).
2. ✅ Verified GitHub repo state (public, 47 commits, PR #2 open, `gh-pages` old deploy).
3. ✅ Migrated the full repository (history + branches) to
   `/media/stephen/FILES/My Projects/KwizBox`; re-pointed origin to GitHub; fixed
   `main`'s upstream tracking to `origin/main`.
4. ✅ Copied gitignored essentials a clone cannot carry: `backend/trivia.db`
   (md5-verified), `backend/.env`, `frontend/.env`.
5. ✅ Committed the 5 pre-existing loose changes as `cf1d9be` (nothing lost;
   old repo left untouched).
6. ✅ Applied NTFS mitigations (`core.fileMode=false`, `core.untrackedCache=true`);
   verified no symlinks in tree.
7. ✅ Created the governance/documentation system (see `README.md` project map).
8. ✅ Verified facts from the live database: 7,710 questions, 16 subjects, 12 class
   levels (B4–B9, S1–S3, SHS 1–3), 13 model classes, 38 users, 141 sessions.

## Outstanding tasks

- [ ] Owner approval of the initialization report (approval gate).
- [ ] Push the 5 local commits to GitHub (needs owner approval; fast-forward only).
- [ ] Decide on open PR #2 (merge the 180-question batch or close it).
- [ ] Regenerate dev environment in the new home: `backend/venv`, `frontend/node_modules`
      (deliberately NOT copied; see `docs/06-deployment/ENVIRONMENT_SETUP.md`).
- [ ] M1 blocker: obtain Supabase connection string (owner action:
      Supabase → Settings ⚙️ → Database → Connection string → URI, port 5432).
- [ ] Resolve stale-copy cleanup plan (see "Pending decisions").

## Known bugs / issues (see `docs/05-testing/BUG_TRACKER.md`)

- Password reset flow retired as a documented dead-end (P0-3, commit `de496c2`);
  `security_question` columns remain in the schema.
- `bcrypt` must stay pinned at 4.0.1 (passlib incompatibility).
- No KVM: emulator TCG only; Android 14 WebView crashes (use Android 11 AVD).
- Legacy stale copies of the project exist on this machine (see PROJECT_DISCOVERY).

## Technical blockers

- **Supabase connection string** — the single blocker for the Postgres migration
  (M1). Everything downstream (deploy, APK, Play Store) waits on it.

## Pending decisions (owner)

1. Approve this initialization report and authorize starting M1 preparation.
2. Approve pushing the 5 local commits to GitHub.
3. PR #2 disposition (merge/close).
4. What to do with the ~6 stale KwizBox copies on this machine
   (archive vs delete — archival recommended; nothing touched yet).

## Next recommended actions

1. Owner answers the four pending decisions above.
2. If M1 approved: create the dev environment in the new home, run the app locally
   against SQLite to prove the relocation broke nothing, then run
   `backend/scripts/migrate_sqlite_to_pg.py` once the connection string arrives
   (backup `trivia.db` first — see BACKUP_AND_RECOVERY).
3. Verify all 13 table row counts match after migration.
