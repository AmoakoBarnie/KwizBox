# KwizBox — App Documentation

> Complete feature reference for the Ghana STEM Trivia application.
> Working copy: `/home/stephen/Desktop/MY APP/`
> Both servers running: Backend `:8001`, Frontend `:5173`

---

## 📊 Quick Stats

| Metric | Value |
|--------|-------|
| Questions | **3,230** (Math 1,620 / Science 955 / Computing 655) |
| Users | 99 |
| Quiz Sessions | 565+ |
| Question Types | MCQ (3,154) · True/False (2) · Image MCQ (74) |
| Classes | B4–B9 (526–589 questions each) |
| Subjects | 15 |
| SVG Diagrams | 10 hand-drawn SVGs in `/backend/static/questions/` |

---

## 📁 Project Structure

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
│   │   ├── auth.py          # JWT creation/validation, password hashing, guest user
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── schemas_admin.py # Admin-specific Pydantic schemas
│   │   ├── question_types.py# mcq | true_false | image_mcq helpers
│   │   ├── routes/
│   │   │   ├── auth.py      # register, login, guest, me, password reset
│   │   │   ├── quiz.py      # pack, check, submit, leaderboard, progress
│   │   │   ├── admin.py     # dashboard, users, questions CRUD, school codes,
│   │   │   │                  #   settings, audit, monitor, exports
│   │   │   ├── curriculum.py# GET /curriculum/manifest + /topics
│   │   │   └── challenge.py # POST /create, GET /{code}/questions,
│   │   │                      #   POST /{code}/submit, GET /{code}/compare
│   │   └── static/questions/ # 10 SVG diagrams for image_mcq
│   ├── trivia.db            # SQLite — 3,230 questions, 99 users, 565+ sessions
│   ├── trivia.db.bak_*      # backup snapshots
│   ├── requirements.txt     # Python deps
│   └── venv/                # Python virtualenv
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx         # React entry, ErrorBoundary
│   │   ├── App.jsx          # React Router + AnimatePresence
│   │   ├── api.js           # fetch client — VITE_API_URL direct
│   │   ├── auth.jsx         # AuthContext (JWT in localStorage)
│   │   ├── styles.css       # Complete design system (~752 lines)
│   │   ├── subjects.js      # 15 subjects + BADGE_SUBJECT_MAP
│   │   ├── sound.js         # SFX hooks (correct, wrong, streak, combo)
│   │   ├── badges.js        # 24 badge definitions + evaluateBadges
│   │   ├── components/
│   │   │   ├── HeroStage.jsx# Animated hero letter interaction
│   │   │   ├── Mascot.jsx   # Ghana mascot — gender + class variants
│   │   │   ├── Mascot.css   # Mascot styles
│   │   │   ├── AnimatedBg.jsx# Gradient blob background
│   │   │   ├── KenteFrame.jsx# Kente decorative frame
│   │   │   ├── SoundToggle.jsx# Sound on/off
│   │   │   ├── ThemeToggle.jsx# Dark/light theme
│   │   │   ├── Confetti.jsx # Confetti overlay
│   │   │   └── PesewaBody.jsx# Body mascot character
│   │   └── pages/
│   │       ├── Landing.jsx  # Home: login, signup, guest, password reset
│   │       ├── ChooseQuiz.jsx# Quiz selection — inline expandable sections
│   │       ├── Challenge.jsx# Friend challenge: create/join/compare
│   │       ├── Play.jsx     # Redirect stub → /choose-quiz
│   │       ├── Quiz.jsx     # Active quiz: 12 questions, timer, streak
│   │       ├── Summary.jsx  # Results: score, accuracy, ShareCard, badges
│   │       ├── Leaderboard.jsx# Global/class/school/weekly/monthly boards
│   │       ├── Profile.jsx  # User progress, badges, stats, mastery
│   │       └── Admin.jsx    # Admin dashboard
│   ├── public/              # favicon.svg, PWA icons
│   ├── dist/                # Production build output
│   ├── vite.config.js       # Vite config, port 5173
│   ├── .env                 # VITE_API_URL=http://localhost:8001
│   ├── index.html           # Entry HTML
│   └── package.json         # React 18, React Router 6, Framer Motion 13, PWA
│
├── scripts/                 # Question parsers, generators, importers, vetters
├── docs/                    # APP_DOCUMENTATION.md, logs, BUILD_LOG
├── README.md                # Project overview + run instructions
└── cloudflared.yml          # Tunnel config (surprise-dsl-hall-bags.trycloudflare.com)
```

---

## 🚀 Running the App

### Backend (port 8001)
```bash
cd /home/stephen/Desktop/MY APP/backend
./venv/bin/python -m uvicorn src.main:app --host 0.0.0.0 --port 8001
```
**Health:** `curl http://localhost:8001/health` → `{"status":"ok","service":"ghana-stem-trivia"}`

