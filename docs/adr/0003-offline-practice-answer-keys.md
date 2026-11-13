# ADR 0003 — Offline practice ships answer keys to the device

- **Status:** Accepted (2026-11-13)
- **Context:** Owner-selected engagement upgrade — let learners practise with no
  data. Grading must work with the network switched off, so the device needs the
  correct answers at play time. That conflicts with REQ-QUIZ-002, which says quiz
  packs never include `answer_index` or `explanation`.

## Decision

Offline practice is a **separate, practice-only path** with an explicit answer-key
exception:

1. **New endpoint, same filters.** `POST /quiz/offline-pack` accepts the same
   `QuizPackRequest` body as `/quiz/pack` and reuses the same `_pool_ids` query
   helper. Only this endpoint returns `OfflineQuestionOut` (question fields +
   `answer_index` + `explanation`). `/quiz/pack` is unchanged and still hides
   both fields.
2. **No live side effects.** Downloading a pack creates no `QuizSession`, writes
   no `SubjectProgress`/`TopicProgress`, does not mark `UserQuestionSeen`, and
   awards no XP. Auth is optional (cookie/Bearer) and only used to respect the
   caller's seen-question history when choosing the pack. The endpoint is rate
   limited to 20/minute.
3. **Daily challenge packs are refused.** `daily: true` returns HTTP 400. A daily
   challenge is a live competition with the same questions for everyone; allowing
   its key to be downloaded would leak the answers before play.
4. **Grading is device-local.** The saved pack (IndexedDB
   `kwizbox-offline-practice` / store `packs` / key `active`, with a
   `localStorage` fallback) is played at `/quiz?offline=true`. `Quiz.jsx` grades
   each answer against the stored key with the same base/speed/streak rules as
   the server (`offlineQuestionPoints`), builds a result locally, and sends no
   `/quiz/check`, `/quiz/submit`, duel or challenge request.
5. **Results are practice-only.** The local result carries `offline: true` and
   `session_id: 0`. It never updates XP, badges, streak history, leaderboards or
   the server session log. The Summary screen shows a “saved on this device only”
   banner, hides the leaderboard action, and offers “Practise again”.
6. **Media is cached explicitly.** Question diagrams are fetched into Cache
   Storage (`kwizbox-offline-media`) at download time and read back as object
   URLs during offline play, because the PWA service worker is currently
   disabled and Cache Storage does not intercept requests on its own.

## Consequences

- The answer key is on the device for any saved pack. A determined learner can
  inspect IndexedDB/localStorage and see it. That is accepted: the pack is
  practice-only, has no leaderboard/XP value, and never contains a live daily
  challenge.
- Offline results are not comparable across devices and are not visible to
  teachers/admins. Restoring connectivity does not sync them; the learner simply
  plays an online quiz to earn official progress.
- Web caveat: the app must stay open while offline (a reload needs a connection
  until the service worker is re-enabled). Native/Capacitor builds bundle the app
  shell locally, so they do not have this limitation.
- A future server-side sync would need a new design (result upload, anti-cheat,
  deduplication); it is deliberately out of scope.

## Verification

- Backend: `backend/tests/test_question_types.py::test_offline_pack_returns_answer_key_without_side_effects`
  — `/quiz/pack` hides the key, `/quiz/offline-pack` returns it, no
  `QuizSession`/`UserQuestionSeen` rows are created, daily packs return 400.
- Frontend unit: `frontend/tests/offlinePractice.test.js` (4 tests) — scoring
  parity, result shape, unknown-question rejection, storage fallback.
- Browser: `frontend/tests/e2e-offline.mjs` (19 checks) — download, switch the
  context offline, play the whole pack, Summary banner, no leaderboard action,
  zero quiz/auth API calls while offline.
- Evidence: `docs/05-testing/TEST_RESULTS.md` (2026-11-13, offline practice).
