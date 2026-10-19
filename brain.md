# KwizBox — Brain

> **Agent entry point.** Read this first. Links to full docs at bottom.

---

## What is KwizBox?

STEM trivia app for Ghanaian learners (Primary 4 / B4 → JHS 3 / B9), NaCCA-aligned. React + Vite PWA wrapped in Capacitor for Android. FastAPI backend with JWT auth, 7,318 questions, leaderboards, guest mode.

## Where things are

| Item | Location |
|---|---|
| **Project root** | `/home/stephen/Desktop/KwizBoz Andriod` |
| **Backend** | `backend/` — FastAPI + SQLAlchemy, port 8001 |
| **Frontend** | `frontend/` — React + Vite, port 5173 |
| **Android** | `frontend/android/` — Capacitor, `com.kwizbox.app` |
| **Database** | `backend/trivia.db` — SQLite (3.2 MB, 7,318 questions) |
| **Migration script** | `backend/scripts/migrate_sqlite_to_pg.py` |
| **APKs** | `_backup/preview/KwizBox-{emulator,phone}.apk` |
| **3D mascot models** | `models/` — 4 character masters + animation clips + renders + `models/scripts/` (the Blender jobs) |
| **Mascot runtime path** | `frontend/public/assets/mascots-v2/animated/` (byte-identical to `models/models/`) |
| **Deploy configs** | `backend/Dockerfile`, `railway.toml` |

## What's running right now

- Backend on `:8001` (SQLite) — health check returns `{"status":"ok"}`
- Emulator `kwizbox_a11` (Android 11, TCG mode) — stopped, snapshot `kwizbox_ready` saved
- No Postgres running (embedded `pgserver` stops with its process)

## What's done

- ✅ Android app builds and runs (Capacitor, Android 11, TCG mode)
- ✅ Full E2E flow verified (guest login → quiz → submit → leaderboard)
- ✅ SQLite → Postgres migration script proven (9,276 rows, 3 bugs fixed)
- ✅ Deploy configs ready (Dockerfile, railway.toml, .env.example)
- ✅ Supabase project created (`gfjcoowxijvmmkdwciwq`, Europe, free tier)
- ✅ Credentials sanitized in backup files
- ✅ Project relocated to `KwizBoz Andriod/`
- ✅ Mascots fully rigged and walking (commit `b7e3e39`) — males bound to the
  armature for the first time, females rigged, procedural walk cycle, meshopt
  decoder wired. Verified 2/2 canvases animating in the browser.

## What's blocked

**🔴 Supabase connection string** — the one thing needed to finish the migration.

User needs to go to: **Settings ⚙️ → Database → Connection string → URI tab**

Format needed:
```
postgresql://postgres.gfjcoowxijvmmkdwciwq:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

Replace `[PASSWORD]`, ensure port is **5432** (not 6543). Paste it here.

## What happens next (once connection string arrives)

1. Run migration: `venv/bin/python scripts/migrate_sqlite_to_pg.py "postgresql://..."`
2. Verify all 13 table counts match
3. Test API against Supabase (port 8002)
4. Deploy backend to Railway/Render with `DATABASE_URL` + `JWT_SECRET`
5. Rebuild APK with public backend URL
6. Submit to Play Store

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

## Full docs

- **[project-log.md](./project-log.md)** — append-only history: what was asked, decided, shipped
- **[roadmap.md](./roadmap.md)** — visual roadmap: Now / Next / Done / Later / Blocked
- **[models/README.md](./models/README.md)** — 3D mascot rig contract, clip names, regeneration
