# KwizBox — Project Log

> **Append-only.** Before each section ends, record: what was asked, what was decided and why, what shipped. Never delete or rewrite history.

---

## 2026-10-05 — Project relocation & documentation setup

### Asked
- Move KwizBox Android app to `/home/stephen/Desktop/KwizBoz Andriod`
- Create `project-log.md` (append-only, with asked/decided/shipped per section)
- Create `roadmap.md` (headings = columns, bullets = cards, `[[` before brief)
- Create `brain.md` linking both for agent reference

### Decided & Why
- **Full project move** (not just Android folder) — the backend, frontend, configs, and APKs all belong together. Moving only the Android folder would orphan the backend and break the build pipeline.
- **Old directory removed** after move — avoids confusion about which copy is canonical.
- **project-log.md is append-only** — preserves decision history so nothing gets lost across sessions.
- **roadmap.md uses column headings + card bullets** — visual scannability; `[[` marks the start of each card's brief for quick parsing.
- **brain.md is the agent's entry point** — single file that links to both docs so any future agent session knows exactly where things stand.

### Shipped
- ✅ Entire project moved from `/home/stephen/Desktop/MY APP` → `/home/stephen/Desktop/KwizBoz Andriod`
- ✅ Old directory removed
- ✅ `project-log.md` created (this file)
- ✅ `roadmap.md` created
- ✅ `brain.md` created

---

## 2026-10-04 — Android app build & emulator testing

### Asked
- Turn KwizBox into a native Android app
- Test on emulator despite no KVM/hardware virtualization
- Hide sensitive data in backup files

### Decided & Why
- **Capacitor** chosen over TWA/React Native — preserves existing React/Vite PWA code with minimal changes
- **Android 11 (API 30)** chosen over Android 14 — WebView survives TCG software mode where Android 14's crashes with SIGTRAP
- **TCG mode** (`-accel off`) — only option without KVM; ~6 min boot but functional
- **Two APK variants** — emulator (`10.0.2.2` loopback) and real phone (LAN IP `192.168.1.44`)
- **Credential sanitization** — all DB passwords, JWT secrets, admin passwords replaced with placeholders in backup files

### Shipped
- ✅ Capacitor initialized (`com.kwizbox.app`)
- ✅ Android platform added
- ✅ APK built and installed on emulator
- ✅ Full guest login → quiz → submit flow verified on Android 11
- ✅ Screenshots captured (landing, quiz, login, signup)
- ✅ Emulator snapshot `kwizbox_ready` saved (restore 226s vs 360s cold)
- ✅ 6 backup files sanitized
- ✅ 4.2 GB Android 14 system image cleaned up

---

## 2026-10-04 — Backend bug fixes & CORS

### Asked
- Fix backend import error
- Fix CORS for Capacitor WebView
- Fix mixed content blocking

### Decided & Why
- **ProxyHeadersMiddleware** moved from `fastapi.middleware.proxy_headers` → `uvicorn.middleware.proxy_headers` — the FastAPI path doesn't exist; removed invalid `num_proxies=1` parameter
- **CORS origins** added `https://localhost`, `http://localhost`, `capacitor://localhost` — Capacitor WebView sends these origins
- **Capacitor server URL** changed from `https://localhost` → `http://localhost` — Android blocks mixed content (HTTPS page → HTTP API)
- **ALLOWED_ORIGINS env var** added — allows adding domains without redeploy

### Shipped
- ✅ `src/main.py` — fixed import, CORS env support
- ✅ Backend running on `:8001` (SQLite)
- ✅ Full E2E verified: health, guest login, quiz pack, check answer, submit, leaderboard, curriculum

---

## 2026-10-04 — SQLite → Postgres migration

### Asked
- Migrate backend from SQLite to PostgreSQL
- Use managed Postgres (Supabase, Neon, PlanetScale — free tiers)

### Decided & Why
- **Embedded Postgres (`pgserver`)** for testing — no sudo on host, so `pgserver` provides a real Postgres 16 without installation
- **Three bugs found and fixed:**
  1. **VARCHAR overflow** — SQLite ignores `VARCHAR(n)`; Postgres enforces. Widened `class_level` String(4)→(20), `subject` String(20)→(80)
  2. **Boolean coercion** — SQLite stores 0/1; Postgres demands real bools. Added type-driven coercion
  3. **Self-referential FK** — `admin_users.created_by` → `admin_users.id`. Multi-pass insert algorithm prevents false orphan drops
- **psycopg2-binary** added to requirements
- **`.env.example`** created with SQLite default + commented Postgres DSN

### Shipped
- ✅ 9,276 rows migrated across 13 tables (all accounted for)
- ✅ `scripts/migrate_sqlite_to_pg.py` — idempotent, FK-safe, boolean-coercing
- ✅ App verified working against Postgres on port 8002
- ✅ No regression — SQLite path still healthy
- ✅ Skill `sqlite-to-postgres-migration` saved

---

## 2026-10-05 — Supabase project created

### Asked
- Host backend on Supabase

### Decided & Why
- **Supabase** chosen — free tier, generous limits, good for small apps
- **Project created:** `gfjcoowxijvmmkdwciwq` (region: Europe)
- **Connection string needed** from Settings → Database → Connection string → URI tab
- **Port 5432** (direct) preferred over 6543 (pooler) for migration compatibility
- **Deploy configs prepared:** `backend/Dockerfile`, `railway.toml` — ready for backend hosting on Railway/Render

### Shipped
- ✅ Supabase project live at `gfjcoowxijvmmkdwciwq.supabase.co`
- ✅ `backend/Dockerfile` created (serves API + SPA from one container)
- ✅ `railway.toml` created (healthcheck, restart policy)
- ✅ CORS `ALLOWED_ORIGINS` env support added
- ⏳ **Waiting on:** connection string from user to run migration

---

## Pending / Next Steps

1. **Get Supabase connection string** from user → run migration → verify counts
2. **Deploy backend** to Railway/Render with `DATABASE_URL` + `JWT_SECRET`
3. **Rebuild APK** pointing at public backend URL
4. **Submit to Play Store**
