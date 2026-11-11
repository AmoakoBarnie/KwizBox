# TECHNOLOGY_STACK.md

> Part of `docs/02-architecture/`. Every technology: what it is, why it's here,
> what was considered, and what it costs us long-term.
> Versions verified from `backend/requirements.txt` and `frontend/package.json`.

## Backend

| Technology | Version | Purpose | Why selected | Alternatives | Trade-offs accepted |
|---|---|---|---|---|---|
| Python + FastAPI | 0.115.0 | REST API framework | Fast development, automatic OpenAPI docs, async, Pydantic-native validation | Django REST, Flask, Node/Express | Smaller "batteries" than Django (admin, ORM features) — own admin dashboard had to be built |
| Uvicorn | 0.30.6 | ASGI server | Standard FastAPI server | Gunicorn+workers | Single-process dev; production uses Docker/Uvicorn |
| SQLAlchemy | 2.0.35 | ORM/database layer | Mature, supports both SQLite and Postgres with one codebase | Django ORM, raw SQL | Idempotent hand-rolled ALTER migrations instead of Alembic — simpler but less auditable |
| Pydantic / pydantic-settings | 2.9.2 / 2.5.2 | Validation + config | Declarative schemas, env-driven settings | marshmallow, dataclasses | — |
| python-jose[cryptography] | 3.3.0 | JWT creation/validation | Lightweight JWT | PyJWT | — |
| passlib + bcrypt | 1.7.4 / **4.0.1 pinned** | Password hashing | Standard, proven | argon2 | **bcrypt must stay pinned at 4.0.1** — newer bcrypt breaks passlib at import (verified on this host) |
| slowapi | 0.1.10 | Rate limiting | FastAPI-native rate limiting | Nginx-level limiting | In-app only; deploy proxy limits still advisable |
| psycopg2-binary / asyncpg | 2.9.13 / 0.30.0 | Postgres drivers | Required for `DATABASE_URL=postgresql://` | — | Two drivers present; used by different paths (migration script vs async runtime) |
|| SQLite | (stdlib) | Current DB | Zero-ops, single file, perfect for dev + early live use | Write concurrency caps; **no migration planned** (M1 rejected) |

## Frontend

| Technology | Version | Purpose | Why selected | Alternatives | Trade-offs accepted |
|---|---|---|---|---|---|
| React | 18.3.1 | UI framework | Largest ecosystem, team familiarity, hiring pool | Vue, Svelte | Bundle size; mitigated by Vite splitting |
| Vite | 5.4.8 | Build tool + dev server | Fast HMR, simple config, first-class PWA plugin | CRA, webpack, Next.js | SPA only — no SSR/SEO; acceptable for an app, not a content site |
| vite-plugin-pwa | 0.20.5 | PWA (installable, offline shell) | Matches low-connectivity target | Custom SW, Workbox direct | Shell-only offline; quiz packs offline is future work (out of scope now) |
| React Router | 6.26.2 | Routing | Declarative, standard | TanStack Router | — |
| framer-motion | 13.1.0 | Animations/transitions | Springs, gesture, layout animations | CSS only, GSAP | JS-driven motion needs explicit reduced-motion guards (CSS `no-motion` doesn't stop it — recorded in LESSONS_LEARNED) |
| three + @react-three/fiber + drei | 0.169 / 8.17 / 9.114 | 3D mascots | Real 3D characters vs sprites/GIFs | Sprite sheets, Lottie, video | Heavy (~large bundle), meshopt-compressed GLBs require `MeshoptDecoder`; silent failures when clip names mismatch (load-bearing contract) |
| react-confetti | 6.4.0 | Results celebration | Simple win | Custom canvas | — |
| Capacitor | 6.2.2 | Android wrapper | Reuses the web build as a native app | React Native, Kotlin rewrite, pure PWA | WebView performance ceiling; Play Store still requires compliance work |
| Playwright | 1.64.0 (dev) | E2E/scripted tests | Browser automation for the 19 test scripts | Cypress, Puppeteer | Dev-only dependency; CI uses Node directly |

## Infrastructure

|| Technology | Purpose | Why | Alternatives | Trade-offs |
|---|---|---|---|---|---|
| Docker (multi-stage) | Backend packaging | Reproducible deploys; existing hardened Dockerfile | Bare-metal deploys | Image maintenance |
| GitHub Actions | CI + deploy | `ci.yml` (build, smoke, gitleaks) | GitLab CI, local scripts | — |
| gitleaks (CI) | Secret scanning | Prevents credential leaks in history | trufflehog | —

## Maintenance implications summary

1. **Pinned bcrypt** — upgrades require testing passlib import (BUG_TRACKER).
2. **Two database backends** (SQLite + Postgres paths) — every schema change
   must be checked against both until M1 completes.
3. **3D pipeline** — mascot edits need the models/ → public/ copy step and the
   meshopt decoder wiring (see `models/README.md`, LESSONS_LEARNED).
4. **NTFS working copy** — slower builds/installs; acceptable per owner decision
   (ADR-002); CI unaffected.
