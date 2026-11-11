# KwizBox — Brain

> **Agent entry point.** Read this first. Links to full docs at bottom.

---

## What is KwizBox?

STEM trivia app for Ghanaian learners (Primary 4 / B4 → JHS 3 / B9), NaCCA-aligned. React + Vite PWA wrapped in Capacitor for Android. FastAPI backend with JWT auth, 7,890 questions (180 added from PR #2 on 2026-11-10), leaderboards, guest mode.

## Where things are

| Item | Location |
|---|---|
| **Project root** | `/home/stephen/Desktop/KwizBoz Andriod` |
| **Backend** | `backend/` — FastAPI + SQLAlchemy, port 8001 |
| **Frontend** | `frontend/` — React + Vite, port 5173 |
| **Android** | `frontend/android/` — Capacitor, `com.kwizbox.app` |
| **Database** | `backend/trivia.db` — SQLite (3.5 MB, **7,890 questions**) |
| **Migration script** | `backend/scripts/migrate_sqlite_to_pg.py` |
| **APKs** | `_backup/preview/KwizBox-{emulator,phone}.apk` |
| **3D mascot models** | `models/` — 4 character masters + animation clips + renders + `models/scripts/` (the Blender jobs) |
| **Mascot runtime path** | `frontend/public/assets/mascots-v2/animated/` (byte-identical to `models/models/`) |
| **Deploy configs** | removed 2026-11-10 (Fly/Railway artifacts deleted; hosting deferred to M2 — recreate when M2 starts) |

## What's running right now (dev)

- **Nothing running** (2026-11-11: ports 8001/5173/5174 all dead)
- Dev environment exists again (rebuilt 2026-11-10): `backend/venv` +
  `frontend/node_modules` — start the backend on :8001 per
  `docs/06-deployment/ENVIRONMENT_SETUP.md`; Vite dev server on 5173
  (auto-bumps to 5174 if busy)
- Emulator `kwizbox_a11` (Android 11, TCG mode) — stopped, snapshot `kwizbox_ready` saved
- **Postgres migration REJECTED by owner (2026-11-11)** — the app stays on SQLite
- `frontend/tests/` — 17 Playwright-style scripts (e2e, policy-check, mascot, stride, offline)

## What's done

- ✅ Android app builds and runs (Capacitor, Android 11, TCG mode)
- ✅ Full E2E flow verified (guest login → quiz → submit → leaderboard)
- ✅ SQLite → Postgres migration script proven (9,276 rows, 3 bugs fixed)
- ✅ Deploy configs removed 2026-11-10 (hosting deferred; old Fly app destroyed)
- ✅ Supabase project created (`gfjcoowxijvmmkdwciwq`, Europe, free tier)
- ✅ Credentials sanitized in backup files
- ✅ Project relocated to `KwizBoz Andriod/`
- ✅ Mascots fully rigged and walking (commit `b7e3e39`) — males bound to the
  armature for the first time, females rigged, procedural walk cycle, meshopt
  decoder wired. Verified 2/2 canvases animating in the browser.
- ✅ Release hardening in progress (P0 items: answer-key leak closed, disabled-login guard,
  cleartext/cleartext Android config, credentials rotated). See `HARDENING_LOG.md`.
- ✅ `frontend/tests/` Playwright suite added + `frontend/tests/policy-check.mjs` && `policy-facts.mjs` (child-safety / GDPR).

## What's blocked

**Nothing external.** M1 (Postgres/Supabase migration) and M2 (hosting)
were **rejected by the owner** (confirmed 2026-11-11) — the app stays on
SQLite; no hosting is planned. The Supabase project exists but is out of
scope now.

## What happens next

1. Resolve the guest-form submit bug (under investigation since 2026-11-10)
2. App-level smoke tests (smoke-auth, route-smoke, quiz-pack incl. PR #2)
3. M3: Android APK rebuild via Capacitor (decide the target backend first —
   no hosting exists)
4. M4: Play Store submission
5. M5: post-launch stabilization

## Key technical notes

- **No KVM** on this host — emulator runs in TCG software mode (~6 min boot)
- **Android 11** (API 30) — Android 14 WebView crashes under TCG
- **bcrypt pinned to 4.0.1** — newer breaks passlib import
- **Port 8000 taken** by MusicApp — backend uses 8001
- **Port 5173 taken** by MusicApp — frontend uses 5174
- **CORS** reads `ALLOWED_ORIGINS` env var (comma-separated)
- **JWT secret** must be set in env — no default (prevents accidental prod use)
- **Guests excluded** from leaderboard (by design)
- **No answer leak** in `/quiz/pack` responses (by design)
- **Mascots are fully rigged now** (as of commit `b7e3e39`). The two real bugs were:
  1. **Male models were never skinned** — they carried a 14-joint glTF `skin` but the
     mesh primitive had no `JOINTS_0`/`WEIGHTS_0`, so the mesh rendered in bind pose
     and the walk clip had no visible effect. Pre-existing, not introduced by the walk
     work. Fixed with `models/scripts/skin_unskinned.py`.
  2. **Female models shipped unrigged** — no skin, no clips. Fixed with
     `models/scripts/rig_female.py`.
  The symptom looked like a per-gender bug (one mascot animated, one froze) because
  the females were bound correctly and the males were not.
- **Walk cycle is procedural** (`models/scripts/make_realistic_walk.py`). Measured
  targets: stride ≥ 0.30, swing 25–40 % of leg length, arm opposition −1.0. The old
  clip had stride 0.004 and arm opposition +1.0 (arms swung in unison). The cycle
  walks in place — `HeroStage.jsx` moves it along the track with Framer Motion.
- **Mascot GLBs are meshopt-compressed** (`EXT_meshopt_compression`, gltfpack `-c`).
  `Mascot3D.jsx` must attach `MeshoptDecoder` or the mesh fails to load silently.
  Do not use `-cf` (splits a fallback `.bin` and breaks the GLB) or `-cc` (Draco —
  no `DRACOLoader` configured).
- **Blender cannot read meshopt glTF** — author from the uncompressed GLB and
  compress as the last step. Any "verified in Blender" claim must say which file was
  actually opened.
- **`models/` ≠ runtime path.** Browser loads `frontend/public/assets/mascots-v2/animated/`;
  replacing a master in `models/models/` has no effect until copied there.
- **Clip names are load-bearing.** `idle`/`celebrate`/`encourage`/`walk`/`blink` must
  match exactly — a missing clip is a silent no-op, not an error. `walk` is exported
  bare; the others carry an armature suffix (`idle_youth_Mascot_Rig`).
- **Mascot locomotion lives in `HeroStage.jsx`, not the GLB.** The clip plays in place;
  `WalkingMascot` drives position, facing, bob and lean with Framer Motion motion values
  in `useAnimationFrame`. Three things were wrong and are now fixed (commit `b32e896`):
  1. `TRACK = 100` was used as *both* the crossing distance and the time divisor, so a
     full traverse took 200 s — measured 97 px of travel in 16 s. Replaced with a fixed
     `SECONDS_PER_CROSSING`.
  2. **Facing never flipped.** `direction = cycle < 1 ? 1 : -1` only changes after 100 s,
     so sampling `scaleX` over 217 frames showed 0 flips — the mascots had no directional
     sense. Facing now turns over `TURN_SECONDS` with easing instead of snapping.
  3. The spring hop read as jumping, not walking. Replaced with a 3 px bob at 2× the
     stride rate plus a small forward lean.
- **A shared distance/time constant is a trap.** Reusing one number for both a distance
  and a period produces a value that looks plausible in each place and is wrong in both.
- **`useTransform` must not be called inside the `style` object** — it creates a new
  transform on every render.
- **The CSS `no-motion` rule does not stop JS-driven motion.** It only neutralises CSS
  animations and transitions; `useAnimationFrame` locomotion needs its own
  `prefers-reduced-motion` guard in the component.
- **Verify locomotion by measuring, and select the right elements.** `.mascot-track > div`
  also matches the dust-particle divs, which sit at `x=0` and read as "static mascots".
  Filter to elements containing a `canvas`. `tests/measure-locomotion.mjs` asserts
  traverse span, facing flips and bob amplitude; `tests/verify-reduced-motion.mjs`
  asserts the mascots hold still under reduced motion.

## Full docs

- **[project-log.md](./project-log.md)** — append-only history: what was asked, decided, shipped
- **[roadmap.md](./roadmap.md)** — visual roadmap: Now / Next / Done / Later / Blocked
- **[models/README.md](./models/README.md)** — 3D mascot rig contract, clip names, regeneration
