# Phase 2 Plan — Adaptive Learning System, Badges, School Competition, Admin & Analytics

**Status:** PROPOSAL for sign-off. No code written yet.
**Date:** 2026-08-20
**Author:** Stephen Barnie Amoako (Peswa) + build agent

---

## 0. Decisions captured (from the discussion)

| # | Question | Decision |
|---|----------|----------|
| 1 | Misconception tags | **WAIT → deferred to Tier 3** |
| 2 | Subtopic / learning_objective population | **WAIT → deferred to Tier 3** |
| 3 | Badge catalog location | **OK → code-config for v1** (DB later) |
| 4 | Adaptive scope v1 | **YES → across-sessions only** (defer within-session) |
| 5 | Empirical difficulty recompute | **Your recommendation → recompute on submit** for the answered questions |
| 6 | School competition | *not answered* → **assumed quick win** (see §8); confirm on sign-off |
| 7 | Per-question accuracy + bulk import | **YES → in v1** |

**Interpretation of "wait" (please correct on sign-off if wrong):** defer
misconception detection AND the subtopic/learning-objective columns to Tier 3.
This means v1 adaptation runs at **topic** granularity (which already exists),
not subtopic. That is consistent with your own priority ranking (both were
Tier 3 / "later"). The columns are NOT added in v1; they get added only when
we activate Tier 3.

---

## 1. Scope

### Tier 1 — Must-have (your top list)
- M1. Extend `TopicProgress` with recency + consecutive + confidence + state + review scheduling + difficulty pointer.
- M2. Add `QuestionProgress` (per-question learner history).
- M3. Replace pack selection with an **Adaptive Engine** (mastery-aware + recent performance + intelligent repetition + review scheduling + difficulty progression between quizzes).
- M4. Wire submit → update all the above + recompute empirical difficulty.
- M5. End-of-quiz diagnostics (topic breakdown → feeds TopicProgress).

### Tier 2 — Very valuable
- V1. Mastery **confidence** + mastery **state** (not just 0–100).
- V2. **Empirical difficulty** calibration (stored, shown in admin).
- V3. **Badges** (code-config catalog + post-submit award + Profile UI).
- V4. **Question management**: edit existing (admin endpoint exists), per-question accuracy column, bulk import, soft-delete.
- V5. **Analytics dashboard** extensions.

### Tier 3 — Deferred (you said "wait")
- D1. Misconception detection (needs subtopic tagging → deferred with D2).
- D2. Subtopic / learning_objective columns + finer adaptation.
- D3. Within-session adaptation.
- D4. ML recommendation.

---

## 2. Data model changes

### 2.1 `TopicProgress` — extend (idempotent ALTER)
Add columns:
- `recent_accuracy Float default 1.0` — EMA of last attempts (recency).
- `consecutive_correct Integer default 0`
- `consecutive_wrong Integer default 0`
- `attempt_count Integer default 0`
- `confidence Float default 0.0` — from attempt_count (Wilson-ish / capped).
- `mastery_state String(12) default 'NOT_STARTED'` — NOT_STARTED | LEARNING | DEVELOPING | PROFICIENT | MASTERED | REVIEW.
- `current_difficulty String(10) default 'Easy'` — the Easy/Med/Hard pointer for progression.
- `review_stage Integer default 0` — spaced-repetition stage (0–5).
- `review_due_at DateTime nullable` — next review due time.
- `last_attempt_at DateTime nullable`

### 2.2 `QuestionProgress` — NEW table
`user_id, question_id, correct_attempts, wrong_attempts, last_seen, q_mastery Float`
Unique(user_id, question_id). This is your "User → Question → performance."

### 2.3 `Question` — add ONE column (no subtopic in v1)
- `empirical_difficulty Float nullable` — computed from `times_correct/times_answered` (smoothed). Used for calibration reporting + exploration signal.
- (subtopic / learning_objective / misconception_tags are **NOT added in v1** — deferred D2/D1.)

### 2.4 Badges — NEW tables
- `Badge` (catalog): `key, name, description, icon, criterion_json` — for v1, **catalog lives in code** (`badges.py`); this table is optional and can be added later. Plan uses code-config.
- `UserBadge`: `user_id, badge_key, earned_at` (Unique(user_id, badge_key)).

