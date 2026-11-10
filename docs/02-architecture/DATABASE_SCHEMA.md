# DATABASE_SCHEMA.md

> Part of `docs/02-architecture/`. The 13-table schema, verified from
> `backend/src/models.py` and the live SQLite DB (2026-11-10).
> Target backend after M1: Supabase Postgres (same schema; see migration notes).

## Conventions

- Primary keys: integer autoincrement (except `system_settings.key`).
- Timestamps: UTC (`utcnow()` helper).
- Foreign keys enforced; uniques via named constraints (`uq_*`).
- Migration style: `database.py` runs **idempotent** `ALTER TABLE ... ADD COLUMN`
  / `CREATE UNIQUE INDEX` on startup (SQLite `create_all()` never alters
  existing tables).

## Tables

### users
Learner/guest accounts. `nickname` (40), `class_level` (20), `school_code`,
`is_guest`, `password_hash` (nullable — guests have none), `is_active`,
**`age` (int 5–99) + `gender` ('male'|'female'|'other')** captured at sign-up,
lifetime aggregates (`lifetime_score`, `total_questions`, `total_correct`,
`current_streak`, `longest_streak`, `last_played`), avatar customization
(`avatar_skin/hat/accessory/gender`), `last_ip`, `last_login`,
`security_question`/`security_answer_hash` (legacy — reset flow retired),
`created_at`. Relationships: → quiz_sessions, subject_progress, topic_progress.

### questions
The bank: `class_level`, `subject`, `topic`, `sub_topic`, `strand`,
`difficulty`, `question` text, options `option_a..d`, `answer_index` (0–3),
`explanation`, `question_type` (`mcq` | `true_false` | `image_mcq`),
`image_url`, `is_active`, usage stats (`times_answered`, `times_correct`).
Composite index `(class_level, subject, difficulty)`.
**Live counts (2026-11-10, after PR #2 import):** 7,890 total — 7,816 mcq,
74 image_mcq; 16 subjects; 12 class levels (B4–B9, S1–S3, SHS 1–3).

### quiz_sessions
One row per completed quiz: `user_id` FK, filters used, `total`, `correct`,
`score`, `accuracy`, `duration_seconds`, `max_streak`, `status`,
`started_at`/`ended_at`, `school_code`, `is_daily`, `challenge_code` FK (nullable).
**Live: 141 rows.**

### subject_progress
Per user × class × subject: `questions_answered`, `correct`. Unique
(`user_id`, `class_level`, `subject`).

### topic_progress
Per user × class × subject × topic: `questions_answered`, `correct`,
`mastery_score` (float), `mastered` (bool).

### leaderboard_periods
Weekly/monthly point buckets: `user_id`, `kind` ('weekly'|'monthly'),
`period` (string bucket), `points`. Unique per (user, kind, period).

### school_codes
Issued codes: `code` (unique), `name`, `school`, `created_by` FK, expiry
(`expires_at`), `is_active`, `max_uses`, `used_count`.

### user_question_seen
No-repeat tracking: unique (user, question), `seen_at`. Drives REQ-QUIZ-005.

### admin_users
Admin accounts, separate from players: `username` (unique), `password_hash`,
`role` (`super_admin` | `question_manager` | `school_manager` |
`moderator` — permission sets defined in `ROLE_PERMISSIONS`),
`is_active`, `last_login`, `created_by` (self-referencing FK).

### audit_logs
Admin action trail: `admin_id`/`admin_username`, `action`, `target`,
`detail`, `ip`, `created_at`.

### system_settings
App-wide key/value config: `key` (PK), `value` (Text), `updated_at`,
`updated_by` FK.

### challenges
Head-to-head containers: `code` (6 letters, unique, **PK-like FK target**),
`creator_id` FK, `class_level`, `subject`, `question_ids` (comma-separated
string — deliberate denormalization), `expires_at` (24 h), `status`.

### challenge_sessions
One row per player per challenge: unique (`challenge_code`, `player_id`),
`score`, `correct`, `wrong`, `total`, `accuracy`, `status`, timestamps.

## Entity relationships (summary)

```
users 1─* quiz_sessions          users 1─* subject_progress
users 1─* topic_progress          users 1─* leaderboard_periods
users 1─* user_question_seen *─1 questions
users 1─* challenges (creator)    challenges 1─* challenge_sessions
users 1─* quiz_sessions *─? challenges (challenge_code)
admin_users 1─* audit_logs        admin_users 1─* system_settings (updated_by)
admin_users 1─* admin_users (created_by)
```

## Migration to Postgres (M1) — verified notes

- Script: `backend/scripts/migrate_sqlite_to_pg.py` — proven on a 9,276-row
  run with 3 fixes (VARCHAR lengths, boolean casting, self-referencing FK).
- **13 tables** must match row counts after migration (older docs said "14
  models" — actual class count in `models.py` is 13; discrepancy recorded).
- Keep `backend/trivia.db` intact as the rollback source; back it up first
  (BACKUP_AND_RECOVERY.md).
- `questions.question_ids` string in `challenges` is fine for Postgres as-is.

## Data-protection notes

- `users.age` and `users.gender`: **child personal data** — minimize, never
  expose publicly, restrict in admin UI, covered by policy pages.
- `users.last_ip`: retained; review retention period during M2 hardening.
- Guest rows are disposable (`DELETE /admin/cleanup/guests`) and excluded from
  leaderboards by design.
