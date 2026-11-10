# REQUIREMENTS.md

> Part of `docs/01-project-planning/`. Requirements with unique identifiers.
> This documents the **as-built** system (verified from code and live DB,
> 2026-11-10) plus non-functional requirements. New requirements get new IDs.
> Traceability: `docs/04-development/TRACEABILITY.md`.

## Identifier scheme

`REQ-<DOMAIN>-<NNN>` — domains: AUTH, QUIZ, CHAL, CURR, ADM, CONT, SEC, NFR.

## Functional requirements — AUTH

| ID | Requirement | Status |
|---|---|---|
| REQ-AUTH-001 | Users can register with nickname, password, class level, optional school code, age and sex | Implemented (age/sex added in `7cb030a`) |
| REQ-AUTH-002 | Users can log in with nickname + password and receive a JWT | Implemented |
| REQ-AUTH-003 | Anyone can play as a guest (nickname + class level) with a device-local session; guests are graded but **not** persisted to leaderboards | Implemented |
| REQ-AUTH-004 | Users can delete their own account (`DELETE /auth/me`) | Implemented |
| REQ-AUTH-005 | Users can change their password (`PUT /auth/me/password`) | Implemented |
| REQ-AUTH-006 | Users can customize an avatar (skin, hat, accessory, gender — `PATCH /auth/me/avatar`) | Implemented |
| REQ-AUTH-007 | Password reset via security question | **Retired** (P0-3, commit `de496c2`); `security_question` columns remain in schema |

## Functional requirements — QUIZ

| ID | Requirement | Status |
|---|---|---|
| REQ-QUIZ-001 | Users can fetch a quiz pack filtered by class level, subject, topic/sub-topic, difficulty, count | Implemented (`POST /quiz/pack`) |
| REQ-QUIZ-002 | Pack responses must **not** leak the correct answer (`answer_index`, `explanation`) | Implemented (verified convention) |
| REQ-QUIZ-003 | Answers are checked server-side with immediate feedback | Implemented (`POST /quiz/check`) |
| REQ-QUIZ-004 | Quiz submission is graded server-side and persisted for registered users | Implemented (`POST /quiz/submit`) |
| REQ-QUIZ-005 | Logged-in users do not get questions they have already seen until the pool is exhausted | Implemented (`user_question_seen`) |
| REQ-QUIZ-006 | A daily challenge serves the same questions to everyone for a given UTC date | Implemented |
| REQ-QUIZ-007 | Leaderboards in 5 scopes: global, class, school, weekly, monthly | Implemented |
| REQ-QUIZ-008 | Per-subject and per-topic progress with mastery scores are tracked and exposed | Implemented (`GET /quiz/progress`) |
| REQ-QUIZ-009 | Scoring: Easy 10 / Medium 15 / Hard 25 points, × combo multiplier; streak tracking | Implemented |
| REQ-QUIZ-010 | Badge system (24 badges) evaluated on quiz completion | Implemented (frontend, localStorage) |

## Functional requirements — CHAL (friend challenges)

| ID | Requirement | Status |
|---|---|---|
| REQ-CHAL-001 | Create a challenge: pick class + subject → receive a 6-letter code | Implemented |
| REQ-CHAL-002 | Joining via code yields the identical question set (deterministic selection) | Implemented |
| REQ-CHAL-003 | Challenge comparison leaderboard with player ranks | Implemented |
| REQ-CHAL-004 | Challenge codes expire after 24 hours | Implemented |

## Functional requirements — CURR (curriculum)

| ID | Requirement | Status |
|---|---|---|
| REQ-CURR-001 | Curriculum manifest endpoint: subjects → class levels → topics → sub-topics | Implemented |
| REQ-CURR-002 | Topics endpoint for quiz selection UI | Implemented |
| REQ-CURR-003 | Content covers B4–B9, S1–S3, SHS 1–3 across 16 subjects, tagged strand/topic/difficulty | Implemented (7,710 questions verified) |

## Functional requirements — ADM (admin)

| ID | Requirement | Status |
|---|---|---|
| REQ-ADM-001 | Separate admin authentication with roles (super_admin, question_manager, school_manager, moderator) and permission sets | Implemented |
| REQ-ADM-002 | Dashboard stats: users, questions, sessions, activity | Implemented |
| REQ-ADM-003 | User management: view, activate/deactivate, set class/school | Implemented |
| REQ-ADM-004 | Question CRUD + activate/deactivate + search/filter | Implemented |
| REQ-ADM-005 | School code management with expiry and use limits | Implemented |
| REQ-ADM-006 | Audit log of admin actions | Implemented |
| REQ-ADM-007 | Live monitor of active play | Implemented |
| REQ-ADM-008 | CSV exports: questions, users, sessions/leaderboards | Implemented |
| REQ-ADM-009 | System settings management | Implemented |
| REQ-ADM-010 | Guest cleanup (delete guest users) | Implemented |

## Functional requirements — CONT (content)

| ID | Requirement | Status |
|---|---|---|
| REQ-CONT-001 | Multiple question types: mcq (4 options), true_false (2 options), image_mcq (with diagram) | Implemented (DB currently: 7,636 mcq + 74 image_mcq; true_false supported by code) |
| REQ-CONT-002 | Every question carries a 1–4 sentence explanation | Implemented |
| REQ-CONT-003 | Image questions served from `/media/questions/*.svg` (10 diagrams) | Implemented |

## Non-functional requirements

| ID | Requirement | Status |
|---|---|---|
| REQ-SEC-001 | No secrets in code or git history; CI secret scanning (gitleaks) | Implemented |
| REQ-SEC-002 | JWT secret must come from env (no default) | Implemented |
| REQ-SEC-003 | Rate limiting on sensitive endpoints | Implemented (slowapi) |
| REQ-SEC-004 | Security headers on responses | Implemented (hardening commits) |
| REQ-SEC-005 | Cookie-based auth support (hardened alternative to localStorage JWT) | Implemented (`d17a252`) |
| REQ-SEC-006 | CORS restricted via `ALLOWED_ORIGINS` env | Implemented |
| REQ-SEC-007 | Child-appropriate data handling with public Privacy/Terms/Cookie policies | Implemented (policy pages + `policy-check` tests) |
| REQ-NFR-001 | Mobile-first, low-data operation on low-end Android over 3G | Implemented (design constraint) |
| REQ-NFR-002 | PWA: installable, offline app shell via service worker | Implemented |
| REQ-NFR-003 | Android app via Capacitor (`com.kwizbox.app`), APK buildable | Implemented |
| REQ-NFR-004 | Accessibility: focus rings, skip-nav, `prefers-reduced-motion` support | Implemented (incl. JS-motion guards) |
| REQ-NFR-005 | Postgres (Supabase) as production database | **Pending (M1)** — migration script proven, connection string missing |
| REQ-NFR-006 | Public backend deployment (Fly.io) | **Pending (M2)** — configs ready |
| REQ-NFR-007 | Play Store publication | **Pending (M4)** |

## Acceptance criteria convention

A requirement is "Done" only when: implemented in code, covered by at least one
automated or scripted check (see TRACEABILITY), and recorded in TEST_RESULTS
with the actual command and outcome.
