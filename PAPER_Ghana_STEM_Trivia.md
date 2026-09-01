# Ghana STEM Trivia: A Curriculum-Aligned Mobile Trivia Platform for Ghanaian Learners

**Author:** Stephen Barnie Amoako (Peswa)
**Date:** 2026-08-19 (updated)
**Project:** `ghana-stem-trivia` (local deployment + temporary public hosting)

---

## 1. Abstract

Ghana STEM Trivia is a web-based, mobile-first quiz platform designed to help
Ghanaian basic-school learners (Primary 4 / B4 through JHS 3 / B9) practice
Science, Mathematics, and Computing through short, gamified quizzes. The
application is built *foundation-first*: a verified backend and a 500+ question
seed were completed and tested before any user interface was written. This paper
describes the system's architecture, content model, scoring design, and the
recent user-experience redesign, and reflects on its fit for the Ghanaian
low-bandwidth, low-end-Android context.

## 2. Motivation

Ghana's basic education curriculum (managed by the National Council for
Curricular and Assessment, NaCCA) spans strands and topics across three STEM
subjects. Learners preparing for the Basic Education Certificate Examination
(BECE) benefit from frequent, low-stakes retrieval practice. Existing commercial
apps are often data-heavy, English-only in framing, or not mapped to the local
curriculum. Ghana STEM Trivia targets that gap with:

- **Curriculum alignment** — questions tagged by class · subject · strand/topic · difficulty.
- **Low-data design** — a Progressive Web App (PWA) that installs to the home
  screen and works like a native app with minimal bandwidth.
- **Inclusive access** — a guest mode that requires no account, plus registered
  accounts that persist progress and join leaderboards.

## 3. System Architecture

The application is a standard decoupled web stack:

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite 5 | Mobile-first SPA, `vite-plugin-pwa` |
| Backend | FastAPI + Uvicorn | REST API on port 8001 |
| Database | SQLite | Single-file store (`trivia.db`) |
| Auth | JWT (registered + guest) | `passlib` + pinned `bcrypt 4.0.1` |
| Animations | Framer Motion | Page transitions, mascot, score reveals |

### 3.1 Backend structure
- `src/main.py` — FastAPI app + CORS
- `src/models.py` — `User`, `Question`, `QuizSession`, `SchoolCode`
- `src/routes/auth.py` — register / login / guest / me
- `src/routes/quiz.py` — pack, submit, leaderboard
- `src/scoring.py` — points and speed-bonus rules

### 3.2 Frontend structure
- `pages/` — Landing, Play, Quiz, Summary, Leaderboard, Profile, Admin
- `auth.jsx` — `AuthContext` (token in `localStorage`)
- `api.js` — fetch client; Vite proxies `/api/*` → backend `:8001`
- `components/Mascot.jsx` — animated SVG learner mascot (no image assets)
- `components/AnimatedBg.jsx` — animated gradient background

## 4. Content Model

The question bank is the product's core asset. As deployed, the database holds
**669 questions** (vetted from a 200-question seed plus AI-generated, format-checked
additions) across three subjects and six class levels:

- **Subjects:** Computing, Mathematics, Science
- **Classes:** B4, B5, B6, B7, B8, B9
- **Each question** carries: `class_level`, `subject`, `topic`, `strand`,
  `difficulty` (Easy / Medium / Hard), four `options`, a hidden correct index,
  and a 1–4 sentence `explanation`.

Content was parsed from the product brief's PDF (`scripts/parse_questions.py`)
and loaded via `scripts/seed.py`. A critical privacy/integrity rule: the
`/quiz/pack` endpoint **never leaks the correct answer** — it returns only
options and metadata, so clients cannot cheat by inspecting the payload.

## 5. Scoring Design

Scoring rewards both accuracy and pace, but stays simple enough for learners to
understand:

