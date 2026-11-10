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

---

## Remediation plan: tracked legacy DB backup (BUG-007) — planned 2026-11-10

> **Status: PLANNED — not yet executed.** Requires owner approval of a history
> rewrite plus push authorization (both currently deferred). This section is
> the approved plan of record.

### Finding

`backend/trivia.db.bak_20260819_081244` is **tracked in Git and public on
GitHub** (in pushed history). Contents verified 2026-11-10 by direct query:

- 669 questions; 64 quiz sessions
- 22 users: 19 registered (nicknames, **bcrypt password hashes**, class
  levels, school codes, play stats, 1 security-answer hash) + 3 guests
- **No emails, no phone numbers, no full names** (columns exist but empty);
  the file predates the `age`/`gender` columns

### Risk assessment

**Low-to-medium.** Bcrypt hashes are computationally expensive to crack;
identifiers are pseudonymous nicknames; no contact PII; snapshot ~3 months
stale. Not an emergency — but this app serves children, and password hashes
plus school codes should not be publicly downloadable.

### Options considered

| Option | Description | Assessment |
|---|---|---|
| A | Accept and monitor | Zero cost, permanent exposure — not recommended |
| B | Forward removal only (`git rm`) | File leaves HEAD, remains in history — cosmetic |
| C | **Full history purge + credential rotation** | **Recommended** — steps below |
| D | C + notify affected users | Not feasible directly (no contact data exists); an in-app notice is possible later if judged necessary |

### Option C — execution steps (on approval)

1. **Safety first:** `git bundle create <external-path>/kwizbox-pre-purge.bundle --all`
   (full backup of all refs outside the repo — see BACKUP_AND_RECOVERY.md).
2. `git rm backend/trivia.db.bak_20260819_081244` (remove from tracking; the
   working-tree file can stay).
3. Install `git-filter-repo`, then:
   `git filter-repo --path backend/trivia.db.bak_20260819_081244 --invert-paths`
   (rewrites every branch/tag to drop the file from all history).
4. Re-add the remote, then force-push all branches + tags in one coordinated
   window: `git push --force --all && git push --force --tags`.
   ⚠️ Destructive operation — explicit owner approval required (AGENTS.md §9).
   No one clones during the window.
5. Verify on GitHub: `git log --all -- backend/trivia.db.bak_20260819_081244`
   is empty; repo has **0 forks** (verified 2026-11-10), so exposure is
   limited to public clones/caches — contact GitHub Support to clear cached
   views if desired.
6. **Defense-in-depth rotations:** `JWT_SECRET` (all tokens invalidate; users
   simply log in again), admin password, and DB credentials once created (M1).
   The 19 user password hashes stay bcrypt-protected; a forced password reset
   would need app work — defer and revisit during M5 hardening.

### Prevention (already done, 2026-11-10)

- `.gitignore` now excludes `backend/trivia.db.bak_*` (future snapshots can't
  be committed accidentally).
- Backup procedure requires checksum recording (BACKUP_AND_RECOVERY.md).

### Sequencing note

PR #2 was merged locally **before** any purge, so its commit (`3cc3ba7`) is
safely inside `main`'s history; the feature branch itself becomes disposable
after the purge + push. Executing the purge during the first authorized push
window avoids a second force-push later.
