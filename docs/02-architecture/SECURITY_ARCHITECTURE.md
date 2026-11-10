# SECURITY_ARCHITECTURE.md

> Part of `docs/02-architecture/`. As-built security controls, verified
> 2026-11-10 from code + commit history, with gaps and a review protocol.
> Guidance baseline: OWASP Top 10 / ASVS; Ghana's Data Protection Act, 2012
> (Act 843) for personal data; GDPR-K practices as reference for minors.

## Threat model in one paragraph

Public internet-facing API serving **minors** on low-end devices; JWT-issued
identities with a low-friction guest mode; a live database holding nicknames,
ages, genders, school codes, IPs, and play history; an admin tier that can
manage users and content; a question bank whose answers must not leak before
submission (integrity of competition).

## Controls implemented (verified)

| Control | Where | Evidence |
|---|---|---|
| Password hashing | `auth.py` — passlib/bcrypt (pinned 4.0.1) | code |
| JWT auth, secret **required** from env (no default) | `config.py` | code + `.env.example` |
| Token expiry (30 d player / 120 min admin) | `config.py` | `.env.example` |
| Answer-key non-leak in packs | `routes/quiz.py` (no `answer_index`/`explanation` in `QuestionOut`) | CLAUDE.md verified convention |
| Rate limiting (slowapi) | `rate_limit.py`, hardening `d17a252` | commit + `requirements.txt` |
| Security headers | middleware | hardening `d17a252`, smoke test in CI |
| Cookie-based auth option (beyond localStorage JWT) | auth routes | `d17a252` |
| CORS allow-list via `ALLOWED_ORIGINS` env | `main.py` | code + roadmap item "CORS finalization" |
| Admin separation: roles + permission sets | `models.py` `ROLE_PERMISSIONS` | code |
| Admin audit log | `audit_logs` table + `/admin/audit` | code |
| Secret scanning in CI (gitleaks) | `.github/workflows/ci.yml` | workflow file |
| Disabled-login guard | hardening commits | `d17a252` group |
| Cleartext traffic disabled for Android | Capacitor config | `d17a252` group |
| Credentials sanitized in historical backup files | roadmap "Done" (2026) | roadmap.md |
| Policy pages (Privacy / Terms / Cookie) | `frontend/src/pages/` + `policy-check.mjs`, `policy-facts.mjs` tests | files exist |
| Proxy headers middleware | `main.py` | commit history |

## Controls planned / in progress

- [ ] CORS finalization for the deployed origin (remove localhost entries) — M2.
- [ ] REMEDIATION_PLAN P1/P2 remainder — see `REMEDIATION_PLAN.md` +
  `HARDENING_LOG.md` (P0 items largely shipped: answer-key leak closed,
  disabled-login guard, cleartext config, credentials rotated).
- [ ] Production secrets in Fly.io secret store — M2.
- [ ] Automated `trivia.db` backups before migrations — M1 procedure.

## Known accepted risks (documented, not ignored)

1. **JWT in localStorage** (legacy path) — XSS would expose a 30-day token.
   Cookie auth (httpOnly) added in `d17a252`; full migration of the client to
   cookie-only is a P1/P2 item.
2. **Password reset retired** (security-question flow was weak) — users must
   use password change while logged in; account recovery path is a product gap
   (BUG_TRACKER).
3. **Guest mode abuse surface** — nickname-free creation; rate limiting is the
   primary control; guests are excluded from leaderboards and are purgeable.
4. **SQLite on a single host** until M1 — file-level access control is the
   boundary; keep the file out of any web-served path and out of git.

## Child-data handling rules (this project's policy)

- Data collected at sign-up: nickname, class level, optional school code,
  **age and sex**, password (hashed). Guests: nickname + class level only.
- Minimize: no email/phone required (columns exist but optional — review
  whether to collect at all).
- Never expose age/sex/IP on leaderboards or public endpoints; restrict in
  admin views.
- Policy pages must stay reachable and truthful (automated by
  `policy-check.mjs` + `policy-facts.mjs`).
- Any new endpoint touching user data requires a security review stage
  (AGENTS.md §7) before merge.

## Secret management

- Real values only in `.env` (gitignored) or platform secret stores
  (GitHub Secrets for CI, Fly secrets for deploy).
- Templates: `backend/.env.example`, `frontend/.env.example`.
- Never paste connection strings, JWT secrets, or admin passwords into
  documents, chats, or commits. The Supabase URI expected in M1 is a secret:
  provide it via a secure channel, store it in `backend/.env` only.

## Incident-response basics

1. Rotate the leaked secret (JWT_SECRET invalidates all tokens; DB password;
   Fly token via dashboard).
2. `git log -p` + gitleaks history scan if a commit is implicated.
3. Record the incident in `docs/07-project-history/LESSONS_LEARNED.md` and, if
   architectural, an ADR.
