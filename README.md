# KwizBox

Fun, curriculum-aligned STEM trivia for Ghanaian learners — Primary 4 / B4 through
JHS 3 / B9, plus senior levels S1–S3 and SHS 1–3. NaCCA-aligned. 7,890 questions
across 16 subjects. Built foundation-first: backend + question bank verified before the UI.

> **Working repository:** `/media/stephen/FILES/My Projects/KwizBox` ·
> **Remote:** `github.com/AmoakoBarnie/KwizBox` (branch `main`)

## Project organization & documentation map

Start with **`AGENTS.md`** — it defines how work is done here (read-first protocol,
verification rules, feature workflow, security rules). Then:

| Path | Purpose |
|---|---|
| `AGENTS.md` | Operating rules for AI agents and developers — **read first** |
| `PROJECT_STATUS.md` | Current phase, milestones, blockers, pending decisions |
| `SESSION_HANDOFF.md` | Continuity: what the last session did, next exact actions |
| `CHANGELOG.md` / `CONTRIBUTING.md` | Notable changes · how to contribute |
| `brain.md` / `CLAUDE.md` / `project-log.md` / `roadmap.md` | Accumulated technical knowledge · runbook · append-only history · day-to-day board |
| `docs/01-project-planning/` | Brief, discovery, requirements (REQ-IDs), scope, milestone roadmap |
| `docs/02-architecture/` | As-built system, technology stack, DB schema (13 tables), API (52 routes), security |
| `docs/03-design/` | User flows, UI/UX guidelines |
| `docs/04-development/` | Implementation plan, coding standards, module map, dependencies, traceability |
| `docs/05-testing/` | Test strategy, results evidence log, bug tracker |
| `docs/06-deployment/` | Deployment, environment setup, backup & recovery |
| `docs/07-project-history/` | Decision log, ADRs (`decisions/`), lessons learned |
| `backend/` · `frontend/` · `scripts/` · `models/` | FastAPI API · React PWA + Android · question tooling · 3D mascot library |

