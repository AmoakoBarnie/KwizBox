# Ghana STEM Trivia

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
- POST `/quiz/pack`      `{class_level,subject,Mixed?,difficulty,count,topic?}` → questions (no answer leaked)
- POST `/quiz/submit`    `{class_level,subject,difficulty,answers:[{question_id,selected_index}],duration_seconds?}` → graded result + feedback
- GET  `/quiz/leaderboard?scope=global|class&class_level=&school_code=&limit=` → board

## Notes / pitfalls
- `bcrypt` is pinned to `4.0.1` — newer bcrypt breaks `passlib` at import on this host.
- Port 8000 is taken by the MusicApp backend; Trivia backend uses **8001**.
- Guest mode: progress/scores are NOT persisted (per plan). Sign-up persists + joins leaderboards.
- Phase 1 MVP only: no adaptive difficulty, offline packs, badges, or school codes yet.
