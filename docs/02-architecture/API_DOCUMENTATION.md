# API_DOCUMENTATION.md

> Part of `docs/02-architecture/`. Endpoint inventory — verified by scanning
> route decorators (52 routes, 2026-11-10). Interactive docs: run the backend
> and open `/docs` (FastAPI auto-generates OpenAPI).

## Base URL

- Local dev: `http://localhost:8001` (frontend proxies through `http://localhost:5174`)
- Production: **not chosen yet** (M2 hosting was rejected). `frontend/.env.production`
  still contains the retired Fly URL and must be updated before any store build.

## Conventions

- JSON bodies/responses; Pydantic-validated.
- Auth: the JWT is set at login in the HttpOnly `kwizbox_access` cookie;
  `Authorization: Bearer <JWT>` is still accepted for scripts/tests. Admin
  routes need a separate admin token from `POST /admin/token`.
- Errors: standard HTTP status codes + FastAPI error bodies.
- **Security invariant:** quiz pack responses never include `answer_index` or
  `explanation` (REQ-QUIZ-002).

## App-level routes (`main.py`)

| Method & path | Purpose | Auth |
|---|---|---|
| `GET /` | Serve the built frontend (SPA entry) | — |
| `GET /health` | Health check → `{"status":"ok","service":"kwizbox"}` | — |
| `GET /manifest.webmanifest`, `GET /sw.js`, `GET /workbox-{version}.js` | PWA assets | — |
| `GET /media/questions/{file}` | Question diagram SVGs | — |
| `GET /{full_path:path}` | SPA fallback routing | — |

## Auth (`routes/auth.py` — prefix `/auth`)

| Method & path | Purpose | Auth |
|---|---|---|
| `POST /auth/register` | Create account (nickname, password, class, school code?, age, sex, security fields) → token | — |
| `POST /auth/login` | Login → JWT | — |
| `POST /auth/guest` | Guest session token (is_guest=true) | — |
| `GET /auth/me` | Current user profile | Bearer |
| `DELETE /auth/me` | Delete own account (204) | Bearer |
| `PUT /auth/me/password` | Change password | Bearer |
| `PATCH /auth/me/avatar` | Update avatar customization | Bearer |
| `POST /auth/logout` | Invalidate session/cookie | Bearer/cookie |
| *(retired)* `POST /auth/reset/question`, `POST /auth/reset/verify` | Password reset — removed (P0-3, `de496c2`) | — |

## Quiz (`routes/quiz.py` — prefix `/quiz`)

| Method & path | Purpose | Auth |
|---|---|---|
| `POST /quiz/pack` | Question pack by filters (no answers leaked) | Bearer |
| `POST /quiz/check` | Grade a single answer + feedback | Bearer |
| `POST /quiz/submit` | Grade + persist a session | Bearer |
| `GET /quiz/leaderboard?scope=&class_level=&school_code=&limit=` | Leaderboards (global/class/school/weekly/monthly) | — |
| `GET /quiz/progress` | Per-subject/topic progress + mastery | Bearer |
| `POST /quiz/challenge/create` | Create head-to-head challenge → 6-letter code | Bearer |
| `GET /quiz/challenge/{code}/questions` | Same question set for all joiners | Bearer |
| `POST /quiz/challenge/{code}/submit` | Submit challenge score | Bearer |
| `GET /quiz/challenge/{code}/compare` | Challenge leaderboard + my rank | — |

### Live duel relay (`routes/duel.py` — WebSocket)

| Endpoint | Purpose | Auth |
|---|---|---|
| `WS /ws/duel/{code}?nickname=…` | Display-only room for a friend challenge: presence, progress and finish events | Session cookie preferred; sanitised nickname fallback |

Messages are JSON and never carry answers or official scores. Accepted client
types: `progress` (`index`, `total`, `correct`, `score`), `finished`
(`score`, `correct`, `total`) and `ping`. Server events: `joined`, `presence`,
`progress`, `finished`, `left`, `pong`. The relay grades nothing — the official
result is still `POST /quiz/challenge/{code}/submit`. See
`docs/adr/0002-live-duel-relay.md`.

## Curriculum (`routes/curriculum.py` — prefix `/curriculum`)

| Method & path | Purpose | Auth |
|---|---|---|
| `GET /curriculum/manifest` | subjects → class levels → topics → sub-topics | optional |
| `GET /curriculum/topics` | Topic list for selection UI | optional |

## Admin (`routes/admin.py` — prefix `/admin`, admin token required)

| Method & path | Purpose |
|---|---|
| `POST /admin/token` | Admin login → admin JWT (120 min) |
| `GET /admin/dashboard` | Aggregate stats |
| `GET /admin/users` / `GET /admin/users/{id}` | User list/detail |
| `POST /admin/users/{id}/status` | Activate/deactivate user |
| `GET /admin/questions` / `POST /admin/questions` | List/create questions |
| `PUT /admin/questions/{qid}` / `DELETE /admin/questions/{qid}` | Update/delete question |
| `POST /admin/questions/{qid}/active` | Toggle question active |
| `GET/POST /admin/school-codes`, `PATCH /admin/school-codes/{id}` | School code management |
| `GET /admin/leaderboard` | All-scope leaderboard view |
| `GET /admin/monitor` | Live play activity |
| `GET /admin/settings` (+ PUT per key) | System settings |
| `GET /admin/audit` | Audit log |
| `GET/POST /admin/admins`, `POST /admin/admins/{id}/status` | Admin management |
| `DELETE /admin/cleanup/guests` | Purge guest users |
| `GET /admin/export/questions|users|leaderboard|game-history` | CSV exports |

## Environment variables affecting the API

`DATABASE_URL` (sqlite:// or postgresql://), `JWT_SECRET` (required — no
default), `ACCESS_TOKEN_EXPIRE_MINUTES` (43200 = 30 days), 
`ADMIN_TOKEN_EXPIRE_MINUTES` (120), `ALLOWED_ORIGINS` (CORS). Template:
`backend/.env.example`.