### Frontend (port 5173)
```bash
cd /home/stephen/Desktop/MY APP/frontend
npm run dev
```
Open `http://localhost:5173`. `.env` has `VITE_API_URL=http://localhost:8001`.

### Production Build
```bash
cd frontend && npx vite build
```

---

## 🔑 Test Credentials

| Nickname | Password | Role |
|----------|----------|------|
| admin | Admin@1234 | Admin (full dashboard) |
| peswa | password123 | Regular user |
| testuser | password123 | Regular user |
| logintest | password123 | Regular user |
| stephen | stephen123 | Regular user |

Guest mode: any nickname + class level → temporary session.

---

## 🎯 App Features

### 1. Authentication
- Register: nickname, password, class level (B4–B9), school code, security question
- Login: nickname + password → JWT (30-day expiry)
- Guest mode: temporary session, no persistence
- Password reset via security question
- Token stored in localStorage, auto-validated on app load

### 2. Quiz Selection (`/choose-quiz`)
- Class picker (B4–B9) via inline expandable sections
- Subject picker (15 subjects) via inline expand
- Topic & sub-topic from live DB curriculum via popup
- Challenge mode toggle (Free play / Daily challenge)
- Animated mascot + Kente title
- Start button with green glow

### 3. Friend Challenge / Head-to-Head (`/challenge`)
- **Create:** Pick class + subject → get 6-letter code (e.g., `UHAYGK`)
- **Join:** Enter friend's code → get the exact same 12 questions
- **Play:** Take the same quiz simultaneously
- **Compare:** See both scores on a leaderboard
- **How it works:** Create → Share code → Both play → Compare

### 4. Quiz Gameplay (`/quiz`)
- 12 questions per session (configurable)
- Topics/sub-topics loaded live from DB curriculum
- Daily challenge: same questions for everyone (seeded by UTC date)
- No repeated questions for logged-in users
- Timer per question with speed bonus
- Immediate correct/incorrect feedback
- Points: Easy=10, Medium=15, Hard=25 × combo multiplier
- Streak system with flame animation (3+ streak = combo ×2)
- Animated mascot reacts (thinking → celebrate / encourage)
- Confetti on quiz completion

### 5. Results Summary (`/summary`)
- Score display with trophy animation + stat rings
- Correct/incorrect breakdown with review list
- Grade letter (A–F) + accuracy percentage
- Action buttons: Play Again / Leaderboard / Share Result
- **Share Result Card modal:** Full card with score, grade, stats, accuracy bar, date, share text (Copy/Share/Close)
- **Badge evaluation:** 24 badges evaluated on quiz completion, shown in Profile

### 6. Badges (`/profile`)
- **24 badges** defined in `badges.js`
- Categories: first quiz, streaks, perfect scores, subjects, difficulty
- `evaluateBadges()` called on quiz completion
- Badge grid with earned (gold glow) vs locked (40% opacity)
- BadgeToast popup when a new badge is earned
- Stored in browser localStorage per device

### 7. Profile & Progress (`/profile`)
- User info, class level, school code
- Badge grid (24 badges)
- Statistics: lifetime score, total questions, streaks
- Subject progress (questions answered, correct)
- Topic mastery scores

### 8. Leaderboards (`/leaderboard`)
- 5 scopes: global, class, school, weekly, monthly
- Filter by class level and school code
- Ranked entries with scores

