# KwizBox — Ghana STEM Trivia

Fun, curriculum-aligned STEM trivia for Ghanaian learners (Primary 4 / B4 → JHS 3 / B9). A React + FastAPI app with JWT authentication, quiz battles, and progress tracking.

## Stack

- **Frontend:** React 18 + Vite 5 (PWA via `vite-plugin-pwa`). Mobile-first, low-data.
- **Backend:** FastAPI 0.115 + SQLite 3. Features JWT auth (registered + guest users), CORS, and static/media serving.
- **Design:** Dark/light themes, Ghana flag colors (Green `#00B36B`, Gold `#FFD23F`, Red `#CE1126`), glassmorphism cards, Kente patterns, animated mascot.
- **Content:** 3,230 questions across **Mathematics (1,620)** · **Science (955)** · **Computing (655)**, tagged by class (B4–B9) · subject · topic/sub-topic · difficulty. Each question includes a 1–4 sentence explanation.
- **Question Types:** MCQ (3,154) | True/False (2) | Image MCQ (74) with 10 hand-drawn SVG diagrams

## Layout

```
backend/
├── src/
│   ├── main.py          # FastAPI app + CORS + static/media serving
│   ├── config.py        # settings (DB url, JWT secret, pack size)
│   ├── database.py      # engine/session, idempotent SQLite ALTER migrations
│   ├── models.py        # 15 models: User, Question, QuizSession, SubjectProgress,
│   │                      #   TopicProgress, LeaderboardPeriod, SchoolCode,
│   │                      #   UserQuestionSeen, AdminUser, AuditLog, SystemSetting,
│   │                      #   Challenge, ChallengeSession
│   ├── auth.py          # JWT creation/validation, password hashing, optional/guest user
│   ├── schemas.py       # Pydantic request/response models (auth, quiz)
│   ├── schemas_admin.py # Admin-specific Pydantic schemas
│   ├── question_types.py# mcq | true_false | image_mcq helpers + demo seed
│   ├── mastery.py       # topic mastery score calculation
│   ├── periods.py       # weekly/monthly period bucketing
│   ├── progress.py      # per-subject + per-topic progress builder
│   ├── seed_admin.py    # seeds super admin account on startup
│   └── routes/
│       ├── auth.py      # register, login, guest, me, password reset
│       ├── quiz.py      # pack, check, submit, leaderboard, progress
│       ├── admin.py     # dashboard, users, questions CRUD, school codes,
│       │                #   settings, audit, monitor, exports
│       ├── curriculum.py# GET /curriculum/manifest + /topics
│       └── challenge.py # POST /create, GET /{code}/questions,
│       │                #   POST /{code}/submit, GET /{code}/compare
│   └── static/questions/ # 10 SVGs for image_mcq (lever, food chain, etc.)
├── trivia.db            # SQLite — 3,230 questions, 99 users, 565+ sessions
└── requirements.txt     # Python deps (FastAPI 0.115, SQLAlchemy 2.0, etc.)
frontend/
├── src/
│   ├── main.jsx         # React entry, ErrorBoundary, Google Fonts
│   ├── App.jsx          # React Router + AnimatePresence page transitions
│   ├── api.js           # fetch client — calls backend directly via VITE_API_URL
│   ├── auth.jsx         # AuthContext (JWT in localStorage, auto-validate on mount)
│   ├── styles.css       # Complete design system — dark/light themes, glass cards,
│   │                      #   Ghana flag accents, night sky background, ~752 lines
│   ├── subjects.js      # SUBJECTS list (15 subjects) + BADGE_SUBJECT_MAP
│   ├── sound.js         # SFX hooks: correct, wrong, streak, combo, click
│   ├── badges.js        # 24 badge definitions + evaluateBadges + loadBadges/saveBadges
│   └── components/
│       ├── HeroStage.jsx# Animated hero letter interaction (landing page)
│       ├── Mascot.jsx   # KwizBox mascot — gender + class level variants,
│       │                #   states: thinking/celebrate/encourage/sad/thinking
│       ├── Mascot.css   # Mascot component styles
│       ├── AnimatedBg.jsx# Gradient blob background (orbs + sparkles)
│       ├── KenteFrame.jsx# Kente-pattern decorative frame
│       ├── SoundToggle.jsx# Sound on/off toggle button
│       ├── ThemeToggle.jsx# Dark/light theme toggle button
│       ├── Confetti.jsx # Confetti overlay for quiz results
│       └── PesewaBody.jsx# Body mascot character
│   └── pages/
│       ├── Landing.jsx  # Home: login, signup, guest play, password reset
│       ├── ChooseQuiz.jsx# Quiz selection — class, subject, topic, sub-topic,
│       │                  #   challenge mode. Inline expandable sections.
│       ├── Challenge.jsx# Friend challenge: create/join/compare with 6-letter code
│       ├── Play.jsx     # Redirect stub → /choose-quiz
│       ├── Quiz.jsx     # Active quiz: 12 questions, timer, streak, combo,
│       │                #   live feedback, mascot reactions
│       ├── Summary.jsx  # Results: score, accuracy, breakdown, confetti,
│       │                #   ShareCard modal, badge evaluation
│       ├── Leaderboard.jsx# Global/class/school/weekly/monthly boards
│       ├── Profile.jsx  # User progress, badges, stats, mastery
│       └── Admin.jsx    # Admin dashboard (questions, users, settings, audit)
├── public/              # favicon.svg, icon-192.png, icon-512.png (PWA icons)
├── dist/                # Production build output (sw.js, workbox, built JS/CSS)
├── vite.config.js       # Vite: PWA config, port 5173, /api + /media proxy
├── .env                 # VITE_API_URL=http://localhost:8001 (bypasses proxy)
├── index.html           # Entry HTML
└── package.json         # React 18, React Router 6, Framer Motion 13, React Confetti 6
├── scripts/             # Question parsers, generators, importers, vetters
├── docs/
│   ├── APP_DOCUMENTATION.md # Complete app documentation (features, API, run guide)
│   └── ...
└── README.md            # This file
```

