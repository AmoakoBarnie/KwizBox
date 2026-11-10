# SCOPE.md

> Part of `docs/01-project-planning/`. What is in and out of scope, and the
> rule for changing it. Reflects the owner's roadmap (Now/Next/Later/Blocked).

## In scope — current release path (M1–M4)

1. **SQLite → Postgres migration** (Supabase) — `migrate_sqlite_to_pg.py`, verify
   all table counts, run API against Postgres.
2. **Backend deployment** — Fly.io (Docker multi-stage, `fly.toml`, deploy
   workflow exists), health check on public URL.
3. **Android APK rebuild** — point `VITE_API_URL` at the public backend, rebuild
   debug + release builds.
4. **Play Store submission** — developer account, listing (screenshots,
   description, privacy policy), signed release artifact.
5. **Release hardening completion** — finish REMEDIATION_PLAN/HARDENING_LOG items
   (P0/P1/P2), CORS finalization for the deployed frontend origin.
6. **Maintenance of the existing feature set** — auth, quiz, challenges,
   leaderboards, admin, content tooling.

## In scope — standing concerns

- Question bank quality and growth (reviewed additions only — e.g. PR #2).
- Security and privacy of a children's app (OWASP-aligned review stages).
- Documentation and memory upkeep (the system established 2026-11-10).

## Out of scope for now (roadmap "Later" — do not start without approval)

- Offline quiz packs beyond the PWA shell (low-connectivity areas).
- Push notifications (daily reminders, streak alerts).
- Multi-language (Twi, Ga, Ewe).
- Analytics dashboards (popular topics, weak areas, engagement).
- Adaptive difficulty.
- Monetization / payments.

## Scope-change rule

Anything moving between these lists is a **decision**, not a drift: it gets an
ADR if architectural, a REQUIREMENTS.md update with a new REQ-ID, and owner
approval before work starts. Feature requests during a milestone go to the
roadmap's "Next" queue, not into the current sprint.
