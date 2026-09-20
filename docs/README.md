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
│   │   ├── main.py          # FastAPI app + CORS
│   │   ├── config.py        # settings (DB url, JWT secret)
│   │   ├── database.py      # engine/session
│   │   ├── models.py        # User, Question, QuizSession, SchoolCode
│   │   ├── auth.py          # JWT, password hashing
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── scoring.py       # points rules
│   │   └── routes/          # auth.py, quiz.py
│   ├── scripts/seed.py      # loads ../scripts/questions.json into SQLite
│   ├── trivia.db            # SQLite data (seeded)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api.js           # fetch client (/api proxy in dev)
│   │   ├── auth.jsx         # AuthContext (token in localStorage)
│   │   ├── App.jsx          # routes
│   │   └── pages/           # Landing, Play, Quiz, Summary, Leaderboard, Profile
│   ├── public/              # favicon.svg, icon-192/512.png (PWA)
│   ├── vite.config.js       # PWA + /api proxy -> :8001
│   └── package.json
└── scripts/parse_questions.py   # PDF text -> questions.json
```

## Run (local dev)
Backend (port 8001):
```
cd backend
python -m venv venv && source venv/Scripts/activate
pip install -r requirements.txt
python scripts/seed.py          # only needed once / on content change
uvicorn src.main:app --host 0.0.0.0 --port 8001
```
Frontend (dev picks next free port, usually 5174 because MusicApp uses 5173):
```
cd frontend
npm install
npm run dev
```
Open the printed URL (e.g. http://localhost:5174). Vite proxies `/api/*` to the backend.

## Seed content from the PDF
```
cd scripts
cp "<pdf extracted txt>" extracted_py.txt
python parse_questions.py       # writes questions.json (200 Qs, cross-checks answer key)
cd ../backend && python scripts/seed.py
```

## API quick reference
- POST `/auth/register`  `{nickname,password,class_level?,school_code?}` → token
- POST `/auth/login`     `{nickname,password}` → token
- POST `/auth/guest`     `{nickname?,class_level?,school_code?}` → token (no persistence)
- GET  `/auth/me`        (Bearer) → profile
- POST `/quiz/pack`      `{class_level,subject,Mixed?,difficulty,count,topic?}` → questions (no answer leaked). Each item includes `question_type` (`mcq` | `true_false` | `image_mcq`) and `image_url` (or null). `true_false` options are length 2.
- POST `/quiz/submit`    `{class_level,subject,difficulty,answers:[{question_id,selected_index}],duration_seconds?}` → graded result + feedback (2-option T/F and 4-option MCQ)
- GET  `/media/questions/...`  placeholder diagrams for `image_mcq` (e.g. `/media/questions/lever.svg`)
- GET  `/quiz/leaderboard?scope=global|class&class_level=&school_code=&limit=` → board

## Question types
- `mcq` (default) — 4 options, `answer_index` 0–3. All existing seed rows stay this type.
- `true_false` — options A/B are True/False; C/D stored empty; `answer_index` 0 or 1. Pack responses send only 2 options.
- `image_mcq` — 4 options plus `image_url` (public path such as `/media/questions/lever.svg`).

SQLite: `create_all` does not add columns to an existing `questions` table. On startup the API runs an idempotent `ALTER TABLE ... ADD COLUMN` for `question_type` (default `mcq`) and `image_url`, then backfills `mcq`. Live `backend/trivia.db` is kept. Restart the backend once after pulling this change.

Demo T/F + image questions (B4 Science / Computing, Easy) are inserted on startup if missing. Play **B4 → Science → Easy** (or Computing) a few times, or create items in Admin → Questions (type selector + image URL). Placeholder SVGs live in `backend/static/questions/`.

JSON seed: `question_type` / `image_url` are optional (default `mcq`). Tests: `cd backend && venv/Scripts/python -m pytest tests/test_question_types.py -q`.

## Notes / pitfalls
- `bcrypt` is pinned to `4.0.1` — newer bcrypt breaks `passlib` at import on this host.
- Port 8000 is taken by the MusicApp backend; Trivia backend uses **8001**.
- Guest mode: progress/scores are NOT persisted (per plan). Sign-up persists + joins leaderboards.
- Phase 1 MVP only: no adaptive difficulty, offline packs, badges, or school codes yet.
