# DEPENDENCY_REGISTER.md

> Part of `docs/04-development/`. Why each dependency exists, and the rules
> for changing them. Versions from the lockstep files 2026-11-10.

## Backend — `backend/requirements.txt` (Python)

| Dependency | Version | Why it exists | Change rule |
|---|---|---|---|
| fastapi | 0.115.0 | API framework | Minor bumps OK; test `/docs` after major bumps |
| uvicorn[standard] | 0.30.6 | ASGI server | — |
| sqlalchemy | 2.0.35 | ORM (SQLite + Postgres) | Verify against BOTH backends until M1 done |
| pydantic | 2.9.2 | Validation | FastAPI-coupled; bump together with fastapi |
| pydantic-settings | 2.5.2 | Env config | — |
| python-jose[cryptography] | 3.3.0 | JWT | Cryptography changes affect token compat |
| passlib | 1.7.4 | Password hashing framework | **Do not upgrade past pair with bcrypt** |
| **bcrypt** | **4.0.1 PINNED** | Hash backend | **NEVER bump blindly** — newer bcrypt breaks passlib at import (verified on this host); if upgrading, migrate auth.py off passlib first, then test login of an existing hash |
| python-multipart | 0.0.12 | Form/file parsing | — |
| psycopg2-binary | 2.9.13 | Postgres driver (migration + sync paths) | Needed when DATABASE_URL is postgres:// |
| slowapi | 0.1.10 | Rate limiting | Check limits still apply after upgrade |
| asyncpg | 0.30.0 | Async Postgres driver | Pair with SQLAlchemy async usage |

## Frontend — `frontend/package.json` (npm, lockfile present)

| Dependency | Version | Why it exists | Change rule |
|---|---|---|---|
| react / react-dom | 18.3.1 | UI runtime | Major bumps = coordinated migration, ADR |
| react-router-dom | 6.26.2 | Routing | v7 is a major migration — ADR required |
| vite | 5.4.8 (dev) | Build + dev server | Bump with vite-plugin-pwa compatibility check |
| @vitejs/plugin-react | 4.3.1 (dev) | JSX transform | Pair with vite |
| vite-plugin-pwa | 0.20.5 (dev) | PWA + service worker | Service worker cache strategy changes affect offline behaviour — test `offlinePractice.test.js` |
| framer-motion | 13.1.0 | Animation | Reduced-motion guards required for new usage |
| three | 0.169.0 | 3D engine | GLB/meshopt compat; test mascot rendering (`mascot-render-check.mjs`) |
| @react-three/fiber | 8.17.10 | React renderer for three | Pair with three version |
| @react-three/drei | 9.114.3 | 3D helpers (loaders etc.) | MeshoptDecoder wiring must survive |
| react-confetti | 6.4.0 | Results celebration | — |
| @capacitor/core, cli, android | 6.2.2 | Android wrapper | Android build + WebView matrix changes — rebuild APK after bump |
| playwright | 1.64.0 (dev) | Browser test scripts | Test-only; keep scripts compatible |

## Infrastructure dependencies

| Item | Version/State | Notes |
|---|---|---|
| Docker multi-stage | Dockerfile at root | Hardened in `c3de450` |
| Fly.io app | `kwizbox-still-bush-3080.fly.dev` | Deploy workflow present; verify live state in M2 |
| Supabase project | `gfjcoowxijvmmkdwciwq` (Europe, free tier) | Connection string pending (M1 blocker) |
| GitHub Actions CI | `ci.yml` | Node 20, Python 3.11 |

## Rules

1. Every dependency addition/removal/upgrade = CHANGELOG entry + this register
   updated + the relevant tests run.
2. Lockfile (`frontend/package-lock.json`) is committed; use `npm ci`, not
   `npm install`, in CI and fresh setups.
3. Security advisories: prefer patch bumps immediately; document in
   BUG_TRACKER if a fix is blocked (e.g. bcrypt pin).