## Run (local dev)

### Backend (port 8001)

```bash
cd backend
./venv/bin/python -m uvicorn src.main:app --host 0.0.0.0 --port 8001
```

**Health check:** `curl http://localhost:8001/health` → `{"status":"ok","service":"ghana-stem-trivia"}`

### Frontend (port 5173)

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`. The `.env` file tells the frontend to call the backend directly (bypasses Vite proxy) — backend has `CORS allow_origins=["*"]`.

## Setup

### Development Mode

1. Start the backend server (see above)
2. The backend automatically creates a default admin account on startup
3. Use the admin credentials to access `/admin` in the frontend
4. Guest mode: Enter any nickname + class level to play without signing up

### Production Mode

- Use Docker containers or deploy the backend + frontend separately
- Set proper `VITE_API_URL` environment variable
- Configure reverse proxy (NGINX) for SSL and routing
- Backup `backend/trivia.db` regularly

## Features

### Authentication
- Register with nickname, password, class level (B4–B9), school code, security question
- Login with nickname + password → JWT (30-day expiry)
- Guest mode: temporary session, no persistence
- Password reset via security question
- Token in localStorage, auto-validated on app load

### Quiz Selection (`/choose-quiz`)
- Select class (B4–B9) → subject (15) → topic → sub-topic
- Inline expandable sections (no popup overlay)
- Challenge mode toggle (Free play / Daily challenge)
- Animated mascot + Kente title
- Start button with green glow

### Friend Challenge / Head-to-Head (`/challenge`)
- **Create** a challenge: pick class + subject → get a 6-letter code (e.g., `UHAYGK`)
- **Share** the code with a friend
- **Join** with the code → get the exact same 12 questions
- **Play** simultaneously, then **compare** scores on a leaderboard
- Codes expire after 24 hours
- Deterministic question selection (same code + class + subject = same questions)

### Quiz Gameplay
- 12 questions per session (configurable)
- Topics/sub-topics loaded live from database curriculum
- Daily challenge: same 12 questions for everyone, seeded by UTC date
- Questions don't repeat for logged-in users (until pool exhausted)
- Timer per question (speed bonus for fast answers)
- Immediate correct/incorrect feedback after each answer
- Points: Easy=10, Medium=15, Hard=25 × combo multiplier
- Streak system with flame animation (3+ streak = combo x2)
- Mascot reacts: thinking → celebrate (correct) / encourage (wrong)

### Results Summary (`/summary`)
- Score, accuracy, letter grade, stat rings
- Action buttons: Play Again / Leaderboard / Share Result
- **Share Result Card modal:** full card with score, grade, stats, accuracy bar, date
- Copy to clipboard, share via Web Share API, close button
- Badge evaluation on quiz completion

### Badges (`/profile`)
- **24 badges** defined and fully wired
- Categories: first quiz, streaks, perfect scores, subjects, difficulty
- `evaluateBadges()` called on quiz completion
- Badge grid with earned (gold glow) vs locked (40% opacity)
- BadgeToast popup when a new badge is earned
- Stored in localStorage per device

### Progress & Leaderboards
- Lifetime score, total questions, current/longest streak
- Per-subject progress (questions answered, correct count)
- Per-topic mastery scores (accuracy + volume)
- 5 leaderboard scopes: global, class, school, weekly, monthly
- Weekly/monthly points buckets reset each period

### Admin Dashboard (`/admin`, login as admin)
- Dashboard: total users, questions, active sessions, today's activity
- User management: view, activate/deactivate, set class level/school code
- Question management: full CRUD, activate/deactivate, search/filter
- School code management: create, update codes
- Leaderboard view with all scopes
- Live monitor: who's playing right now
- Settings: app-wide configuration
- Audit log: track admin actions
- Export: CSV downloads for questions, users, sessions

## Question counts (trivia.db)

```
Total: 3,230 questions
By subject:  Mathematics 1,620  |  Science 955  |  Computing 655
By class:    B4: 526  |  B5: 553  |  B6: 544  |  B7: 507  |  B8: 511  |  B9: 589
By type:     MCQ: 3,154  |  True/False: 2  |  Image MCQ: 74
```

## Class levels (Ghana Education Service)

- B4 = Primary 4 (Grade 4)
- B5 = Primary 5 (Grade 5)
- B6 = Primary 6 (Grade 6)
- B7 = JHS 1 (Grade 7)
- B8 = JHS 2 (Grade 8)
- B9 = JHS 3 (Grade 9)

## Subjects (15)

Mathematics, Science, Computing, English, Social Studies, French, Ghanaian Language, History, Our World and Our People, Creative Arts, Physical Education, Religious and Moral Education, Career Technology, Arabic, Mixed

## Image MCQ Diagrams (10 SVGs)

- `lever.svg` — Levers and simple machines
- `food-chain.svg` — Food chains and ecosystems
- `circuit.svg` — Electrical circuits
- `plant-parts.svg` — Plant anatomy
- `water-cycle.svg` — Water cycle
- `desktop-computer.svg` — Computer hardware
- `motherboard-cpu.svg` — Motherboard and CPU
- `open-circuit.svg` — Open vs closed circuits
- `body-organs.svg` — Human body organs
- `computer-parts.svg` — Computer parts

## Questions / Pitfalls

- `bcrypt` is pinned to `4.0.1` — newer bcrypt breaks `passlib` at import.
- Port 8000 is taken by MusicApp backend; Trivia backend uses **8001**.
- Frontend uses `.env` with `VITE_API_URL=http://localhost:8001` — this bypasses the Vite proxy. If you remove it, update `vite.config.js` proxy to cover all routes (`/auth/*`, `/quiz/*`, `/admin/*`, `/curriculum/*`, `/media/*`, `/health`).
- Guest mode: progress/scores are NOT persisted across devices/browsers. Sign-up persists.
- SQLite `create_all()` does NOT add columns to existing tables. On startup the API runs an idempotent `ALTER TABLE ... ADD COLUMN` for `question_type` and `image_url`.
- Always start Vite from the `frontend/` directory — starting from project root serves 404s.
- The `trivia.db` file is the question bank (3.2 MB, 3,230 questions). Keep it safe.
- Both servers must be running for the app to work. Backend `:8001`, Frontend `:5173`.