## Stack
- **Frontend:** React + Vite (PWA via `vite-plugin-pwa`). Mobile-first, low-data.
- **Backend:** FastAPI + SQLite. JWT auth (registered + guest).
- **Content:** 7,890 questions across 16 subjects (13 subjects + Mixed), tagged by
  class (B4–B9) · subject · strand/topic · difficulty, each with a 1–4 sentence
  explanation. 7,710 + 180 from PR #2 (imported 2026-11-10).

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
│   │   ├── xp.py            # levels 1–10, weekly leagues, streak calendar
│   │   ├── seed_admin.py    # seeds super admin account on startup
│   │   └── routes/
│   │       ├── auth.py      # register, login, guest, me, password reset
│   │       ├── quiz.py      # pack, check, submit, leaderboard, progress
│   │       ├── admin.py     # dashboard, users, questions CRUD, school codes,
│   │       │                #   settings, audit, monitor, exports
│   │       ├── curriculum.py# GET /curriculum/manifest + /topics
│   │       ├── challenge.py # POST /create, GET /{code}/questions,
│   │       │                  #   POST /{code}/submit, GET /{code}/compare
│   │       └── duel.py      # WS /ws/duel/{code} — display-only relay
│   │   └── static/questions/ # 10 SVGs for image_mcq (lever, food chain, etc.)
│   ├── trivia.db            # SQLite — questions, users, sessions (gitignored)
│   ├── trivia.db.bak_*      # backup snapshots (gitignored)
│   ├── tests/               # pytest: question types + duel relay
│   └── requirements.txt     # Python deps (FastAPI 0.115, SQLAlchemy 2.0, etc.)
├── frontend/
│   ├── src/
│   │   ├── main.jsx         # React entry, ErrorBoundary, Google Fonts
│   │   ├── App.jsx          # React Router + AnimatePresence page transitions
│   │   ├── api.js           # fetch client (credentials: 'include', same-origin proxy in dev)
│   │   ├── auth.jsx         # AuthContext (HttpOnly cookie session, auto-validate on mount)
│   │   ├── styles.css       # Complete design system — dark/light themes, glass cards,
│   │   │                      #   Ghana flag accents, night sky background, ~752 lines
│   │   ├── subjects.js      # SUBJECTS list (15 subjects) + BADGE_SUBJECT_MAP
│   │   ├── sound.js         # SFX hooks: correct, wrong, streak, combo, click
│   │   ├── badges.js        # 24 badge definitions + evaluateBadges + loadBadges/saveBadges
│   │   ├── duel.js          # useDuelRoom — display-only live duel WebSocket hook
│   │   ├── mascotPrefs.js   # 3D/2D mascot preference (localStorage, same-tab bus)
│   │   ├── mascotClips.js   # resolves exported GLB clip names (idle_*_Mascot_Rig)
│   │   ├── shareCard.js     # 1080×1350 PNG result card (canvas)
│   │   └── components/
│   │       ├── HeroStage.jsx# Animated hero letter interaction (landing page)
│   │       ├── Mascot.jsx   # KwizBox mascot — gender + class level variants,
│   │       │                #   states: thinking/celebrate/encourage/sad/thinking
│   │       ├── Mascot.css   # Mascot component styles
│   │       ├── Mascot3D.jsx # R3F 3D mascot — loads models/, state-driven clips
│   │       ├── Mascot3D.css # 3D mascot container styles
│   │       ├── WalkingMascot.jsx # Mascot with locomotion (walk clip)
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
│   ├── tests/               # Playwright e2e + unit checks
│   ├── vite.config.js       # Vite: port 5173, per-route proxy + WebSocket /ws
│   ├── .env.development     # VITE_API_URL= (empty → same-origin proxy, cookie-safe)
│   ├── index.html           # Entry HTML
│   └── package.json         # React 18, React Router 6, Framer Motion 13, React Confetti 6
├── scripts/                 # Question parsers, generators, importers, vetters
├── models/                  # 3D mascot source library (masters + clips + renders)
│   ├── models/              # 4 canonical rigged masters (.glb)
│   ├── clips/               # Per-clip animation GLBs (idle/celebrate/encourage/walk/blink)
│   ├── previews/            # Reference renders (front / profile / three-quarter)
│   ├── manifest.json        # Provenance: source path, md5, rig + clip inventory
│   └── README.md            # Rig contract, load paths, regeneration
├── docs/
│   ├── APP_DOCUMENTATION.md # Complete app documentation (features, API, run guide)
│   └── ...
└── README.md               # This file
```

## Run (local dev)

### Backend (port 8001)
```bash
cd "/media/stephen/FILES/My Projects/KwizBox/backend"
ADMIN_PASSWORD='<choose-one>' ./venv/bin/python -m uvicorn src.main:app --host 0.0.0.0 --port 8001
```
`ADMIN_PASSWORD` is required — startup seeds the super-admin and refuses to run without it.
**Health check:** `curl http://localhost:8001/health` → `{"status":"ok","service":"KwizBox"}`

### Frontend (port 5174)
```bash
cd "/media/stephen/FILES/My Projects/KwizBox/frontend"
npm run dev -- --port 5174 --strictPort
```
Open `http://localhost:5174` (use `localhost`, not `127.0.0.1`). `.env.development`
keeps `VITE_API_URL=` empty so the app calls its own origin and Vite proxies the
API routes plus `/ws` to the backend — that keeps the HttpOnly session cookie
first-party. First-time setup: `docs/06-deployment/ENVIRONMENT_SETUP.md`.

Guest mode: any nickname + class level → temporary session (device-only storage).

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
- Login with nickname + password → JWT in an HttpOnly `Secure` `SameSite=Strict` cookie (30-day expiry)
- Guest mode: temporary session, no persistence
- Session cookie is auto-validated on app load; JavaScript never reads the token

> **Dead-end (documented):** password reset is intentionally **not shipped** in
> this release. There is no `/auth/reset/question` or `/auth/reset/verify`
> endpoint implementation; registration still asks for a security answer but it is
> never used for recovery. Do not rely on password reset.

### Quiz Selection (`/choose-quiz`)
- Select class (B4–B9) → subject (15) → topic → sub-topic
- Inline expandable sections (no popup overlay)
- Challenge mode toggle (Free play / Daily challenge)
- **Offline practice card:** save up to 12 questions for the selected
  class/subject/topic, start the saved pack, or remove it from the device
