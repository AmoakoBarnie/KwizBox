# BACKUP_AND_RECOVERY.md

> Part of `docs/06-deployment/`. What must never be lost, and how to restore it.
> The single most important operational document in this repo.

## The crown jewels

| Asset | Location | Why |
|---|---|---|
| **Live production data** | `/data/trivia.db` on Fly volume `kwizbox_data` (app `kwizbox-gh`) | Users, sessions, progress, audit logs + 7,890 questions; volume snapshots are the first line of recovery |
| **Question bank + live dev data** | `backend/trivia.db` (gitignored) | Hand-crafted over months; NOT in GitHub |
| Git history | local repo + `github.com/AmoakoBarnie/KwizBox` | Only remote copy of the project |
| Secrets | `backend/.env`, `frontend/.env`, Fly/GitHub secret stores | Cannot be recovered if lost — must be rotated |
| Android signing keystore | (to be created in M3 — not yet on disk) | Losing it permanently breaks Play Store updates |
| 3D mascot source library | `models/` (tracked in git — safe) | Regenerable only with great effort |

## Current backup state (2026-11-14)

- **Production volume:** Fly scheduled snapshots are enabled for
  `kwizbox_data` (5 retained). Create a manual snapshot before any risky
  operation: `flyctl volumes snapshots create <volume-id> --app kwizbox-gh`.
- **Production logical copy:** no automated off-platform export yet. Follow the
  sftp procedure below before destructive work and record the md5.
- **Remote:** GitHub has all pushed history (post-purge rewrite, 2026-11-10;
  see SECURITY_ARCHITECTURE.md). Gitignored files are not in GitHub.
- **Frozen snapshot:** `~/Desktop/KwizBoz Andriod` — a complete pre-relocation
  copy including `trivia.db`, `.env` files, venv, node_modules. Treat as a
  one-time safety net; it will age. **Note:** it also contains the pre-purge
  Git history (with the DB backups) — keep private, never republish.
- **Pre-purge history bundle** (contains the sensitive files by design —
  keep OFF-repo, never upload):
  `/media/stephen/FILES/KwizBox-pre-purge-20261110.bundle`
  (85 MB, md5 `7f9f31d5e242430fe10f0f6479f553cd`, complete pre-rewrite
  history of all branches, 2026-11-10). Companion info file:
  `KwizBox-prepurge-info-20261110.txt` (pre-purge SHAs, purge scope,
  exposed-secret record for the GitHub Support request).

## Backup procedures

### A. Before any migration / seed / destructive script (MANDATORY)

Local dev DB:

```bash
cd backend
cp trivia.db "trivia.db.bak_$(date +%Y%m%d_%H%M%S)"
md5sum trivia.db "trivia.db.bak_$(date +%Y%m%d_%H%M%S)"   # record both hashes
```

Production volume (Fly app `kwizbox-gh`):

```bash
flyctl volumes snapshots create <volume-id> --app kwizbox-gh
flyctl ssh console --app kwizbox-gh
# inside the Machine:
python3 - <<'PY'
import sqlite3
src = sqlite3.connect('/data/trivia.db')
dst = sqlite3.connect('/data/trivia-backup.db')
src.backup(dst)
dst.close(); src.close()
PY
exit
flyctl ssh sftp get /data/trivia-backup.db ./trivia-backup.db --app kwizbox-gh
md5sum ./trivia-backup.db
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
| Production `trivia.db` corrupted/deleted | restore the latest Fly volume snapshot or the md5-verified sftp copy; if the file is missing the entrypoint will re-seed questions + admin, but all user data is lost |
| Local `trivia.db` corrupted/deleted | restore latest `trivia.db.bak_*` (or the frozen snapshot's copy); verify question count |
| Repo lost | `git clone git@github.com:AmoakoBarnie/KwizBox.git` + copy `trivia.db`, `.env` files back + rebuild venv/node_modules |
| JWT secret lost | rotate: set new `JWT_SECRET` (all tokens invalidate — users log in again); document in CHANGELOG |
| Bad Fly release | `flyctl releases` + redeploy the previous image; the volume is unaffected |
| Bad commit on main | `git revert <sha>` — never force-push shared history |
| Play Store keystore lost (post-M4) | use Play App Signing + upload-key reset procedure |

## Recommended improvements

1. Automated daily logical SQLite export from the Fly Machine to off-platform
   storage (volume snapshots are not a substitute for an off-site copy).
2. Monthly `git bundle` to `/media/stephen/FILES/KwizBox-backups/`.
3. Keep the frozen snapshot for 90 days, then archive decision (owner).
