# HOW_TO_WORK.md — How to work on KwizBox

> Complete onboarding guide for any new AI agent or developer joining this
> project. Read this file first, then follow the chain: AGENTS.md → README.md
> → PROJECT_STATUS.md → SESSION_HANDOFF.md → docs/01–docs/07.

---

## 1. What this project is

**KwizBox** — a mobile-first, curriculum-aligned STEM trivia app for Ghanaian
learners. It covers Primary 4 (B4) through JHS 3 (B9), plus senior levels
S1–S3 and SHS 1–3.

**Tech stack:**
- **Frontend:** React 18 + Vite (PWA via vite-plugin-pwa), Capacitor for Android
- **Backend:** FastAPI + SQLite (JWT auth, guest sessions, rate limiting)
- **Content:** 7,890 questions across 16 subjects, tagged by class/subject/
  topic/difficulty, each with a 1–4 sentence explanation
- **3D mascot:** React Three Fiber, real-time character (4 variants)
- **Design:** Ghana-flag colors, glassmorphism, night-sky background,
  dark/light theme toggle, confetti celebrations

---

## 2. Repository layout

```
KwizBox/
├── AGENTS.md                  # Operating rules (READ FIRST)
├── README.md                  # Project map, stack, run guide, API ref
├── PROJECT_STATUS.md          # Current phase, milestones, blockers
├── SESSION_HANDOFF.md         # Last session done, next actions
├── CHANGELOG.md               # Notable changes (newest first)
├── CONTRIBUTING.md            # How to contribute (humans + AI)
├── Master P                     # Master prompt (governance framework)
├── .env.example               # 34-line environment variable template
├── .gitignore                 # Git ignore rules
├── docs/
│   ├── 00-getting-started.md  # ← This file — how to work on the project
│   ├── 01-project-planning/   # Brief, discovery, requirements, scope, roadmap
│   ├── 02-architecture/       # System, tech stack, DB schema, API, security
│   ├── 03-design/             # UI/UX guidelines, user flows
│   ├── 04-development/        # Coding standards, dependency register, etc.
│   ├── 05-testing/            # Test strategy, results, bug tracker
│   ├── 06-deployment/         # Deployment, environment, backup/recovery
│   ├── 07-project-history/    # Decision log, ADRs, lessons learned
│   └── README.md              # Index pointing to the right docs
├── backend/
│   ├── src/
│   │   ├── main.py            # FastAPI app + CORS + static/media
│   │   ├── config.py          # Settings (DB, JWT, pack size)
│   │   ├── database.py        # Engine/session, idempotent SQLite ALTER migrations
│   │   ├── models.py          # SQLAlchemy models (13)
│   │   ├── auth.py            # JWT, password hashing, optional/guest user
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── schemas_admin.py   # Admin schemas
│   │   ├── question_types.py  # mcq | true_false | image_mcq
│   │   ├── mastery.py         # Topic mastery calculation
│   │   ├── periods.py         # Weekly/monthly bucketing
│   │   ├── progress.py        # Per-subject + per-topic progress
│   │   ├── seed_admin.py      # Seeds super admin on startup
│   │   └── routes/
│   │       ├── auth.py        # register, login, guest, me, password reset
│   │       ├── quiz.py        # pack, check, submit, leaderboard, progress
│   │       ├── admin.py       # dashboard, users, questions CRUD, etc.
│   │       ├── curriculum.py  # GET /curriculum/manifest + /topics
│   │       └── challenge.py   # POST /create, GET /{code}/questions, etc.
│   ├── trivia.db              # SQLite — 7,890 questions, user data
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.jsx           # React entry, ErrorBoundary
│   │   ├── App.jsx            # React Router + page transitions
│   │   ├── api.js             # fetch client → backend
│   │   ├── auth.jsx           # AuthContext (JWT in localStorage)
│   │   ├── styles.css         # Design system (dark/light, Ghana flags, etc.)
│   │   ├── badges.js          # 24 badge definitions
│   │   ├── subjects.js        # SUBJECTS list (15 subjects)
│   │   ├── sound.js           # SFX hooks
│   │   ├── subjects.js        # SUBJECTS + BADGE_SUBJECT_MAP
│   │   └── components/        # Mascot, AnimatedBg, KenteFrame, etc.
│   │   └── pages/             # Landing, ChooseQuiz, Challenge, Quiz,
│   │                            #   Summary, Leaderboard, Profile, Admin
│   ├── public/                # PWA assets
│   ├── vite.config.js         # Vite: PWA config, port 5173, /api + /media proxy
│   ├── .env                   # VITE_API_URL=http://localhost:8001
│   └── package.json
└── scripts/                   # Question parsers, generators, importers, vetting
```

---

## 3. Running the app locally

### Prerequisites

- Python 3.12+
- Node.js 18+ (with npm)
- No special hardware needed for web dev; Android emulator only for mobile testing

### Backend (port 8001)

```bash
cd /media/stephen/FILES/My\Projects/KwizBox/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
./venv/bin/python -m uvicorn src.main:app --host 0.0.0.0 --port 8001
```

Health check: `curl http://localhost:8001/health` → `{"status":"ok","service":"kwizbox"}`

### Frontend (port 5173 or 5174)

```bash
cd /media/stephen/FILES/My\Projects/KwizBox/frontend
npm install
npm run dev
```

The Vite dev server auto-increments to 5174 when 5173 is busy — both work.
The `.env` file sets `VITE_API_URL=http://localhost:8001` so the frontend
bypasses the Vite proxy and calls the backend directly.

---

