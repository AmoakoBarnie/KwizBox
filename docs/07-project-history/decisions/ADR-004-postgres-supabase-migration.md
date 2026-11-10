# ADR-004: Migrate SQLite to Postgres on Supabase

- **Date:** 2026-11-10 (decision pre-dates this session; recorded now)
- **Status:** Accepted — **execution pending (M1)**

## 1. Context
The app runs on a single SQLite file (`backend/trivia.db`) holding both the
question bank and live user data. The release path (public backend on Fly.io,
Play Store scale, concurrent users) needs a networked, concurrent-write-safe
database. A Supabase project already exists (`gfjcoowxijvmmkdwciwq`, Europe,
free tier) and a proven migration script exists (`migrate_sqlite_to_pg.py`,
validated on 9,276 rows with 3 bug fixes).

## 2. Requirements
Preserve all data (13 tables, 7,710 questions, 38 users, 141 sessions);
keep SQLAlchemy code portable; low cost; rollback possible.

## 3. Options considered
1. Keep SQLite (adequate for tens of users).
2. Managed Postgres on Supabase (chosen).
3. Other managed Postgres (Neon, Railway) or self-hosted.

## 4–5. Advantages / disadvantages
1: zero work; but single-writer, file-bound to one host, no PITR, weak fit
   for Fly.io multi-region/instance deploys.
2: free tier, standard Postgres (no lock-in), pooling, backups, already
   created; migration script proven. Disadvantages: free-tier connection and
   compute limits; one more vendor; migration must be executed carefully.
3: equivalent capability; more setup; nothing already provisioned.

## 6. Security implications
- Connection URI is a secret: store in `backend/.env`/Fly secrets only.
- Use direct port **5432** for the migration (6543 is the transaction pooler).
- Postgres on a public host raises exposure: rely on Supabase's network
  controls; keep strong DB password; never commit the URI.

## 7. Performance implications
Positive at scale (concurrent writes, real indexes over HTTP traffic);
slight latency added vs local file (acceptable for a web API).

## 8. Cost implications
Free tier now; paid tier if limits exceeded (~$25/mo) — acceptable scale-up.

## 9. Decision
Adopt Supabase Postgres as the production database via
`migrate_sqlite_to_pg.py`, with mandatory pre-migration backup of
`trivia.db` and full row-count verification.

## 10. Justification
Unblocks the entire deployment milestone; proven script; minimal vendor risk
(standard Postgres, portable DSN).

## 11. Trade-offs accepted
Extra dependency on a third-party host; free-tier limits; migration downtime
window (brief, pre-launch so zero user impact).

## 12. Consequences
`DATABASE_URL` becomes a required production secret; SQLite remains the
local-dev default (both backends must be tested for schema changes until the
SQLite path is retired in M5); backup story shifts to Supabase's managed
backups plus the frozen SQLite snapshot.

## 13. Reversibility
High until the SQLite path is deleted: rollback = repoint `DATABASE_URL` to
the SQLite file (kept intact, read-only, until M5).

## 14. Review conditions
Reconsider if Supabase free-tier limits are hit early, if region latency to
Ghana proves problematic, or if Play Store scale suggests dedicated compute.
