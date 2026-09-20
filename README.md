# KwizBox

Fun, curriculum-aligned STEM trivia for Ghanaian learners (Primary 4 / B4 → JHS 3 / B9).
Built foundation-first: backend + 3,230-question seed verified before the UI.

## Stack
- **Frontend:** React + Vite (PWA via `vite-plugin-pwa`). Mobile-first, low-data.
- **Backend:** FastAPI + SQLite. JWT auth (registered + guest).
- **Content:** 3,230 questions across **Mathematics (1,620)** · **Science (955)** · **Computing (655)**,
  tagged by class (B4–B9) · subject · strand/topic · difficulty, each with a 1–4 sentence explanation.

## Layout
```
MY APP/
├── backend/
│   ├── src/
│   │   ├── main.py          # FastAPI app + CORS + static/media serving
│   │   ├── config.py        # settings (DB url, JWT secret, pack size)
│   │   ├── database.py      # engine/session, idempotent SQLite ALTER migrations
│   │   ├── models.py        # 14 models: User, Question, QuizSession, SubjectProgress,
│   │   │                      #   TopicProgress, LeaderboardPeriod, SchoolCode,
│   │   │                      #   UserQuestionSeen, AdminUser, AuditLog, SystemSetting,
│   │   │                      #   Challenge, ChallengeSession
│   │   ├── auth.py          # JWT creation/validation, password hashing, optional/guest user
│   │   ├── schemas.py       # Pydantic request/response models (auth, quiz)
│   │   ├── schemas_admin.py # Admin-specific Pydantic schemas
│   │   ├── question_types.py# mcq | true_false | image_mcq helpers + demo seed
│   │   ├── mastery.py       # topic mastery score calculation
│   │   ├── periods.py       # weekly/monthly period bucketing
│   │   ├── progress.py      # per-subject + per-topic progress builder
│   │   ├── seed_admin.py    # seeds super admin account on startup
│   │   └── routes/
│   │       ├── auth.py      # register, login, guest, me, password reset
│   │       ├── quiz.py      # pack, check, submit, leaderboard, progress
│   │       ├── admin.py     # dashboard, users, questions CRUD, school codes,
│   │       │                #   settings, audit, monitor, exports
│   │       ├── curriculum.py# GET /curriculum/manifest + /topics
│   │       └── challenge.py # POST /create, GET /{code}/questions,
│   │       │                  #   POST /{code}/submit, GET /{code}/compare
│   │   └── static/questions/ # 10 SVGs for image_mcq (lever, food chain, etc.)
│   ├── trivia.db            # SQLite — 3,230 questions, 99 users, 565+ sessions
│   ├── trivia.db.bak_*      # backup snapshots
│   └── requirements.txt     # Python deps (FastAPI 0.115, SQLAlchemy 2.0, etc.)
├── frontend/
│   ├── src/
│   │   ├── main.jsx         # React entry, ErrorBoundary, Google Fonts
│   │   ├── App.jsx          # React Router + AnimatePresence page transitions
│   │   ├── api.js           # fetch client — calls backend directly via VITE_API_URL
│   │   ├── auth.jsx         # AuthContext (JWT in localStorage, auto-validate on mount)
│   │   ├── styles.css       # Complete design system — dark/light themes, glass cards,
│   │   │                      #   Ghana flag accents, night sky background, ~752 lines
│   │   ├── subjects.js      # SUBJECTS list (15 subjects) + BADGE_SUBJECT_MAP
│   │   ├── sound.js         # SFX hooks: correct, wrong, streak, combo, click
│   │   ├── badges.js        # 24 badge definitions + evaluateBadges + loadBadges/saveBadges
│   │   └── components/
│   │       ├── HeroStage.jsx# Animated hero letter interaction (landing page)
│   │       ├── Mascot.jsx   # Ghana STEM mascot — gender + class level variants,
│   │       │                #   states: thinking/celebrate/encourage/sad/thinking
│   │       ├── Mascot.css   # Mascot component styles
│   │       ├── AnimatedBg.jsx# Gradient blob background (orbs + sparkles)
│   │       ├── KenteFrame.jsx# Kente-pattern decorative frame
│   │       ├── SoundToggle.jsx# Sound on/off toggle button
│   │       ├── ThemeToggle.jsx# Dark/light theme toggle button
│   │       ├── Confetti.jsx # Confetti overlay for quiz results
│   │       └── PesewaBody.jsx# Body mascot character
│   │   └── pages/
│   │       ├── Landing.jsx  # Home: login, signup, guest play, password reset
│   │       ├── ChooseQuiz.jsx# Quiz selection — class, subject, topic, sub-topic,
│   │       │                  #   challenge mode. Inline expandable sections.
│   │       ├── Challenge.jsx# Friend challenge: create/join/compare with 6-letter code
│   │       ├── Play.jsx     # Redirect stub → /choose-quiz
│   │       ├── Quiz.jsx     # Active quiz: 12 questions, timer, streak, combo,
│   │       │                #   live feedback, mascot reactions
│   │       ├── Summary.jsx  # Results: score, accuracy, breakdown, confetti,
│   │       │                #   ShareCard modal, badge evaluation
│   │       ├── Leaderboard.jsx# Global/class/school/weekly/monthly boards
│   │       ├── Profile.jsx  # User progress, badges, stats, mastery
│   │       └── Admin.jsx    # Admin dashboard (questions, users, settings, audit)
│   ├── public/              # favicon.svg, icon-192.png, icon-512.png (PWA icons)
│   ├── dist/                # Production build output (sw.js, workbox, built JS/CSS)
│   ├── vite.config.js       # Vite: PWA config, port 5173, /api + /media proxy
│   ├── .env                 # VITE_API_URL=http://localhost:8001 (bypasses proxy)
│   ├── index.html           # Entry HTML
│   └── package.json         # React 18, React Router 6, Framer Motion 13, React Confetti 6
├── scripts/                 # Question parsers, generators, importers, vetters
├── docs/
│   ├── APP_DOCUMENTATION.md # Complete app documentation (features, API, run guide)
│   └── ...
└── README.md               # This file
```