### 2.5 Migration strategy
`database.py` already does idempotent `ALTER TABLE ... ADD COLUMN`. Extend it for
the new columns + create the two new tables via `Base.metadata.create_all` (new
tables are auto-created; only column additions need ALTER).

---

## 3. Adaptive Engine (`backend/src/adaptive.py`)

Pure module. Signature:
```python
def build_adaptive_pack(db, user, class_level, subject, count) -> list[Question]
```
Replaces `_select_pack_ids`. Behaviour:

1. Load the user's `TopicProgress` for (class_level, subject).
   If `subject == 'Mixed'`, load all subjects.
2. Classify topics:
   - **weak**: `mastery_state` in (NOT_STARTED, LEARNING, DEVELOPING) OR `recent_accuracy < 0.6`
   - **review_due**: `review_due_at <= now` AND not currently weak
   - **normal**: everything else
   - **explore**: topics with `confidence < 0.3` (system unsure) — sampled occasionally
3. Allocate counts (your weights):
   - 60% weak · 25% normal · 10% review_due · 5% explore
   (rounding handled; if a bucket is empty, spill into normal.)
4. For each bucket's topics, pick questions:
   - filter by topic + `is_active == True` + `current_difficulty` where applicable
   - **intelligent repetition**: skip questions where `QuestionProgress.q_mastery > 0.85` AND `last_seen` within last N quizzes; **prefer** questions with `q_mastery < 0.5` (consistently missed)
   - guests (no user): fall back to the existing random/unseen logic
5. Shuffle and return `count` questions.

**Review scheduling** (spaced repetition), applied in submit per topic:
```
intervals = [1, 3, 7, 14, 30]  # days
if correct:
    review_stage = min(5, review_stage + 1)
    review_due_at = now + intervals[review_stage] days
else:
    review_stage = 0
    review_due_at = now  # due immediately
```

**Difficulty progression** (between quizzes), per topic:
- 3 consecutive correct → `current_difficulty` steps up (Easy→Med→Hard)
- 2 consecutive wrong → steps down
- cap at Easy/Hard.

**Mastery state** derived from `mastery_score` + `attempt_count` gate:
```
attempts = attempt_count
score = mastery_score  # 0..1
if attempts == 0: NOT_STARTED
elif score < 0.20: LEARNING
elif score < 0.40: LEARNING
elif score < 0.60: DEVELOPING
elif score < 0.80: PROFICIENT
else: MASTERED
# REVIEW state set when review_due_at > now and previously mastered
```
Thresholds gated so low attempts can't reach MASTERED (confidence guard).

**Confidence**: `confidence = min(1.0, attempt_count / 20)` (simple, sufficient for the explore bucket).

---

## 4. Submit wiring (`quiz.py submit_result`)

After grading each answer, also:
- Update `TopicProgress` for the question's (class, subject, topic):
  - `attempt_count += 1`, `questions_answered += 1`, `correct += is_correct`
  - `recent_accuracy` = EMA (e.g. `0.7*old + 0.3*is_correct`)
  - `consecutive_correct` / `consecutive_wrong` counters
  - `mastery_score` recomputed from `correct/questions_answered`
  - `mastery_state`, `confidence`, `current_difficulty`, review scheduling (§3)
  - `last_attempt_at = now`
