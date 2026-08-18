# CLAUDE.md

# Project: Ghana STEM Trivia

STEM trivia web app for Ghanaian learners (Primary 4 / B4 → JHS 3 / B9), NaCCA-aligned.

## Stack
- Frontend: React + Vite, PWA (`vite-plugin-pwa`). Mobile-first, low-data for low-end Android/3G.
- Backend: FastAPI + SQLite. JWT auth (registered users + guest mode).
- Content: 200 seed questions parsed from the product brief PDF, tagged class • subject • strand • difficulty, each with an explanation.

## Run (dev)
- Backend: `cd backend && source venv/Scripts/activate && uvicorn src.main:app --port 8001`
  (port 8000 is taken by the separate MusicApp project; use 8001).
- Frontend: `cd frontend && npm run dev` (picks next free port; 5173 is MusicApp, so usually 5174).
  Vite proxies `/api/*` → backend :8001.
- Seed DB: `cd backend && python scripts/seed.py` (run once, or after editing questions.json).

## Key conventions
- Do NOT leak the correct answer in `/quiz/pack` responses (only options + metadata). Pack items include `question_type` and `image_url`; never `answer_index` or `explanation`. For `true_false` send exactly 2 options.
- Guest submissions are graded but NOT persisted (no leaderboard entry); registered users accumulate.
- `bcrypt` is pinned to 4.0.1 in requirements.txt — newer bcrypt breaks passlib import on this host. Do not bump blindly.
- Rebuild content: `cd scripts && python parse_questions.py` (needs extracted_py.txt) → `python scripts/seed.py`.

## Architecture
- `backend/src/models.py`: User, Question (`question_type`, `image_url`), QuizSession, SchoolCode.
- `backend/src/question_types.py`: mcq / true_false / image_mcq helpers + demo placeholders.
- `backend/src/database.py`: `create_all` plus idempotent SQLite ALTER for new Question columns (do not drop trivia.db).
- `backend/src/routes/quiz.py`: pack + submit + leaderboard. `auth.py`: register/login/guest/me.
- Question images: `backend/static/questions/` mounted at `/media`. Vite proxies `/media` → :8001.
- `frontend/src/api.js`: fetch client. `auth.jsx`: AuthContext (token in localStorage).
- `frontend/src/pages/`: Landing, Play, Quiz, Summary, Leaderboard, Profile.
