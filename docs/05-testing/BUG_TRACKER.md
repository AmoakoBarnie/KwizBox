# BUG_TRACKER.md

> Part of `docs/05-testing/`. Known bugs, limitations, and housekeeping items.
> Format: ID · severity · status · description · evidence/fix path.

## Open

| ID | Sev | Status | Issue |
|---|---|---|---|
| BUG-007 | P2 | **Resolved 2026-11-10** (history purged + credentials rotated) | Tracked legacy DB backup `backend/trivia.db.bak_20260819_081244` was public on GitHub (22 users incl. 19 bcrypt password hashes + 4 admin hashes + school codes; **no emails/phones/names**). **Resolved:** full history purge via `git-filter-repo` executed 2026-11-10 with owner approval — scope expanded at pre-flight to 5 paths (2 additional DB copies in `_backup/`, a 50 MB `backend_deploy.tar.gz` that contained the **live `JWT_SECRET`**, and an empty root `trivia.db`); all 6 branches force-pushed rewritten; `JWT_SECRET` rotated (old value public since ~2026-10-08); the stale Fly deployment that still ran the leaked secret was **destroyed**; **all 4 admin account passwords reset** (live hashes had been identical to the leak — verified before reset). Residue: `refs/pull/1/head` still pins old commits on GitHub — support request drafted, owner to send (`/media/stephen/FILES/GitHub-support-request-20261110.md`). Full execution record: `docs/02-architecture/SECURITY_ARCHITECTURE.md`. Prevention: `.gitignore` excludes `trivia.db.bak_*`. |
| BUG-001 | P2 | Open | Account recovery gap: password-reset flow retired (P0-3, `de496c2`) because security-question reset was weak; users who forget passwords have no recovery path. Decision needed (email-based? admin-assisted?). |
| BUG-002 | P2 | Open | JWT-in-localStorage legacy path remains alongside cookie auth; full client migration to cookie-only is pending hardening work (see SECURITY_ARCHITECTURE accepted risks). |
| BUG-003 | P3 | Open | `backend/src/models.py.bak_before_pg` tracked in git — stale backup file in source tree; remove in a `chore:` commit (harmless but confusing). |
| BUG-004 | P3 | Open | True/False question type supported by code but 0 rows exist in the live DB (README once claimed 2); decide: seed some or document as unused capability. |
| BUG-005 | P3 | Open | Frontend package name is legacy `ghana-stem-trivia` (cosmetic, affects nothing functional). |

## Constraints (not bugs — environmental facts)

| ID | Topic | Fact |
|---|---|---|
| ENV-001 | bcrypt | Pinned 4.0.1 — newer breaks passlib import (verified on this host). Upgrading requires migrating off passlib first. |
| ENV-002 | Ports | 8000 (MusicApp) and 5173 often busy — backend uses 8001; Vite auto-bumps to 5174. |
| ENV-003 | Emulator | No KVM → TCG software emulation only; Android 14 WebView crashes; use Android 11 AVD `kwizbox_a11`. |
| ENV-004 | sqlite3 CLI | Not installed on host — use `python3 -c "import sqlite3; …"`. |
| ENV-005 | NTFS | Repo on `/media/stephen/FILES` (NTFS/FUSE) — slower npm/git; git mitigations set (ADR-002). |
| ENV-006 | Old copies | ~6 stale KwizBox copies exist on this machine (see PROJECT_DISCOVERY §1) — do not touch without owner approval; `~/kwizbox-deploy` is a broken symlink. |

## Fixed (kept for the record)

| ID | Was | Fix |
|---|---|---|
| FIXED-001 | Answer key leaked via `/quiz/pack` | Closed in P0 hardening (answer-key leak) — pack schema omits `answer_index`/`explanation` |
| FIXED-002 | Disabled-login guard missing | Hardening `d17a252` |
| FIXED-003 | Cleartext HTTP allowed on Android config | Hardening `d17a252` |
| FIXED-004 | Credentials in backup files | Sanitized 2026 (roadmap Done) |
| FIXED-005 | Male mascot meshes unskinned (walk had no visible effect); female models unrigged | `models/scripts/skin_unskinned.py`, `rig_female.py` (commits `b7e3e39`, `b32e896`) |
| FIXED-006 | Hero mascots: 200 s crossings, no facing flips, hop-read-as-jump | `HeroStage.jsx` rework (commit `b32e896`) — fixed crossing time, turning, bob/lean |