- **Base points** by difficulty: Easy = 10, Medium = 15, Hard = 25.
- **Per-question speed bonus:** up to **+10** when a question is answered within
  6 seconds, with a linear falloff to zero by 30 seconds. The bonus is computed
  on the time spent on **that specific question** (not the quiz average), so
  answering early is directly rewarded.
- **No penalty for slow answers:** a question answered in 30 s or more still earns
  the full base points; the quiz never restarts or deducts for taking time.
- **Wrong answers** award 0 points but always return the explanation, turning
  mistakes into teachable moments.

Guest submissions are graded but **not persisted** (no leaderboard entry);
registered users accumulate lifetime score, accuracy, and question counts.

## 6. User Experience: The Redesign

The initial UI was functional but conventional. A recent pass upgraded it to a
**premium, glassy, animated mobile-first** experience without changing any
backend behaviour:

- **Typography** — Space Grotesk (display) + Inter (body) loaded from Google Fonts.
- **Visual depth** — a deep gradient background (`#04140d → #06241a → #081f2e`)
  with three slowly floating, blurred colour "blobs" for living motion.
- **Glassmorphism** — frosted, blurred cards (`backdrop-filter: blur(18px)`)
  with subtle borders replace flat white panels.
- **Motion** — Framer Motion page transitions switched from linear fades to
  **spring physics** (bouncier, snappier); the landing title and mascot
  "pop" in on load; the progress bar and score counters glow.
- **Leaderboard polish** — top three rows are highlighted gold / silver /
  bronze with glow.

The redesign is **frontend-only** (CSS + a few component tweaks + one new
background component), so all verified API behaviour is unchanged.

## 7. Verification

The running deployment was smoke-tested end-to-end (local and through the public
tunnel):

| Check | Result |
|-------|--------|
| Backend root `/` + `/health` | HTTP 200 |
| Register new account | JWT returned |
| Guest login | JWT returned |
| `/quiz/pack` (Science, B6) | Returns question + options, **no answer leak** |
| `/quiz/leaderboard` (global) | Returns ranked players with scores/accuracy |
| Forgot-password flow (question → verify → login) | Full flow 200; wrong answer 401 |
| Quiz submit with per-question speed bonus | Early = base+10, slow = base only, never penalised |
| Frontend build (Vite) | exit 0, all modules transform |
| Public Cloudflare link (SPA + API, single origin) | 200 through tunnel |
| Database | 669 questions, 4 admin users (students/guests wiped) |

## 7b. Note on hosting

For testing, the app is published via a **Cloudflare quick tunnel** (free, no
account): the FastAPI backend serves both the built SPA and the API from a single
origin (`:8001`), tunnelled through `cloudflared`. This avoids Cloudflare's WAF
blocking of proxied `/api` paths. The tunnel URL is temporary and changes on each
restart; a permanent deployment (Cloudflare Pages + Worker, or a VPS) remains
future work.

## 8. Limitations and Future Work

Per the project's own scope notes, the Phase 1 MVP deliberately omits:

- **Adaptive difficulty** — packs are selected by the learner, not by performance.
- **Offline question packs** — content requires a network call.
- **Badges / achievements** — progression is score-only.
- **School-code-gated experiences** — the `school_codes` table exists but is not yet wired into class-level competition.

A monetization layer (B2B school licences, freemium exam-prep packs, or
rewarded ads) was discussed but not implemented; the current product keeps all
core learning free, which is appropriate for the target audience.

## 9. Conclusion

Ghana STEM Trivia demonstrates a pragmatic, curriculum-aware approach to
supplementary STEM practice for Ghanaian learners. Its foundation-first
engineering, privacy-conscious content delivery, and lightweight PWA form factor
make it a strong base for real classroom and at-home use. The recent glassy
redesign shows that a serious educational tool need not look dated — engaging
visual design and rigorous backend verification can coexist.

---

*Appendix — Local access: backend `http://127.0.0.1:8001`, frontend
`http://localhost:5173`. API docs at `http://127.0.0.1:8001/docs`.*