- Upsert `QuestionProgress(user, question)`: `correct_attempts/wrong_attempts`, `q_mastery`, `last_seen`.
- Recompute `Question.empirical_difficulty = smooth(times_correct/times_answered)` for that question (your decision #5).
- Run badge check (§7) after the session is fully graded.

**Backward compat:** guests get no TopicProgress/QuestionProgress writes (no identity) — existing behaviour preserved.

---

## 5. Frontend changes

### 5.1 `Quiz.jsx`
- v1 keeps the "fetch 12 upfront" model (across-session adaptation only).
- No structural change to the answer flow.
- (Within-session adaptation deferred — D3.)

### 5.2 `Summary.jsx` — end-of-quiz diagnostics (M5)
- Aggregate the submitted feedback by `topic` (pack items carry `topic`).
- Show: **Strong** (top topics by accuracy), **Needs practice** (low-accuracy topics), and **Recommended next** (the needs-practice topics, phrased as "→ Topic X").
- This is computed client-side from the result + pack; no new API needed.

### 5.3 `Profile.jsx`
- Add a **badge shelf** (M3/V3) showing earned badges + locked ones (greyed).

### 5.4 `Landing.jsx` / signup
- Make **school_code** prominent in the signup form (§8 quick win).

### 5.5 New `SchoolLeaderboard.jsx` (§8)
- Uses existing `GET /quiz/leaderboard?scope=school&school_code=...`.

---

## 6. Badges (V3)

`badges.py` catalog (code-config), e.g.:
- `first_quiz` — completed 1 quiz
- `perfect` — 100% accuracy in a quiz
- `streak7` — 7-day streak
- `sampler` — played all 3 subjects
- `hard_hitter` — 10 Hard questions correct (lifetime)
- `reviewer` — completed a review-due topic
- `school_pride` — joined a school + played

`check_badges(user, result, db)` runs after submit; awards any newly-earned
`UserBadge`. Profile shows them.

---

## 7. Admin — question management (V4) + analytics (V5)

### Question management
- **Edit existing**: `PUT /admin/questions/{id}` already exists → add an edit form to the Admin Questions page.
- **Per-question accuracy**: add column `accuracy = times_correct/times_answered` to the admin questions table; flag `< 0.4` (possible mis-key) in red.
- **Bulk import**: new `POST /admin/questions/import` (CSV or JSON array). `export_questions` already exists → round-trip.
- **Soft-delete**: change `DELETE /admin/questions/{id}` to set `is_active = False` (column already exists). Ensure `/quiz/pack` filters `is_active == True` (currently it does NOT — must add).
- **Analytics extension**: `/admin/monitor` + `/admin/dashboard` gain:
  - daily active players, quizzes/day (time-bucketed)
  - **hardest questions** (low empirical_difficulty / low accuracy)
  - per-school activity
  - per-question accuracy table (reuses the accuracy calc)
  - Rendered with **SVG/CSS bars** (no heavy chart lib — keeps low-data promise).

---

## 8. School competition (assumed quick win — CONFIRM)

You didn't answer #6. Plan assumes the **quick win** (not inter-school challenges):
- `school_codes` table + `scope=school` leaderboard already exist.
- Make `school_code` prominent at signup.
- Add a `SchoolLeaderboard` page.
- (Inter-school scheduled challenges → deferred.)

---

## 9. Build sequence (foundation-first)

1. **Migrations** — `TopicProgress` columns + `QuestionProgress` + `UserBadge` tables + `Question.empirical_difficulty`; ensure `is_active` filter in pack.
2. **Adaptive engine** (`adaptive.py`) + wire into `/quiz/pack` (replace `_select_pack_ids`).
3. **Submit wiring** — TopicProgress recency/state/review/difficulty + QuestionProgress + empirical difficulty + badge check.
4. **End-of-quiz diagnostics** (Summary.jsx).
5. **Badges** — catalog + check + Profile UI.
6. **Admin question management** — edit UI, per-question accuracy, bulk import, soft-delete.
7. **Analytics dashboard** extensions.
8. **School competition** — signup UI + SchoolLeaderboard page.
9. **Build + verify** end-to-end; update `BUILD_LOG.md` + regenerate PDF.

---

## 10. Verification plan

- Unit tests for `adaptive.py`: weighting allocation, state transitions, review-interval progression, difficulty step-up/down, confidence gate.
- API tests: `/quiz/pack` returns adaptive mix for a seeded profile; `/quiz/submit` updates TopicProgress fields correctly; empirical difficulty updates.
- Frontend: `vite build` clean; Summary shows topic diagnostics; Profile shows badges.
- Full flow through the public tunnel (restart + re-verify like Phase 1).
- Admin: edit a question, bulk-import a small CSV, soft-delete, see per-question accuracy flagged.

---

## 11. Open items to confirm on sign-off

1. **"wait" on misconception (D1) + subtopic (D2)** — confirm deferring both to Tier 3 (v1 stays topic-level). 
2. **#6 school competition** — confirm the quick-win scope (no inter-school challenges).
3. Any must-have you want moved up, or scope you want trimmed for a faster v1?

---

*This is a plan. No source files were modified while writing it.*
