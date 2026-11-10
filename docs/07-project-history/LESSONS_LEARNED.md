# LESSONS_LEARNED.md

> Part of `docs/07-project-history/`. Reusable technical knowledge: mistakes,
> discoveries, and the reasoning behind them. Append-only, dated, specific.
> (Absorbs and continues the excellent lore previously kept only in `brain.md`.)

## Repository & data management

### 2026-11-10 — `git clone` does not carry gitignored data
**What:** Relocating a repo by clone alone would have silently lost
`backend/trivia.db` (the entire question bank + user data), `backend/.env`,
and `frontend/.env`.
**Why:** Git deliberately excludes ignored files; "the repo" and "the project"
are different sets.
**Rule:** Before any relocation, run `git status --ignored` and diff the file
list against what actually matters. Copy ignored-but-precious files explicitly
and verify by checksum (`md5sum` both sides).

### 2026-11-10 — Verify which copy is authoritative before trusting any of them
**What:** ~6 copies of KwizBox existed across the machine; two looked equally
plausible. Choosing by recency alone could have lost 4 commits of hardening.
**How resolved:** `git fetch` + `git log origin/main..main` + `git log main..origin/main`
proved the local copy was a strict superset of GitHub.
**Rule:** Evidence over intuition: compare commit graphs, not folder dates.

### 2026-11-10 — A clone's branch tracking can be wrong; fix it immediately
**What:** Local `main` was tracking `origin/mascot-3d-and-models` (a feature
branch), making `git status` report misleading ahead/behind numbers.
**Fix:** `git branch --set-upstream-to=origin/main main`.

## Filesystems & performance

### 2026-11-10 — NTFS/FUSE costs on developer workflows
**What:** The repo now lives on an NTFS data drive mounted via FUSE. Large
file copies are fine; operations over thousands of tiny files (npm installs,
venv creation, git object walks) are noticeably slower than on ext4.
**Mitigations applied:** `core.fileMode=false` (NTFS exec-bit noise), 
`core.untrackedCache=true` (faster `git status`). No symlinks in tree (verified).
**Rule:** Prefer native filesystems for working repos where possible; when the
owner chooses capacity/convenience (a valid choice), document the trade-off
(ADR-002) and never copy `venv`/`node_modules` across locations — regenerate
them (they embed absolute paths).

## From the pre-initialization era (kept — verified valuable)

### A shared distance/time constant is a trap
Reusing one number as both a distance and a time divisor produces values that
look plausible in each place and are wrong in both (mascot locomotion bug:
200 s crossings instead of ~8 s).

### Verify motion by measuring, and select the right elements
`.mascot-track > div` also matched dust-particle divs at x=0, reading as
"static mascots". Filter to elements containing a `canvas`. Eyeballing
animation is not verification — `measure-locomotion.mjs` asserts span, facing
flips, and bob amplitude.

### CSS `no-motion` does not stop JS-driven motion
`prefers-reduced-motion` CSS rules only neutralize CSS animations/transitions;
`useAnimationFrame` locomotion needs its own guard in the component
(`verify-reduced-motion.mjs` asserts this).

### `useTransform` must not be called inside the `style` object
It creates a new transform on every render. Compute transforms at the top level.

### Mascot GLB pipeline facts
- Meshopt-compressed GLBs require `MeshoptDecoder` in `Mascot3D.jsx` —
  otherwise the mesh fails to load **silently**.
- Do not use gltfpack `-cf` (splits a fallback `.bin`, breaking the GLB) or
  `-cc` (Draco; no DRACOLoader configured).
- Blender cannot read meshopt glTF — author from the uncompressed GLB,
  compress last. Any "verified in Blender" claim must name the file opened.
- Clip names are load-bearing: `idle`/`celebrate`/`encourage`/`walk`/`blink`
  must match exactly; a missing clip is a silent no-op.
- `models/` is the source library; the browser loads
  `frontend/public/assets/mascots-v2/animated/` — masters must be copied over
  or changes never reach the app.

### SQLite `create_all()` never alters existing tables
Schema evolution is handled by idempotent `ALTER TABLE`/`CREATE INDEX`
migrations in `database.py`. New columns must go through that pattern.

### bcrypt 4.0.1 pin
Newer bcrypt breaks `passlib` at import. Upgrading means migrating auth off
passlib first — a deliberate, tested change, never a casual `pip install -U`.

### Ports are a shared machine resource
8000 and 5173 belong to another project on this host; KwizBox standardized on
8001, and Vite auto-bumps 5173→5174. Document your ports or lose an afternoon.
