# PROJECT_DISCOVERY.md

> Part of `docs/01-project-planning/`. The situation analysis performed on
> 2026-11-10 before professionalizing the project. Everything here was
> **verified against the machine and the repository**, not assumed.

## 1. Confirmed facts

### Application
- KwizBox: NaCCA-aligned STEM trivia for Ghanaian learners.
- Stack: React 18 + Vite PWA (Capacitor for Android) · FastAPI + SQLAlchemy 2 ·
  SQLite (live) with a proven SQLite→Postgres migration script · JWT auth with
  guest mode · 3D mascots (React Three Fiber).
- Live data (from `backend/trivia.db`, 2026-11-10): **7,710 questions** across
  16 subjects (Mathematics 3,335 · Science 1,355 · Physics 794 · Computing 664 ·
  Chemistry 302 · ICT 242 · Biology 185 · English 131 · Social Studies 128 ·
  Economics 116 · French 99 · Geography 96 · Agricultural Science 87 ·
  Government 75 · RME 71 · Elective Math 30); 12 class levels (B4–B9, S1–S3,
  SHS 1–3); question types 7,636 mcq + 74 image_mcq; 38 users; 141 quiz
  sessions; 1 challenge.
- Security posture already partially hardened: rate limiting (slowapi), security
  headers, cookie auth, no answer-key leak in `/quiz/pack`, JWT secret required
  via env (no default), gitleaks in CI, credentials previously sanitized in
  backup files.

### Repositories & copies (the scattering problem — now resolved)
| Location | Nature | Status |
|---|---|---|
| `/media/stephen/FILES/My Projects/KwizBox` | **New authoritative home** (this repo) | ✅ Live |
| `~/Desktop/KwizBoz Andriod` | Previous authoritative copy; Git repo; local main was 4 commits ahead of GitHub + 5 uncommitted changes | 🧊 Frozen snapshot, untouched |
| `~/kwizbox_clone` | Nov 3 clone | 🧊 Stale |
| `~/Desktop/MY APP 2` | SHS curriculum docs only | 🧊 Stale |
| `~/Desktop/trivia`, `~/ghana-stem-trivia-backup` | Early copies (Sep) | 🧊 Stale |
| `~/Desktop/KwizBox` | Presentation slides/screenshots | 🧊 Assets |
| `~/kwizbox-deploy` | **Broken symlink** (target deleted) | ⚠️ Broken |
| `~/kwizbox_*`, `~/trivia.db`, loose files in `~` | Fragments (data, drafts, scripts, README) | 🧊 Fragments |

### GitHub
- `github.com/AmoakoBarnie/KwizBox` — public, 47 commits, remote `origin`.
- Local work was **ahead** of GitHub (4 hardening commits), not behind — so the
  migration source had to be the local copy, not a GitHub clone.
- Open PR **#2** "Add 180 reviewed questions for B4–B9" (branch
  `manus/add-180-questions-546-725`) — not merged, decision pending.
- `gh-pages` branch holds a legacy static frontend deploy (3 unique commits).
- Branch `main` was locally mis-tracked to `origin/mascot-3d-and-models` — fixed
  during migration.

### Environment
- Dev host: Linux Mint; **no KVM** (Android emulator TCG software mode only;
  Android 11 AVD `kwizbox_a11` works, Android 14 WebView crashes).
- The new repo home is on an **NTFS drive** (`/media/stephen/FILES`, 432 GB,
  173 GB free) mounted via FUSE — slower for many-small-file operations; git
  mitigations applied (`core.fileMode=false`, `core.untrackedCache=true`); no
  symlinks in tree.
- NVMe home disk has 37 GB free (was the recommended alternative; owner chose
  the FILES drive).
- Ports: backend 8001 (8000 = MusicApp), frontend 5173/5174 (Vite auto-increment).
- `sqlite3` CLI not installed; `bcrypt` pinned 4.0.1 for passlib compatibility.
- Supabase project exists: `gfjcoowxijvmmkdwciwq`, Europe region, free tier —
  **connection string not yet provided** (owner action).

## 2. Assumptions (made during initialization; correct me if wrong)

- A1: The GitHub repo `AmoakoBarnie/KwizBox` is the intended canonical remote
  (owner confirmed: "the same thing").
- A2: "Option 2" (everything on the FILES drive) was a deliberate owner choice
  accepting NTFS trade-offs.
- A3: The old `~/Desktop/KwizBoz Andriod` copy should be preserved untouched
  for now (owner did not approve committing to it; nothing was modified).
- A4: Continuing the roadmap (Supabase → deploy → APK → Play Store) remains the
  priority order (per `roadmap.md`); to be re-confirmed at the approval gate.

## 3. Open questions

- Q1: Should PR #2's 180 questions be merged into the bank?
- Q2: What should happen to the ~6 stale copies (archive vs delete)?
- Q3: Is the Fly.io backend (`kwizbox-still-bush-3080.fly.dev` per
  `frontend/.env.production`) live and current, or should deploy be redone
  as part of M2?
- Q4: Guest data retention policy (guests are device-local only — confirm this
  remains intended before Play Store review).
- Q5: Business model (free? school licensing later?) — affects Play Store
  listing and data-processing agreements.

## 4. Recommendations

- R1: Push the 5 local commits to GitHub promptly — until then, the newest
  security hardening exists only on this machine.
- R2: Archive the stale copies into one clearly labelled folder (with a
  manifest) rather than deleting; decide after the new home is proven.
- R3: Complete M1 (Supabase) before any new feature work — it unblocks the
  entire release path.
- R4: Keep the live question bank backed up (git bundle + `trivia.db` copy)
  before running any migration.
- R5: Add automated backups of `trivia.db` to the deployment milestone.

## 5. Decisions requiring owner approval

- D1: Approve this initialization (approval gate, master prompt §16).
- D2: Approve `git push origin main` (publishes 5 commits).
- D3: PR #2 disposition.
- D4: Stale-copy handling plan.
- D5: Start of M1 (development authorization).

All five are recorded in `PROJECT_STATUS.md` → "Pending decisions".
