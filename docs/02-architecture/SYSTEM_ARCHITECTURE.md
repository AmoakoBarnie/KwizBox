# SYSTEM_ARCHITECTURE.md

> Part of `docs/02-architecture/`. The **as-built** architecture, verified
> against the code 2026-11-10. Change this document whenever the architecture
> changes — via an ADR first if the change is significant.

## Overview

Two-tier client-server application with a static frontend talking to a
stateless REST API, plus an Android wrapper that reuses the same frontend.

```
                ┌────────────────────────────────────────────┐
                │                  Clients                   │
                │  Browser (PWA)      Android (Capacitor)    │
                │  React 18 + Vite    same code, WebView     │
                │  React Router 6, framer-motion              │
                │  Three.js/R3F 3D mascots                   │
                └───────────────┬────────────────────────────┘
                                │ HTTPS, JSON (fetch client src/api.js)
                                │ Auth: JWT (Bearer) + hardened cookie auth
                                ▼
                ┌────────────────────────────────────────────┐
                │            FastAPI backend (:8001)          │
                │  src/routes/: auth, quiz, admin,            │
                │    curriculum, challenge (52 endpoints)     │
                │  src/: models (13), auth, schemas,         │
                │    scoring, mastery, periods, progress,   │
                │    question_types, rate_limit, seed_admin   │
                │  middleware: CORS (ALLOWED_ORIGINS),        │
                │    rate limiting (slowapi), security        │
                │    headers, proxy headers                   │
                └───────┬──────────────────┬─────────────────┘
                        │                  │
                        ▼                  ▼
              ┌──────────────┐   ┌────────────────────┐
              │ SQLite       │   │ Static /media      │
              │ trivia.db    │   │ (question SVGs)   │
              │ (dev/live)   │   └────────────────────┘
              └──────┬───────┘
                     │ migrate_sqlite_to_pg.py (M1)
                     ▼
              ┌──────────────────┐        ┌───────────────────┐
              │ Supabase Postgres│        │ Fly.io deploy      │
              │ (M1 target)      │        │ (M2 target)        │
              └──────────────────┘        └───────────────────┘
```

## Frontend (`frontend/`)

- **React 18 SPA** built with Vite, served as a **PWA** (`vite-plugin-pwa`,
  service worker caches the app shell for offline startup).
- Pages (`frontend/src/pages/`): Landing (login/signup/guest), ChooseQuiz,
  Challenge, Quiz, Summary, Leaderboard, Profile, Admin, Settings, plus policy
  pages (PrivacyPolicy, TermsAndConditions, CookiePolicy).
- Components (`frontend/src/components/`): 3D mascot system (`Mascot3D`,
  `WalkingMascot`, `SHSMascot`, `HeroStage`), theme/sound toggles, Kente frame,
  animated background, confetti.
- State: `AuthContext` (`auth.jsx`) — JWT stored client-side, auto-validated on
  mount; cookie auth supported after hardening `d17a252`.
- API client: `src/api.js` (fetch wrapper; base URL from `VITE_API_URL`).
- Design system: `src/styles.css` (dark/light themes, Ghana-flag accents,
  glassmorphism, night-sky background).

## Backend (`backend/src/`)

- **FastAPI** application, modular routers: `routes/auth.py`, `routes/quiz.py`,
  `routes/admin.py`, `routes/curriculum.py`, `routes/challenge.py`.
- Domain modules: `models.py` (13 SQLAlchemy models), `auth.py` (JWT +
  passlib/bcrypt), `schemas.py` / `schemas_admin.py` (Pydantic), `scoring.py`,
  `mastery.py`, `periods.py`, `progress.py`, `question_types.py`,
  `rate_limit.py`, `seed_admin.py`, `database.py` (engine + idempotent
  SQLite ALTER migrations).
- Static media served under `/media/questions/` (10 SVG diagrams).
- Serves PWA files (`manifest.webmanifest`, `sw.js`, workbox) when built.

## Database

- **Today:** SQLite (`backend/trivia.db`) — 13 tables, 7,710 questions, 38
  users, 141 sessions. Live data + question bank in one file.
- **Target:** Supabase Postgres (M1). Migration script proven; connection string
  pending. Schema documented in `DATABASE_SCHEMA.md`.

## Data flow — core quiz loop

1. Client requests a pack (`POST /quiz/pack`) with class/subject/topic filters.
2. Backend selects questions (excluding seen ones for registered users; daily
   seed for daily mode), returns options **without** `answer_index`/`explanation`.
3. Client answers; `POST /quiz/check` grades immediately and returns feedback.
4. `POST /quiz/submit` grades the full session server-side, persists
   `QuizSession`, updates `User` aggregates, `SubjectProgress`, `TopicProgress`,
   `LeaderboardPeriod` buckets (weekly/monthly).
5. Leaderboards/progress read back via `GET /quiz/leaderboard`, `/quiz/progress`.

## Deployment topology (target, M2)

- **Backend:** Fly.io (Docker multi-stage build; `fly.toml`; GitHub Actions
  deploy workflow). Secrets: `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS`.
- **Database:** Supabase (managed Postgres, Europe region, free tier).
- **Frontend:** static hosting (GitHub Pages legacy deploy exists on
  `gh-pages`; final hosting decision part of M2) + Android APK from the same
  build.
- **Dev tunnels:** `cloudflared` configs exist for local-exposure testing
  (historical; not part of production).

## Cross-cutting concerns

- **Auth:** JWT Bearer + cookie-based auth; guests get short-lived tokens and
  are excluded from leaderboards by design.
- **Rate limiting:** slowapi on sensitive endpoints (`rate_limit.py`).
- **Security headers:** applied in hardening `d17a252`.
- **CORS:** env-driven `ALLOWED_ORIGINS`.
- **Admin:** separate admin accounts with roles and permission sets; audit log.

## Known architectural limitations (honest view)

- Single-process API + SQLite caps concurrent writes; fine for current scale
  (tens of users), addressed by M1.
- Badges live in `localStorage` (frontend) — device-bound, not server-authoritative.
- `models.py.bak_before_pg` exists in `backend/src/` — historical backup file;
  candidate for cleanup (tracked in BUG_TRACKER as housekeeping).
- Question bank and user data share one SQLite file: back up together, restore
  together.