## Run (local dev)

### Backend (port 8001)
```bash
cd /home/stephen/Desktop/MY APP/backend
./venv/bin/python -m uvicorn src.main:app --host 0.0.0.0 --port 8001
```
**Health check:** `curl http://localhost:8001/health` → `{"status":"ok","service":"ghana-stem-trivia"}`

### Frontend (port 5173)
```bash
cd /home/stephen/Desktop/MY APP/frontend
npm run dev
```
Open `http://localhost:5173`. The `.env` file tells the frontend to call the backend
directly (bypasses Vite proxy) — backend has `CORS allow_origins=["*"]`.

## Test credentials
| Nickname | Password | Role |
|----------|----------|------|
| admin | Admin@1234 | Admin (full dashboard) |
| peswa | password123 | Regular user |
| testuser | password123 | Regular user |
| logintest | password123 | Regular user |
| stephen | stephen123 | Regular user |

Guest mode: any nickname + class level → temporary session (device-only storage).

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

### Progress & leaderboards
- Lifetime score, total questions, current/longest streak
- Per-subject progress (questions answered, correct count)
- Per-topic mastery scores (accuracy + volume)
- 5 leaderboard scopes: global, class, school, weekly, monthly
- Weekly/monthly points buckets reset each period

### Admin dashboard (`/admin`, login as admin)
- Dashboard: total users, questions, active sessions, today's activity
- User management: view, activate/deactivate, set class level/school code
- Question management: full CRUD, activate/deactivate, search/filter
- School code management: create, update codes
- Leaderboard view with all scopes
- Live monitor: who's playing right now
- Settings: app-wide configuration
- Audit log: track admin actions
- Export: CSV downloads for questions, users, sessions

### Question types
- **MCQ** (multiple choice): 4 options A/B/C/D, `answer_index` 0–3 — 3,154 questions
- **True/False**: 2 options (True/False), `answer_index` 0 or 1 — 2 questions
- **Image MCQ**: 4 options + `image_url` (diagram SVG) — 74 questions with 10 hand-drawn SVGs