### 9. Admin Dashboard (`/admin`)
- Dashboard: total users, questions, active sessions, activity
- User management: view, activate/deactivate, set class/school
- Question management: full CRUD, activate/deactivate, search/filter
- School code management
- Leaderboard view (all scopes)
- Live monitor: who's playing now
- Settings & configuration
- Audit log
- Export: CSV downloads for questions, users, sessions

### 10. Image MCQs (74 questions)
- 10 hand-drawn SVG diagrams in `/backend/static/questions/`:
  - `lever.svg` — Levers and machines
  - `food-chain.svg` — Food chains and ecosystems
  - `circuit.svg` — Electrical circuits
  - `plant-parts.svg` — Plant anatomy
  - `water-cycle.svg` — Water cycle
  - `desktop-computer.svg` — Computer hardware
  - `motherboard-cpu.svg` — Motherboard & CPU
  - `open-circuit.svg` — Open vs closed circuits
  - `body-organs.svg` — Human body organs
  - `computer-parts.svg` — Computer parts
- Images served at `/media/questions/<name>.svg`
- Questions display the diagram with multiple-choice options

### 11. True/False Questions
- `question_type: "true_false"` supported
- `answer_index`: 0 (True) or 1 (False)
- 2 questions converted in DB
- Infrastructure fully implemented in `question_types.py`

### 12. UI/UX Design
- **Dark theme** default with night sky background (CSS animations)
- **Light theme** toggle (sun/moon icon, top-right)
- Ghana flag colors as accents: Green `#00B36B`, Gold `#FFD23F`, Red `#CE1126`
- Glassmorphism cards with backdrop blur
- Kente-pattern decorative elements
- Animated mascot character (state-based)
- HeroStage: interactive letter animation on landing page
- Sound effects toggle (correct, wrong, streak, combo, click)
- Confetti celebration on quiz completion
- Smooth page transitions (Framer Motion, spring physics)
- Mobile-first responsive design
- PWA: installable as phone app, service worker caches app shell
- Accessibility: focus-visible rings, skip-nav link, reduced-motion support

