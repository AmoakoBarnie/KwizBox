# KwizBox — Roadmap

> Headings = columns · Bullets = cards · `[[` opens each card's brief

---

## 🚀 Now — Active Work

- [[**Supabase migration** — Get connection string from user, run `migrate_sqlite_to_pg.py`, verify 9,276 rows land correctly, test API against hosted DB]]
- [[**Backend deploy** — Push to Railway/Render with `DATABASE_URL` + `JWT_SECRET` env vars, confirm `/health` returns 200 on public URL]]
- [[**APK rebuild** — Point `VITE_API_URL` at public backend, rebuild debug + release APKs]]

## 📋 Next — Queued

- [[**Play Store submission** — Create developer account ($25 one-time), prepare store listing (screenshots, description, privacy policy), upload release APK/AAB]]
- [[**Release build** — Sign APK with keystore, build AAB (`./gradlew bundleRelease`), test on real device over Wi-Fi]]
- [[**CORS finalization** — Add deployed frontend origin to `ALLOWED_ORIGINS`, remove localhost entries for production]]

## ✅ Done — Shipped

- [[**Android app** — Capacitor initialized, Android platform added, APK builds successfully]]
- [[**Emulator testing** — Android 11 AVD in TCG mode, full guest→quiz→submit flow verified, snapshot saved]]
- [[**Postgres migration** — 9,276 rows migrated, 3 bugs fixed (VARCHAR, booleans, self-ref FK), script reusable]]
- [[**Backend fixes** — ProxyHeadersMiddleware import, CORS for Capacitor, mixed content, ALLOWED_ORIGINS env]]
- [[**Deploy configs** — Dockerfile, railway.toml, .env.example, psycopg2 in requirements]]
- [[**Supabase project** — Created `gfjcoowxijvmmkdwciwq`, Europe region, free tier]]
- [[**Project relocation** — Moved to `/home/stephen/Desktop/KwizBoz Andriod`, docs created]]
- [[**Credential sanitization** — 6 backup files cleaned of DB passwords, JWT secrets, admin passwords]]
- [[**Disk cleanup** — 4.2 GB Android 14 system image removed]]

## 🔮 Later — Future

- [[**Question bank expansion** — 7,318 questions currently; add more subjects/levels, image-based questions]]
- [[**Offline mode** — Cache quiz packs locally for low-connectivity areas]]
- [[**Push notifications** — Daily quiz reminders, streak alerts]]
- [[**Admin dashboard** — Web UI for managing questions, users, school codes]]
- [[**Analytics** — Track popular topics, weak areas, engagement metrics]]
- [[**Multi-language** — Twi, Ga, Ewe translations for broader Ghanaian reach]]
- [[**PWA enhancement** — Install prompt, offline shell, background sync]]

## 🚫 Blocked

- [[**Supabase connection string** — Waiting on user to provide from Settings → Database → Connection string → URI]]
- [[**Backend hosting** — Supabase is DB-only; need Railway/Render for the FastAPI service]]
- [[**Play Store account** — Requires $25 one-time fee and identity verification]]
