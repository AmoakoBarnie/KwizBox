# TRACEABILITY.md

> Part of `docs/04-development/`. Requirements → Features → Implementation →
> Tests → Verification. Updated whenever requirements, endpoints, or tests
> change. Requirement definitions: `docs/01-project-planning/REQUIREMENTS.md`.

Legend: ✅ verified · ⚠️ implemented, check not automated · ⬜ pending milestone

## Auth

| REQ | Implementation | Test/verification | Status |
|---|---|---|---|
| REQ-AUTH-001 register | `POST /auth/register` (`routes/auth.py`) | `e2e-register.mjs`, CI smoke | ✅ |
| REQ-AUTH-002 login/JWT | `POST /auth/login`, `src/auth.py` | `smoke-auth.mjs` (CI) | ✅ |
| REQ-AUTH-003 guest mode | `POST /auth/guest` | `e2e-guest.mjs`, `full-e2e.mjs` | ✅ |
| REQ-AUTH-004 account deletion | `DELETE /auth/me` | ⚠️ manual verify pending | ⚠️ |
| REQ-AUTH-005 password change | `PUT /auth/me/password` | ⚠️ | ⚠️ |
| REQ-AUTH-006 avatar | `PATCH /auth/me/avatar` | ⚠️ | ⚠️ |
| REQ-AUTH-007 reset (retired) | columns remain; flow removed (`de496c2`) | n/a (documented dead-end) | ✅ |

## Quiz

| REQ | Implementation | Test/verification | Status |
|---|---|---|---|
| REQ-QUIZ-001 pack by filters | `POST /quiz/pack` | `smoke-auth.mjs`, e2e scripts | ✅ |
| REQ-QUIZ-002 no answer leak | `QuestionOut` schema omits key fields | CI smoke asserts response shape | ✅ |
| REQ-QUIZ-003 per-answer check | `POST /quiz/check` | e2e scripts | ✅ |
| REQ-QUIZ-004 submit + persist | `POST /quiz/submit` | `full-e2e.mjs` | ✅ |
| REQ-QUIZ-005 no repeats | `user_question_seen` logic in `routes/quiz.py` | ⚠️ pool-exhaustion edge case test pending | ⚠️ |
| REQ-QUIZ-006 daily challenge | daily seeding in pack logic | ⚠️ | ⚠️ |
| REQ-QUIZ-007 leaderboards ×5 scopes | `GET /quiz/leaderboard` | e2e scripts | ✅ |
| REQ-QUIZ-008 progress + mastery | `GET /quiz/progress`, `progress.py`, `mastery.py` | ⚠️ unit tests for mastery math pending | ⚠️ |
| REQ-QUIZ-009 scoring rules | `scoring.py` | ⚠️ unit tests pending | ⚠️ |
| REQ-QUIZ-010 badges | `frontend/src/badges.js` | ⚠️ frontend-only, localStorage | ⚠️ |

## Challenges

| REQ | Implementation | Test/verification | Status |
|---|---|---|---|
| REQ-CHAL-001 create + code | `POST /quiz/challenge/create` | `full-e2e.mjs` (challenge leg) | ✅ |
| REQ-CHAL-002 identical sets | `GET /quiz/challenge/{code}/questions` | full-e2e | ✅ |
| REQ-CHAL-003 compare board | `GET /quiz/challenge/{code}/compare` | full-e2e | ✅ |
| REQ-CHAL-004 24 h expiry | `challenges.expires_at` | ⚠️ expiry edge test pending | ⚠️ |

## Curriculum & content

| REQ | Implementation | Test/verification | Status |
|---|---|---|---|
| REQ-CURR-001 manifest | `GET /curriculum/manifest` | `route-smoke.mjs` | ✅ |
| REQ-CURR-002 topics | `GET /curriculum/topics` | route-smoke | ✅ |
| REQ-CURR-003 bank coverage | DB verified 7,890 Q / 16 subjects / 12 levels | DB counts (recorded 2026-11-10, incl. PR #2 import) | ✅ |
| REQ-CONT-001 question types | `question_types.py` + `backend/tests/test_question_types.py` | pytest | ✅ |
| REQ-CONT-002 explanations | `questions.explanation` (NOT NULL) | schema | ✅ |
| REQ-CONT-003 image questions | `/media/questions/*.svg` | e2e image question rendering ⚠️ | ⚠️ |

## Admin

| REQ | Implementation | Test/verification | Status |
|---|---|---|---|
| REQ-ADM-001 roles | `ROLE_PERMISSIONS`, admin tokens | ⚠️ role-permission matrix test pending | ⚠️ |
| REQ-ADM-002..010 dashboard/users/questions/schools/audit/monitor/settings/exports/cleanup | `routes/admin.py` (all endpoints verified present) | `smoke-auth.mjs` covers admin token endpoints | ⚠️ full admin e2e pending |

## Security & non-functional

| REQ | Implementation | Test/verification | Status |
|---|---|---|---|
| REQ-SEC-001 no secrets in repo | gitleaks in CI | CI green | ✅ |
| REQ-SEC-002 JWT_SECRET required | `config.py` | startup fails without it — smoke CI | ✅ |
| REQ-SEC-003 rate limits | `rate_limit.py` | CI smoke asserts limits | ✅ |
| REQ-SEC-004 security headers | middleware | CI smoke asserts headers | ✅ |
| REQ-SEC-005 cookie auth | `d17a252` | CI smoke (cookie leg) | ✅ |
| REQ-SEC-006 CORS env-driven | `ALLOWED_ORIGINS` | ⚠️ prod-origin finalization in M2 | ⚠️ |
| REQ-SEC-007 child policies | policy pages + `policy-check.mjs`, `policy-facts.mjs` | scripts exist, run locally | ✅ |
| REQ-NFR-001 low-data mobile | design constraint; PWA | manual + emulator | ⚠️ |
| REQ-NFR-002 PWA offline shell | service worker | `offlinePractice.test.js` | ✅ |
| REQ-NFR-003 Android app | Capacitor `android/` | emulator flow verified (historical evidence) | ✅ |
| REQ-NFR-004 accessibility | focus rings, skip-nav, reduced motion | `verify-reduced-motion.mjs` | ✅ |
| REQ-NFR-005 Postgres | M1 | migration script proven, run pending | ⬜ |
| REQ-NFR-006 public deploy | M2 | — | ⬜ |
| REQ-NFR-007 Play Store | M4 | — | ⬜ |

## Gaps requiring attention (from this matrix)

1. Unit tests for `scoring.py`, `mastery.py`, `periods.py` math (backend).
2. Pool-exhaustion, challenge-expiry, daily-determinism edge cases.
3. Full admin dashboard e2e + role matrix test.
4. Account deletion / password change / avatar checks.