### 13. Night Sky Background (Dark Theme)
- Deep navy gradient sky (#050a18 → #0f1f35)
- Atmospheric horizon glow
- 3-tier stars (~200 total) with twinkle animations
- 5 faint planets orbiting at different speeds/distances (teal, gold, crimson, blue-white)
- Ringed planet (Saturn-like, 90s orbit)
- Nebula colored haze (barely visible)
- Shooting star every ~12 seconds
- All hidden on light theme

---

## 🌐 API Reference

**Base URL:** `http://localhost:8001`

### Authentication
| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/auth/register` | POST | `{nickname, password, class_level?, school_code?, security_question?, security_answer?}` | `{token, user}` |
| `/auth/login` | POST | `{nickname, password}` | `{token, user}` |
| `/auth/guest` | POST | `{nickname?, class_level?, school_code?}` | `{token, user}` |
| `/auth/me` | GET | — | `{user}` |
| `/auth/reset/question` | POST | `{nickname}` | `{has_security_question, security_question?}` |
| `/auth/reset/verify` | POST | `{nickname, security_answer, new_password}` | `{token}` |

### Quiz
| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/quiz/pack` | POST | `{class_level, subject, topic?, sub_topic?, difficulty?, count?, daily?, exclude_ids?}` | `{questions: [...]}` |
| `/quiz/check` | POST | `{question_id, selected_index}` | `{is_correct, correct_index, explanation}` |
| `/quiz/submit` | POST | `{class_level, subject, question_ids, answers:[...], duration_seconds?}` | `{score, correct, total, accuracy}` |
| `/quiz/leaderboard` | GET | `?scope=&class_level=&school_code=&limit=` | `[{rank, nickname, score, ...}]` |
| `/quiz/progress` | GET | — | `{overall, subjects, topics}` |
| `/quiz/check/answer` | POST | `{question_id, selected_index}` | `{is_correct, correct_index, explanation}` |

### Challenge / Head-to-Head
| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/quiz/challenge/create` | POST | `{class_level, subject}` (Bearer) | `{code, class_level, subject, question_count, expires_at}` |
| `/quiz/challenge/{code}/questions` | GET | — | `{code, class_level, subject, questions: [...]}` |
| `/quiz/challenge/{code}/submit` | POST | `{answers: [{question_id, selected_index}], duration_seconds?}` (Bearer) | `{score, correct, total, accuracy}` |
| `/quiz/challenge/{code}/compare` | GET | — | `{code, leaderboard, player_count, creator, my_rank}` |

### Curriculum
| Endpoint | Method | Response |
|----------|--------|----------|
| `/curriculum/manifest` | GET | `{subjects: [...]}` |
| `/curriculum/topics` | GET | Same as manifest |

### Admin (requires admin token)
| Endpoint | Method | Notes |
|----------|--------|-------|
| `/admin/token` | POST | `{nickname, password}` → admin token |
| `/admin/dashboard` | GET | Stats |
| `/admin/users` | GET | Filtered user list |
| `/admin/users/{id}` | GET | User detail |
| `/admin/users/{id}/status` | PATCH | Update user |
| `/admin/questions` | GET/POST | List / create questions |
| `/admin/questions/{id}` | PUT/DELETE | Update / delete question |
| `/admin/questions/{id}/active` | POST | Toggle active |
| `/admin/school-codes` | GET/POST | List / create school codes |
| `/admin/school-codes/{id}` | PATCH | Update school code |
| `/admin/leaderboard` | GET | Admin leaderboard |
| `/admin/monitor` | GET | Currently playing users |
| `/admin/settings` | GET/PUT | Get / update setting |
| `/admin/audit` | GET | Admin action log |
| `/admin/admins` | GET/POST | List / create admins |

---

## 📊 Question Bank Breakdown

### By Subject
| Subject | Questions |
|---------|-----------|
| Mathematics | 1,620 |
| Science | 955 |
| Computing | 655 |
| **Total** | **3,230** |

### By Class
| Class | Questions |
|-------|-----------|
| B4 (Primary 4) | 526 |
| B5 (Primary 5) | 553 |
| B6 (Primary 6) | 554 |
| B7 (JHS 1) | 507 |
| B8 (JHS 2) | 511 |
| B9 (JHS 3) | 589 |

### By Question Type
| Type | Count |
|------|-------|
| MCQ | 3,154 |
| Image MCQ | 74 |
| True/False | 2 |

### 15 Subjects
Mathematics, Science, Computing, English, Social Studies, French,
Ghanaian Language, History, Our World and Our People, Creative Arts,
Physical Education, Religious and Moral Education, Career Technology, Arabic, Mixed

### Class Levels (Ghana Education Service)
- **B4** = Primary 4 (Grade 4)
- **B5** = Primary 5 (Grade 5)
- **B6** = Primary 6 (Grade 6)
- **B7** = JHS 1 (Grade 7)
- **B8** = JHS 2 (Grade 8)
- **B9** = JHS 3 (Grade 9)

---

## 🛠️ Technical Notes & Pitfalls

1. **bcrypt** is pinned to `4.0.1` — newer versions break `passlib` at import
2. **Port 8000** is taken by MusicApp backend — Trivia uses **8001**
3. **Frontend** uses `.env` with `VITE_API_URL=http://localhost:8001` — this bypasses the Vite proxy
4. **Guest mode**: progress/scores are NOT persisted across devices/browsers. Sign-up persists.
5. **SQLite `create_all()`** does NOT add columns to existing tables. The API runs an idempotent `ALTER TABLE ... ADD COLUMN` for `question_type` and `image_url` on startup
6. **Always start Vite from `frontend/` directory** — starting from project root serves 404s
7. **`/media/questions/`** — static SVGs served by FastAPI `StaticFiles` mount in `main.py`
8. **`models.py`** — contains ALL models including Challenge and ChallengeSession
9. **Challenge endpoints** — expire after 24 hours; deterministic question selection by class+subject hash
10. **Badges** — stored in localStorage per device, not DB-persisted

---

## 📝 Recent Upgrades (2026-09)

### Image MCQs ✅
- 72 questions upgraded from `mcq` to `image_mcq` with real SVG diagrams
- 10 hand-drawn SVGs: lever, food-chain, plant-parts, water-cycle, circuit, desktop-computer, motherboard-cpu, open-circuit, body-organs, computer-parts
- All images served at `/media/questions/<name>.svg` → HTTP 200

### True/False ✅
- 2 questions converted: "A mouse is an input device. True or False?" → True, "Penguins are birds. True or False?" → True
- Infrastructure fully implemented in `question_types.py`, `Quiz.jsx` detects `isTF`

### Badges Earned In-App ✅
- 24 badges defined and fully wired
- `evaluateBadges()` called on quiz completion in Summary.jsx
- BadgeToast popup shows when new badge earned
- Profile.jsx reads `window.__lastQuizResult`, awards badges, updates grid
- Badges stored in localStorage per device

### Share Results ✅
- Share Result Card modal with full details: score, letter grade, stats, accuracy bar, date
- Copy to clipboard, share via Web Share API, close button
- Toast notification on copy/share
- CSS: `.share-overlay`, `.share-card`, `.share-score`, `.share-grade`, `.share-stats`, `.share-accuracy-bar`, `.share-toast`

### Friend Challenge / Head-to-Head ✅
- 4 backend endpoints: `POST /create`, `GET /{code}/questions`, `POST /{code}/submit`, `GET /{code}/compare`
- `Challenge` and `ChallengeSession` models added to `models.py`
- Frontend `Challenge.jsx` page: create/join/compare modes
- 6-letter alphanumeric challenge codes
- Deterministic question selection (same 12 questions for same code+class+subject)
- 24-hour expiry
- Side-by-side leaderboard comparison

### Night Sky Background ✅
- Deep navy gradient (#050a18 → #0f1f35)
- 200+ stars in 3 tiers with twinkle animations
- 5 faint planets orbiting (teal, gold, crimson, blue-white)
- Ringed planet (Saturn-like)
- Nebula haze
- Shooting star every ~12s
- Hidden on light theme

### CSS Design System ✅
- Restored from original + share card CSS appended
- 752 lines, 34,103 bytes, 293 balanced braces
- Vite build: 1.27s clean
- Ghana flag colors, dark/light themes, glass cards, responsive design

---

## 🔧 Server Management

### Restart Both Servers
```bash
# Kill old processes
pkill -f "uvicorn.*8001" 2>/dev/null
pkill -f "vite.*5173" 2>/dev/null
sleep 2

# Start backend
cd /home/stephen/Desktop/MY APP/backend
./venv/bin/python -m uvicorn src.main:app --host 0.0.0.0 --port 8001 &

# Start frontend
cd /home/stephen/Desktop/MY APP/frontend
npm run dev &
```

### Health Check
```bash
curl -s http://localhost:8001/health
curl -s -o /dev/null -w "Frontend: HTTP %{http_code}\n" http://localhost:5173/
```

### Build Frontend for Production
```bash
cd /home/stephen/Desktop/MY APP/frontend
npx vite build
```

---

## 📄 Files Created/Modified (2026-09-09)

| File | Change |
|------|--------|
| `backend/src/models.py` | Added `Challenge`, `ChallengeSession` models + restored all original models |
| `backend/src/routes/challenge.py` | NEW: Challenge endpoints (create, questions, submit, compare) |
| `backend/src/main.py` | Added `challenge_routes` import + `app.include_router(challenge_routes.router)` |
| `frontend/src/pages/Challenge.jsx` | NEW: Friend challenge page (create/join/compare) |
| `frontend/src/pages/Summary.jsx` | Fixed: `showShareCard` state properly passed to `renderSummary()` |
| `frontend/src/api.js` | Added `api.challenge` helper functions |
| `frontend/src/App.jsx` | Added `/challenge` route + `import Challenge` |
| `frontend/src/styles.css` | Share card CSS appended to restored design system (752 lines) |
| `README.md` | Updated with all features, API reference, upgrade history |
| `frontend/dist/` | Production build (1,603 files, 253MB) |

---

*Documentation generated 2026-09-09. App live at http://localhost:5173.*