### Night Sky Background (Dark Theme)
- Deep navy gradient sky (#050a18 → #0f1f35)
- Atmospheric horizon glow
- 200+ stars in 3 tiers with twinkle animations
- 5 faint planets orbiting at different speeds/distances
- Ringed planet (Saturn-like, 90s orbit)
- Nebula colored haze (barely visible)
- Shooting star every ~12 seconds
- All hidden on light theme

### UI/UX
- Dark theme default, light theme toggle (sun/moon icon, top-right)
- Ghana flag colors as accents: Green `#00B36B`, Gold `#FFD23F`, Red `#CE1126`
- Glassmorphism cards with backdrop blur
- Kente-pattern decorative elements
- Animated mascot character (state-based: thinking, celebrating, encouraging)
- HeroStage: interactive letter animation on landing page
- Sound effects toggle (correct, wrong, streak, combo, click)
- Confetti celebration on quiz completion
- Smooth page transitions (Framer Motion, spring physics)
- Mobile-first responsive (works on phones)
- PWA: installable as phone app, service worker caches app shell for offline use
- Accessibility: focus-visible rings, skip-nav link, reduced-motion support

## API quick reference
Base URL: `http://localhost:8001`

**Auth:**
- `POST /auth/register` → `{nickname,password,class_level?,school_code?,security_question,security_answer}` → token
- `POST /auth/login` → `{nickname,password}` → token
- `POST /auth/guest` → `{nickname?,class_level?,school_code?}` → token (is_guest=true)
- `GET /auth/me` (Bearer) → user profile
- `POST /auth/reset/question` → `{nickname}` → `{has_security_question, security_question?}`
- `POST /auth/reset/verify` → `{nickname, security_answer, new_password}` → token

**Quiz:**
- `POST /quiz/pack` → `{class_level, subject, topic?, sub_topic?, difficulty?, count?, daily?, exclude_ids?}` (Bearer) → questions
- `POST /quiz/check` → `{question_id, selected_index}` (Bearer) → `{is_correct, correct_index, explanation}`
- `POST /quiz/submit` → graded result + feedback
- `GET /quiz/leaderboard?scope=&class_level=&school_code=&limit=` → ranked entries
- `GET /quiz/progress` (Bearer) → detailed progress

**Challenge:**
- `POST /quiz/challenge/create` → `{code, class_level, subject, question_count}` (Bearer)
- `GET /quiz/challenge/{code}/questions` → `{questions: [...]}` (same 12 questions for all)
- `POST /quiz/challenge/{code}/submit` → `{score, correct, total, accuracy}` (Bearer)
- `GET /quiz/challenge/{code}/compare` → `{leaderboard, player_count, my_rank}`

**Curriculum:**
- `GET /curriculum/manifest` (Bearer optional) → subjects → classlevels → topics → [sub_topics]

**Admin** (all require admin token from `POST /admin/token`):
- `POST /admin/token` → `{nickname, password}` → admin token
- `GET /admin/dashboard` → stats
- `GET /admin/users?...` → users
- `POST /admin/users/{id}/status` → update
- `GET/POST /admin/questions?...` → list/create
- `PUT/DELETE /admin/questions/{id}` → update/delete
- `POST /admin/questions/{id}/active` → toggle
- `GET/POST /admin/school-codes` → list/create
- `PATCH /admin/school-codes/{id}` → update
- `GET /admin/leaderboard?...` → leaderboard
- `GET /admin/monitor` → currently playing
- `GET/PUT /admin/settings/{key}` → settings
- `GET /admin/audit?...` → audit log
- `GET/POST /admin/admins` → list/create

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
Mathematics, Science, Computing, English, Social Studies, French,
Ghanaian Language, History, Our World and Our People, Creative Arts,
Physical Education, Religious and Moral Education, Career Technology, Arabic, Mixed

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

## Notes / pitfalls
- `bcrypt` is pinned to `4.0.1` — newer bcrypt breaks `passlib` at import.
- Port 8000 is taken by MusicApp backend; Trivia backend uses **8001**.
- Frontend uses `.env` with `VITE_API_URL=http://localhost:8001` — this bypasses
  the Vite proxy. If you remove it, update `vite.config.js` proxy to cover all routes
  (`/auth/*`, `/quiz/*`, `/admin/*`, `/curriculum/*`, `/media/*`, `/health`).
- Guest mode: progress/scores are NOT persisted across devices/browsers. Sign-up persists.
- SQLite `create_all()` does NOT add columns to existing tables. On startup the API runs
  an idempotent `ALTER TABLE ... ADD COLUMN` for `question_type` and `image_url`.
- Always start Vite from the `frontend/` directory — starting from project root serves 404s.
- The `trivia.db` file is the question bank (1.9 MB, 3,230 questions). Keep it safe.
- Both servers must be running for the app to work. Backend `:8001`, Frontend `:5173`.
