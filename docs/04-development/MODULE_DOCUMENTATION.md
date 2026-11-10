# MODULE_DOCUMENTATION.md

> Part of `docs/04-development/`. Map of the codebase — where things live and
> what each module does. Deep technical lore (mascot rigging, meshopt, walk
> cycle math) lives in `brain.md` + `models/README.md`; this is the index.

## Backend (`backend/`)

| Module | Responsibility |
|---|---|
| `src/main.py` | FastAPI app assembly: CORS, security headers, rate limits, proxy headers, static/media serving, SPA fallback, PWA routes |
| `src/config.py` | Pydantic settings from env: `DATABASE_URL`, `JWT_SECRET` (required), token expiries, pack size |
| `src/database.py` | Engine/session; **idempotent SQLite ALTER/CREATE INDEX migrations** (SQLite create_all never alters) |
| `src/models.py` | 13 SQLAlchemy models + admin `ROLE_PERMISSIONS` (see DATABASE_SCHEMA.md) |
| `src/auth.py` | JWT create/validate, password hashing (passlib/bcrypt), guest handling, current-user resolution |
| `src/schemas.py` / `schemas_admin.py` | Pydantic request/response contracts (incl. the no-answer-leak `QuestionOut`) |
| `src/scoring.py` | Points rules (10/15/25 × combo), streak math |
| `src/mastery.py` | Topic mastery score calculation (accuracy + volume) |
| `src/periods.py` | Weekly/monthly leaderboard period bucketing |
| `src/progress.py` | Per-subject/topic progress builder |
| `src/question_types.py` | mcq / true_false / image_mcq helpers + demo seed |
| `src/rate_limit.py` | slowapi configuration |
| `src/seed_admin.py` | Super-admin account bootstrap on startup |
| `src/routes/auth.py` | register, login, guest, me, password change, avatar, account deletion |
| `src/routes/quiz.py` | pack (no answer leak), check, submit, leaderboard, progress, challenge endpoints |
| `src/routes/admin.py` | Admin: dashboard, users, questions CRUD, school codes, settings, audit, monitor, exports, guest cleanup |
| `src/routes/curriculum.py` | Manifest + topics for the selection UI |
| `src/routes/challenge.py` | Create/join/submit/compare head-to-head |
| `scripts/migrate_sqlite_to_pg.py` | The proven SQLite→Postgres migration (M1's engine) |
| `static/questions/*.svg` | 10 image-question diagrams (served at `/media/questions/`) |
| `tests/test_question_types.py` | Backend pytest for question types |
| `trivia.db` | **The live database** — 7,710 questions + user data. Gitignored, precious. |

## Frontend (`frontend/`)

| Module | Responsibility |
|---|---|
| `src/main.jsx` | Entry, ErrorBoundary, fonts |
| `src/App.jsx` | React Router routes + AnimatePresence page transitions |
| `src/api.js` | The fetch client (all API calls go through this) |
| `src/auth.jsx` | AuthContext — JWT lifecycle, auto-validation on mount |
| `src/styles.css` | The complete design system (tokens, themes, glass cards, night sky) |
| `src/subjects.js` | Subject list + badge-subject mapping |
| `src/badges.js` | 24 badge definitions + evaluation (localStorage) |
| `src/sound.js` | SFX hooks (correct/wrong/streak/combo/click) |
| `src/pages/` | Landing, ChooseQuiz, Challenge, Play (redirect), Quiz, Summary, Leaderboard, Profile, Admin, Settings, PrivacyPolicy, TermsAndConditions, CookiePolicy |
| `src/components/` | Mascot system (Mascot, Mascot3D, WalkingMascot, SHSMascot, HeroStage, PesewaBody), AnimatedBg, KenteFrame, SoundToggle, ThemeToggle, Confetti |
| `tests/*.mjs` | 19 Node-runnable browser test scripts (see TEST_STRATEGY) |
| `android/` | Capacitor project (`com.kwizbox.app`) |

## Asset pipeline (special attention)

- `models/` = **source library** (masters, clips, previews, manifest with md5s,
  Blender scripts in `models/scripts/`).
- Browser loads from `frontend/public/assets/mascots-v2/animated/` — changes in
  `models/` do nothing until copied there (byte-identical requirement).
- GLBs are meshopt-compressed; `Mascot3D.jsx` must attach `MeshoptDecoder`.
- `models/README.md` holds the full rig contract — read it before touching 3D.

## Root-level

| Path | Responsibility |
|---|---|
| `scripts/` | Question bank tooling: parsers, generators, importers, vetters, quarantine logic |
| `docs/` | This documentation system (01–07) + historical APP_DOCUMENTATION.md |
| `Dockerfile`, `fly.toml`, `railway.toml` | Deploy configs |
| `.github/workflows/ci.yml` | CI: frontend build + backend smoke + gitleaks |
| `.github/workflows/fly-deploy.yml` | Fly.io deploy (added `cf1d9be`) |
| `brain.md`, `CLAUDE.md`, `project-log.md`, `roadmap.md` | Agent memory + history (absorbed into this system, kept canonical) |
| `REMEDIATION_PLAN.md`, `HARDENING_LOG.md` | Security work state |