## 4. Key facts about the app

- **Guest mode**: any nickname + class level → temporary session (device-only
  storage, no persistence). Works out of the box (CORS configured for
  localhost:5173/5174).
- **Rate limits**: register 10/min, quiz/check 30/min, admin token 5/min
  (security features, not app bugs).
- **Password reset**: intentionally NOT shipped in this release. Registration
  still collects a security answer but it is never used for recovery.
- **Female mascots**: `shs_female` and `youth_female` are unrigged (no skin,
  no animation clips). They render a static pose — the state machine maps
  them but no clip exists. This is a known limitation.
- **3D mascot loading**: the browser loads from `frontend/public/assets/mascots-v2/
  animated/`, which is a copy of `models/models/`. The `models/` folder is the
  source library; the public/ copy is what's served.
- **Admin access**: login as admin (password from `.env` or seed_admin.py),
  then visit `/admin` in the frontend.

---

## 5. Documentation conventions

- **Root files** (AGENTS.md, README.md, PROJECT_STATUS.md, SESSION_HANDOFF.md,
  CHANGELOG.md, CONTRIBUTING.md): quick-reference, entry point, status.
- **docs/01–docs/07**: detailed technical documentation.
- **docs/README.md**: index — read this to find the right detailed doc.
- **Docs update rule**: every feature/change gets a CHANGELOG entry, a docs
  update, and (if architectural) an ADR. Record actual test results in
  `docs/05-testing/TEST_RESULTS.md`. At session end, update
  PROJECT_STATUS.md and SESSION_HANDOFF.md.

---

## 6. Git rules

- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`
- Frontend: run `npm run build` to verify the production build compiles.
- Backend: run `cd backend && ./venv/bin/python -m py_compile src/main.py`
  to verify imports.
- Admin token: `curl -X POST http://localhost:8001/admin/token` with
  `{"username":"admin","password":"..."}` — then include `Authorization:
  Bearer <token>` on protected endpoints.
- Secrets: NEVER commit `.env` contents, JWT secrets, DB passwords, or API keys.
  CI runs gitleaks (full history).
- History rewrite: `git-filter-repo` is used for sensitive-data purge.
  Pre-rewrite SHAs are dead. Commit map at `.git/filter-repo/commit-map` (local).

---

## 7. Testing

| Test level | Command | What it covers |
|---|---|---|
| Route smoke | `node tests/route-smoke.mjs http://localhost:5174` | All routes render |
| Auth smoke | `node tests/smoke-auth.mjs` | Auth endpoints, cookies, headers, rate limits |
| Full E2E | `node tests/full-e2e.mjs` | Auth + quiz + admin + challenge + security |
| Guest flow | `node tests/e2e-guest.mjs` | Guest → quiz → submit → leaderboard |
| Register flow | `node tests/e2e-register.mjs` | Registration flow |

Playwright UI tests (guest/register flows) require a browser — run
`npx playwright install chromium` in frontend/ first. Known test-harness
limitation: unknown browser version mismatch (chromium_headless_shell-1254
not installed); verified the guest flow works via debug scripts in the
task trail.

---

## 8. Five memory layers (project memory system)

Every task in this project draws from these five layers:

1. **Project identity/objectives** — `README.md`, `AGENTS.md`, `PROJECT_STATUS.md`
2. **Technical/architectural knowledge** — `docs/02-architecture/` (SYSTEM_*
   files, DATABASE_SCHEMA.md, API_DOCUMENTATION.md, SECURITY_ARCHITECTURE.md)
3. **Decision history** — `docs/07-project-history/DECISION_LOG.md` + `decisions/`
   (ADR-001 through ADR-005)
4. **Development/execution history** — `CHANGELOG.md` (newest first)
5. **Session continuity** — `SESSION_HANDOFF.md` (what the last session did)

---

## 9. Current milestones (owner decisions recorded 2026-11-10/11)

| ID | Milestone | Status |
|---|---|---|
| M0 | Project initialization & governance | ✅ Done & approved |
| M0.5 | PR #2 merge + question import | ✅ Done (7,890 questions in DB) |
| M0.7 | BUG-007 purge (sensitive history removal) | ✅ Executed |
| M1 | SQLite → Postgres (Supabase) migration | ❌ **Rejected** — app stays on SQLite |
| M2 | Backend hosting/deployment | ❌ **Rejected** — no hosting |
| M3 | Android APK rebuild (Capacitor) | Not started — pending owner approval |
| M4 | Play Store submission | Not started — needs $25 developer account |
| M5 | Post-launch stabilization & feature work | Not started |

---

## 10. Troubleshooting

**Backend crashes on startup**: set `ADMIN_PASSWORD` env var. The seed script
refuses to run without it.

**CORS errors on guest login**: add `http://localhost:5173` and
`http://localhost:5174` to `backend/src/main.py` `ALLOWED_ORIGINS`.

**Frontend serves 404**: always start Vite from the `frontend/` directory,
not the project root.

**Question bank wrong count**: verify against `curl http://localhost:8001/
health` → look at the `curriculum/manifest` endpoint. Roots: DB is the
source of truth, not documentation.

---

## 11. Contacts & references

- **Project owner**: Stephen (KNUST Agric Biology 2018–2022)
- **GitHub repo**: git@github.com:AmoakoBarnie/KwizBox.git (branch `main`)
- **Working copy**: `/media/stephen/FILES/My Projects/KwizBox`
- **Dev server (backend)**: http://localhost:8001
- **Dev server (frontend)**: http://localhost:5173 or http://localhost:5174
EOF
