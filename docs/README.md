# KwizBox — project documentation index

> This file was the original project README. It describes the project as it was
> during the early MVP (200-question seed, Phase-1 scope, old layout) and is kept
> for **archaeology only**. **Do not follow instructions from this file.**
>
> **Current truth, in priority order (read first):**
> 1. Root `README.md` — project map, stack, run guide, API quick reference
> 2. `AGENTS.md` — operating rules for AI agents and developers (read first)
> 3. `PROJECT_STATUS.md` — where the project is right now
> 4. `SESSION_HANDOFF.md` — what happened last, what's next
> 5. `docs/01`–`docs/07` — detailed architecture, planning, testing, deployment
> 6. `CONTRIBUTING.md` — how to contribute (humans and AI)
> 7. `Master P` — the master prompt (project initialization system)

# KwizBox

Fun, curriculum-aligned STEM trivia for Ghanaian learners (Primary 4 / B4 → JHS 3 / B9).
Built foundation-first: backend + 200-question seed verified before the UI.

## Stack
- **Frontend:** React + Vite (PWA via `vite-plugin-pwa`). Mobile-first, low-data.
- **Backend:** FastAPI + SQLite. JWT auth (registered + guest).
- **Content:** 200 questions parsed from the product brief's PDF, tagged by
  class • subject • strand/topic • difficulty, each with a 1–4 sentence explanation.

## Layout
```
ghana-stem-trivia/
├── backend/
│   ├── src/
│   │   ├── main.py          # FastAPI app, CORS, router registration
│   │   ├── config.py        # settings (DB url, JWT secret)
│   │   ├── database.py      # engine/session
│   │   ├── models.py        # User, Question, QuizSession, Challenge, …
│   │   ├── auth.py          # JWT in HttpOnly cookie, password hashing
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── scoring.py       # points rules
│   │   ├── xp.py            # levels 1–10, leagues, streak calendar
│   │   ├── question_types.py# mcq / true-false / image-mcq shaping
│   │   └── routes/          # auth, quiz, challenge, admin, curriculum, duel
│   ├── scripts/seed.py      # loads ../scripts/questions.json into SQLite
│   ├── tests/               # pytest (question types, duel relay)
│   ├── trivia.db            # SQLite data (seeded)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api.js           # fetch client (credentials: 'include')
│   │   ├── auth.jsx         # AuthContext (cookie session, no JS token)
│   │   ├── duel.js          # useDuelRoom — display-only WS relay hook
│   │   ├── App.jsx          # routes
│   │   └── pages/           # Landing, Play, Quiz, Summary, Leaderboard, …
│   ├── tests/               # Playwright e2e + unit checks
│   ├── public/              # favicon.svg, icon-192/512.png (PWA)
│   ├── vite.config.js       # per-route dev proxy incl. WebSocket /ws
│   └── package.json
├── scripts/parse_questions.py   # PDF text -> questions.json
└── models/                      # 3D mascot source library (copy into frontend/public)
```

## Run (local dev)
Backend (port 8001). `ADMIN_PASSWORD` is required — startup refuses to seed the
admin account without it:
```
cd backend
python3 -m venv venv && source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
python scripts/seed.py          # only needed once / on content change
ADMIN_PASSWORD='<choose-one>' uvicorn src.main:app --host 0.0.0.0 --port 8001
```
Frontend (dev picks next free port, usually 5174 because MusicApp uses 5173):
```
cd frontend
npm install
npm run dev -- --port 5174 --strictPort
```
Open `http://localhost:5174`. Keep `VITE_API_URL=` empty in `.env.development`
so the app uses a same-origin proxy — that keeps the HttpOnly session cookie
first-party. Vite proxies the API routes and `/ws` (WebSocket) to `:8001`.

## Seed content from the PDF
```
cd scripts
cp "<pdf extracted txt>" extracted_py.txt
python parse_questions.py       # writes questions.json (200 Qs, cross-checks answer key)
cd ../backend && python scripts/seed.py
```

## API quick reference
- POST `/auth/register`  `{nickname,password,class_level?,school_code?}` → sets HttpOnly session cookie
- POST `/auth/login`     `{nickname,password}` → sets HttpOnly session cookie
- POST `/auth/guest`     `{nickname?,class_level?,school_code?}` → guest cookie (no persistence)
- GET  `/auth/me`        (session cookie) → profile
- POST `/quiz/pack`      `{class_level,subject,Mixed?,difficulty,count,topic?}` → questions (no answer leaked). Each item includes `question_type` (`mcq` | `true_false` | `image_mcq`) and `image_url` (or null). `true_false` options are length 2.
- POST `/quiz/offline-pack` → same body → questions **with** `answer_index` + `explanation` for device-local practice (no session/XP/seen writes; daily packs refused). See `docs/adr/0003-offline-practice-answer-keys.md`.
- POST `/quiz/submit`    `{class_level,subject,difficulty,answers:[{question_id,selected_index}],duration_seconds?}` → graded result + feedback (2-option T/F and 4-option MCQ)
- GET  `/media/questions/...`  placeholder diagrams for `image_mcq` (e.g. `/media/questions/lever.svg`)
- GET  `/quiz/leaderboard?scope=global|class&class_level=&school_code=&limit=` → board

## Question types
- `mcq` (default) — 4 options, `answer_index` 0–3. All existing seed rows stay this type.
- `true_false` — options A/B are True/False; C/D stored empty; `answer_index` 0 or 1. Pack responses send only 2 options.
- `image_mcq` — 4 options plus `image_url` (public path such as `/media/questions/lever.svg`).

SQLite: `create_all` does not add columns to an existing `questions` table. On startup the API runs an idempotent `ALTER TABLE ... ADD COLUMN` for `question_type` (default `mcq`) and `image_url`, then backfills `mcq`. Live `backend/trivia.db` is kept. Restart the backend once after pulling this change.

Demo T/F + image questions (B4 Science / Computing, Easy) are inserted on startup if missing. Play **B4 → Science → Easy** (or Computing) a few times, or create items in Admin → Questions (type selector + image URL). Placeholder SVGs live in `backend/static/questions/`.

JSON seed: `question_type` / `image_url` are optional (default `mcq`). Tests: `cd backend && ./venv/bin/python -m pytest tests/ -q`.

## Notes / pitfalls
- `bcrypt` is pinned to `4.0.1` — newer bcrypt breaks `passlib` at import on this host.
- Port 8000 is taken by the MusicApp backend; Trivia backend uses **8001**.
- Guest mode: progress/scores are NOT persisted (per plan). Sign-up persists + joins leaderboards.
- Auth is cookie-based: the JWT lives in an HttpOnly `Secure` `SameSite=Strict`
  cookie named `kwizbox_access`. JavaScript never reads it; fetch calls use
  `credentials: 'include'`. Use `http://localhost:5174` (not `127.0.0.1`) so the
  dev proxy keeps the cookie first-party.
- Engagement features now exist: XP/levels, weekly leagues, streak calendar,
  badges, school codes and the Schools leaderboard, plus live duel rooms
  (display-only WebSocket; see `docs/adr/0002-live-duel-relay.md`) and
  device-local offline practice (`docs/adr/0003-offline-practice-answer-keys.md`).
