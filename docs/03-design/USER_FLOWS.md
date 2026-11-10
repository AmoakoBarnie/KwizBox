# USER_FLOWS.md

> Part of `docs/03-design/`. The primary user journeys, as built. Pages in
> `frontend/src/pages/`; routes via React Router.

## 1. Guest → play (lowest-friction path — design priority)

```
Landing (/)
  → enter nickname + class level, "Play as guest"
  → POST /auth/guest → JWT (is_guest=true)
  → ChooseQuiz (/choose-quiz)
      class (B4–B9/S1–S3/SHS 1–3) → subject (16) → topic → sub-topic
      → mode: free play | daily challenge
  → Quiz (/quiz): 12 questions
      timer per question → select option → POST /quiz/check
      → immediate feedback (correct/wrong + explanation)
      → mascot reacts (celebrate/encourage); streak/combo tracked
  → Summary (/summary): score, accuracy, grade, stat rings, confetti,
      share-card modal (copy / Web Share API)
  → guest results graded but NOT persisted to leaderboards (by design)
```

## 2. Registered learner

```
Landing → Sign up (nickname, password, class, school code?, age, sex)
  → POST /auth/register → JWT (30 days)
  → same quiz flow as guest, BUT:
      questions exclude already-seen (user_question_seen)
      sessions persist; SubjectProgress/TopicProgress/mastery update
      LeaderboardPeriod buckets (weekly/monthly) update
      badges (24) evaluate on completion (device-local)
  → Profile (/profile): stats, mastery, badge grid
  → Leaderboard (/leaderboard): global/class/school/weekly/monthly
  → Settings (/settings): theme, sound, avatar customization
```

## 3. Friend challenge

```
Challenge (/challenge)
  create: class + subject → POST /quiz/challenge/create → 6-letter code
  share code out-of-band (chat, voice)
  friend joins with code → GET /quiz/challenge/{code}/questions
      (identical question set — deterministic selection)
  both play → POST /quiz/challenge/{code}/submit
  → GET /quiz/challenge/{code}/compare → ranked leaderboard
  codes expire after 24 h
```

## 4. Administrator

```
Admin (/admin) — POST /admin/token (admin account, 120-min token)
  Dashboard: users/questions/sessions/activity stats
  Users: search, activate/deactivate, set class/school
  Questions: CRUD, activate/deactivate, filter, search
  School codes: create/update (expiry, max uses)
  Leaderboards, live monitor, settings, audit log, CSV exports
  Roles limit what each admin can do (ROLE_PERMISSIONS)
```

## Edge / failure states (what the flows must handle)

- Backend unreachable → frontend error boundary + retry messaging (verify in QA).
- Pool exhausted (all questions seen) → repeat cycle resets (test case).
- Expired challenge code → clear error on join (test case).
- Guest localStorage cleared → progress gone by design (communicated in UI).
- Reduced-motion users → all JS-driven animation must hold still
  (`verify-reduced-motion.mjs`).