## API Quick Reference

Base URL: `http://localhost:8001`

### Auth
- `POST /auth/register` → `{nickname,password,class_level?,school_code?,security_question,security_answer}` → token
- `POST /auth/login` → `{nickname,password}` → token
- `POST /auth/guest` → `{nickname?,class_level?,school_code?}` → token
- `GET /auth/me` → profile (Bearer)
- `POST /auth/reset-password` → `{nickname,security_answer,new_password}` → token

### Quiz
- `POST /quiz/pack` → `{class_level,subject,topic?,sub_topic?,difficulty?,count?,exclude_ids?,daily?}` → questions (no answers)
- `POST /quiz/submit` → `{session_id,answers:[{question_id,selected_index}]}` → results with feedback
- `GET /quiz/leaderboard?scope=global|class|school&class_level=&school_code=&limit=` → board
- `GET /quiz/progress` → per-subject + per-topic progress (Bearer)
- `GET /curriculum/manifest` → subjects → classlevels → topics → [sub_topics] (Bearer optional)

### Admin (requires admin token from `POST /admin/token`)
- `POST /admin/token` → `{nickname,password}` → admin token
- `GET /admin/dashboard` → stats
- `GET /admin/users?...` → users
- `POST /admin/users/{id}/status` → update user status
- `GET/POST /admin/questions?...` → list/create questions
- `PUT/DELETE /admin/questions/{id}` → update/delete
- `POST /admin/questions/{id}/active` → toggle active status
- `GET/POST /admin/school-codes` → list/create school codes
- `PATCH /admin/school-codes/{id}` → update
- `GET /admin/leaderboard?...` → all scopes
- `GET /admin/monitor` → currently playing users
- `GET/PUT /admin/settings/{key}` → app settings
- `GET /admin/audit?...` → audit log
- `GET /admin/export/users` → CSV
- `GET /admin/export/questions` → CSV

## Deployment Notes

- Backend and frontend can be run locally as shown above
- For production, use NGINX as reverse proxy to serve both ports
- SQLite file should be backed up regularly
- Consider containerizing with Docker for easier deployment

## License

This project is open source and available under the MIT License.