- Animated mascot + Kente title
- Start button with green glow

### Friend Challenge / Head-to-Head (`/challenge`)
- **Create** a challenge: pick class + subject → get a 6-letter code (e.g., `UHAYGK`)
- **Share** the code with a friend
- **Join** with the code → get the exact same 12 questions
- **Play** simultaneously, then **compare** scores on a leaderboard
- **Live duel room**: both players join a display-only WebSocket keyed by the
  code — the lobby shows who is connected, and Quiz shows the rival's progress
  (`1/12 · N ✓`) and `Finished` state. Scores still come only from the
  server-authoritative challenge submit.
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

### Offline practice
- Save up to 12 questions **with their answer key** to IndexedDB
  (`kwizbox-offline-practice` / `packs` / `active`); localStorage fallback
  `kwizbox_offline_practice_pack`
- Question diagrams cached in Cache Storage (`kwizbox-offline-media`) and read
  explicitly while offline
- `?offline=true` loads the saved pack and grades locally — no `/quiz/check`,
  `/quiz/submit`, duel or challenge requests
- Practice-only: no XP, badges, streak, seen-history or leaderboard writes;
  Summary shows a “saved on this device only” banner and hides the leaderboard
  action
- `POST /quiz/offline-pack` refuses daily challenge packs so a live
  competition’s answers cannot be downloaded ahead of time
- Web caveat: reloading the page while offline needs a connection because the
  PWA service worker is currently disabled; Android/Capacitor bundles the app
  shell locally
- Design trade-off: `docs/adr/0003-offline-practice-answer-keys.md`

### Results Summary (`/summary`)
- Score, accuracy, letter grade, stat rings
- Action buttons: Play Again / Leaderboard / Share Result
- **Share Result Card modal:** full card with score, grade, stats, accuracy bar, date
- Copy to clipboard, share via Web Share API, close button
- Badge evaluation on quiz completion
- Offline results show a device-only banner and skip badge/leaderboard actions

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

### Mascot 3D (`models/`)

The mascot is a real-time 3D character (React Three Fiber), not a sprite or GIF.

**Characters** — 4 variants, class level × gender:

| Slug | File | Rigged | Clips |
|---|---|---|---|
| `shs_male` | `models/models/shs_male.glb` | ✅ 14 joints | idle, celebrate, encourage, walk, blink |
| `youth_male` | `models/models/youth_male.glb` | ✅ 14 joints | idle, celebrate, encourage, walk, blink |
| `shs_female` | `models/models/shs_female.glb` | ❌ **unrigged** | none |
| `youth_female` | `models/models/youth_female.glb` | ❌ **unrigged** | none |

**Animation contract** — the component maps app state to clip names, so clip
names must match exactly or the mascot freezes:

| App state | Clip | Loop |
|---|---|---|
| `thinking` | `idle` | yes |
| `celebrate` | `celebrate` | no (returns to idle) |
| `encourage` | `encourage` | yes |
| `walking` | `walk` | yes |
| *(random)* | `blink` | no |

**Load path** — `Mascot3D.jsx` serves from `frontend/public/assets/mascots-v2/animated/`,
which is byte-identical to `models/models/`. `models/` is the source library
(masters + split clips + renders); the `public/` copy is what the browser fetches.
See `models/README.md` for the full rig contract and how to regenerate.

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
- PWA assets exist, but the service worker is currently disabled; offline
  practice works while the app stays open (native builds bundle the app shell)
- Accessibility: focus-visible rings, skip-nav link, reduced-motion support

## API quick reference
Base URL: `http://localhost:8001`

**Auth:**
- `POST /auth/register` → `{nickname,password,class_level?,school_code?,security_question,security_answer}` → sets HttpOnly session cookie
- `POST /auth/login` → `{nickname,password}` → sets HttpOnly session cookie
- `POST /auth/guest` → `{nickname?,class_level?,school_code?}` → guest session cookie (is_guest=true)
- `GET /auth/me` (session cookie) → user profile

> **Dead-end (documented):** password reset via security question is not
> implemented on the server. Registration still collects a security question and
> answer, but it is never used to reset or recover a password. Treat password
> reset as unavailable in this release.

