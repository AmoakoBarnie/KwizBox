# BACKUP_AND_RECOVERY.md

> Part of `docs/06-deployment/`. What must never be lost, and how to restore it.
> The single most important operational document in this repo.

## The crown jewels

| Asset | Location | Why |
|---|---|---|
| **Question bank + live user data** | `backend/trivia.db` (7,710 questions, 38 users, 141 sessions — 2026-11-10) | Gitignored; NOT in GitHub; hand-crafted over months |
| Git history | local repo + `github.com/AmoakoBarnie/KwizBox` | Only remote copy of the project |
| Secrets | `backend/.env`, `frontend/.env`, Fly/GitHub secret stores | Cannot be recovered if lost — must be rotated |
| Android signing keystore | (to be created in M3 — not yet on disk) | Losing it permanently breaks Play Store updates |
| 3D mascot source library | `models/` (tracked in git — safe) | Regenerable only with great effort |

## Current backup state (2026-11-10)

- **Remote:** GitHub has everything except the 5 newest commits (local-only
  until pushed — owner approval pending) and except gitignored files.
- **Frozen snapshot:** `~/Desktop/KwizBoz Andriod` — a complete pre-relocation
  copy including `trivia.db`, `.env` files, venv, node_modules. Treat as a
  one-time safety net; it will age.
- **No automated backups exist yet.**

## Backup procedures

### A. Before any migration / seed / destructive script (MANDATORY)

```bash
cd backend
cp trivia.db "trivia.db.bak_$(date +%Y%m%d_%H%M%S)"
md5sum trivia.db "trivia.db.bak_$(date +%Y%m%d_%H%M%S)"   # record both hashes
```

Rule: the backup must exist **and its md5 be recorded in TEST_RESULTS** before
the risky command runs.

### B. Git bundle (whole-repo single-file backup, good for offline drives)

```bash
cd "/media/stephen/FILES/My Projects/KwizBox"
git bundle create "/media/stephen/FILES/KwizBox-backups/kwizbox-$(date +%Y%m%d).bundle" --all
```

Restore: `git clone kwizbox-YYYYMMDD.bundle KwizBox` (full history; remember to
re-copy `trivia.db` and `.env` files — bundles don't contain ignored files).

### C. Push to GitHub (the primary off-machine backup)

```bash
git push origin main          # plus feature branches as needed
```

Everything tracked is then safe off-machine. This is why pushing the 5
outstanding commits matters.

## Recovery procedures

| Scenario | Recovery |
|---|---|
| `trivia.db` corrupted/deleted | restore latest `trivia.db.bak_*` (or the frozen snapshot's copy); verify question count = 7,710 |
| Repo lost | `git clone git@github.com:AmoakoBarnie/KwizBox.git` + copy `trivia.db`, `.env` files back + rebuild venv/node_modules |
| JWT secret lost | rotate: set new `JWT_SECRET` (all tokens invalidate — users log in again); document in CHANGELOG |
| Supabase DB damaged (post-M1) | Supabase PITR/backups; SQLite file remains the pre-migration fallback until M5 |
| Bad commit on main | `git revert <sha>` — never force-push shared history |
| Play Store keystore lost (post-M4) | use Play App Signing + upload-key reset procedure |

## Recommended improvements (post-M2)

1. Scheduled `trivia.db` backups (daily while SQLite, replaced by Supabase's
   managed backups after M1).
2. Monthly `git bundle` to `/media/stephen/FILES/KwizBox-backups/`.
3. Keep the frozen snapshot for 90 days, then archive decision (owner).