**Quiz:**
- `POST /quiz/pack` → `{class_level, subject, topic?, sub_topic?, difficulty?, count?, daily?, exclude_ids?}` (optional cookie/Bearer) → questions **without** answers
- `POST /quiz/offline-pack` → same body (optional cookie/Bearer) → questions **with** `answer_index` + `explanation` for device-local practice; no session/seen/progress writes; daily packs refused
- `POST /quiz/check` → `{question_id, selected_index}` (optional cookie/Bearer) → `{is_correct, correct_index, explanation}`
- `POST /quiz/submit` → graded result + feedback
- `GET /quiz/leaderboard?scope=&class_level=&school_code=&limit=` → ranked entries
- `GET /quiz/progress` (cookie/Bearer) → detailed progress

**Challenge:**
- `POST /quiz/challenge/create` → `{code, class_level, subject, question_count}` (Bearer)
- `GET /quiz/challenge/{code}/questions` → `{questions: [...]}` (same 12 questions for all)
- `POST /quiz/challenge/{code}/submit` → `{score, correct, total, accuracy}` (Bearer)
- `GET /quiz/challenge/{code}/compare` → `{leaderboard, player_count, my_rank}`

**Live duel (display-only WebSocket):**
- `WS /ws/duel/{code}?nickname=…` → presence, `progress`, `finished`, `left`
- Never carries answers or official scores; see `docs/adr/0002-live-duel-relay.md`

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

## Question counts (trivia.db — verified 2026-11-10, after PR #2 import)
```
Total: 7,890 questions (16 subjects)
By subject:  Math 3,395 | Science 1,415 | Physics 794 | Computing 724 | Chemistry 302
             ICT 242 | Biology 185 | English 131 | Social Studies 128 | Economics 116
             French 99 | Geography 96 | Agric Science 87 | Government 75 | RME 71 | Elective Math 30
By class:    B4 559 | B5 586 | B6 595 | B7 900 | B8 574 | B9 644
             S1 808 | S2 360 | S3 413 | SHS 1 1,877 | SHS 2 450 | SHS 3 124
By type:     MCQ: 7,816  |  Image MCQ: 74  (true_false supported by code, none in DB)
```
> Earlier revisions of this file said 3,230 questions / B4–B9 only — the bank has
> since grown (PR #2 added 180 on 2026-11-10) and senior levels were added.
> `CLAUDE.md` and the live DB are the source of truth.

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
- Frontend uses `.env.development` with an empty `VITE_API_URL` — the app calls its
  own origin and Vite proxies `/auth/*`, `/quiz/*`, `/admin/*`, `/curriculum/*`,
  `/media/*`, `/health` and `/ws` to `:8001`. Pointing it directly at
  `http://localhost:8001` makes Chrome drop the `Secure` session cookie.
- Guest mode: progress/scores are NOT persisted across devices/browsers. Sign-up persists.
- SQLite `create_all()` does NOT add columns to existing tables. On startup the API runs
  an idempotent `ALTER TABLE ... ADD COLUMN` for `question_type` and `image_url`.
- Always start Vite from the `frontend/` directory — starting from project root serves 404s.
- The `trivia.db` file is the question bank (7,890 questions). Keep it safe.
- Both servers must be running for the app to work. Backend `:8001`, Frontend `:5173`.
- **Female mascots are not rigged.** `shs_female` and `youth_female` in `models/models/`
  carry no skin and no animation clips, but `Mascot3D.jsx` maps them into the same
  state machine as the males — so selecting a female mascot renders a static pose
  (the `idle`/`celebrate`/`encourage` lookups find no clip and silently no-op).
  Rigging them is a Blender job: `animate_mascots.py` currently loops only
  `youth` and `shs`, so it needs a female pass before the clips can be authored.
- **`models/` is a source library, not a runtime path.** The browser loads
  `frontend/public/assets/mascots-v2/animated/`. If you replace a master in
  `models/models/`, you must also copy it to that `public/` path or the change
  will never reach the app. `models/manifest.json` records the committed md5
  (plus `source_md5` for the original exports); `models/README.md` has the
  one-liner that verifies all 26 assets and the `cmp` loop for the shipped copies.
