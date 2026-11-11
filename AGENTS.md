# AGENTS.md — Operating Rules for AI Agents and Developers

> This file is the entry point for anyone (human or AI) working on KwizBox. Read
> it before doing anything. It defines how work is done here, how truth is
> established, and how project memory is maintained.
>
> Companion files (all at project root): `README.md` (project map), `PROJECT_STATUS.md`
> (where we are), `SESSION_HANDOFF.md` (what happened last).
>
> Documentation (all under `docs/`): `docs/01`–`docs/07` documentation tree, plus
> `docs/README.md` (index pointing to the right files).
>
> Master prompt: `Master P` — the professional AI-assisted software development
> system initialization (the governance framework for this project).

---

## 1. Project identity

**KwizBox** — mobile-first STEM trivia for Ghanaian learners, Primary 4 (B4) through
JHS 3 (B9), plus S1–S3 / SHS 1–3 (senior levels added later). NaCCA-curriculum-aligned.
React + Vite PWA, wrapped in Capacitor for Android; FastAPI backend; SQLite today,
Postgres (Supabase) as the migration target. 7,710 questions across 16 subjects.

- **Working repository (authoritative):** `/media/stephen/FILES/My Projects/KwizBox`
- **Remote:** `git@github.com:AmoakoBarnie/KwizBox.git` (branch `main`)
- **Project owner:** Stephen (learning professional software development — explain
  decisions, not just make them)

## 2. Entry protocol — BEFORE any work

Work through this list in order. If you cannot complete a step, say so explicitly.

1. Read this file (`AGENTS.md`).
2. Read `README.md` (project map).
3. Read `PROJECT_STATUS.md` (current phase, blockers, pending decisions).
4. Read `SESSION_HANDOFF.md` (what the previous session did and what is next).
5. Read `brain.md` (accumulated technical knowledge and pitfalls).
6. Inspect the relevant architecture docs under `docs/02-architecture/`.
7. Inspect relevant decision records under `docs/07-project-history/decisions/`.
8. Inspect the current source code you will touch (`backend/src/`, `frontend/src/`).
9. Run `git status` and `git log --oneline -10`. Note uncommitted work before touching anything.
10. **Compare documentation against reality.** If a doc contradicts the code, the
    code wins for "what exists"; approved requirements and ADRs win for "what is
    intended." Report the discrepancy — never silently "fix" either side.

## 3. Truth and verification rules

- **Never claim a feature is implemented, tested, or deployed without evidence.**
  Evidence = the code exists, the test was run, and its output was recorded.
- The source code and verified test results determine what is *implemented*.
- Approved requirements (`docs/01-project-planning/REQUIREMENTS.md`) and ADRs
  determine what is *intended*.
- Never claim documentation was updated without verifying the file contents.
- Known documentation-vs-reality traps (verified 2026-11-10): root `README.md` question
  counts and ports were stale; `docs/README.md` describes a 200-question MVP era.
  Trust the database and code over old prose.

## 4. During work — recording rules

As you work, record in the appropriate place:

- **Important discoveries / unexpected behaviour** → `brain.md` (append, dated).
- **Architectural or significant technical decisions** → new ADR in
  `docs/07-project-history/decisions/` + entry in `docs/07-project-history/DECISION_LOG.md`.
- **Bugs found and their causes** → `docs/05-testing/BUG_TRACKER.md`.
- **What was asked / decided / shipped** → `project-log.md` (append-only).
- **Requirement or scope changes** → update `REQUIREMENTS.md` / `SCOPE.md`.

## 5. After work — closing rules

Before declaring a task complete:

1. Update `PROJECT_STATUS.md` (phase, tasks, blockers).
2. Update `SESSION_HANDOFF.md` (next session must be able to continue without you).
3. Update `CHANGELOG.md` for user-visible or structural changes.
4. Update the relevant technical documentation (`docs/02`–`docs/06`).
5. Record test commands run and their **actual results** in
   `docs/05-testing/TEST_RESULTS.md`.
6. State explicitly what remains incomplete.

## 6. Feature development workflow

Every significant feature follows these phases. Trivial fixes may compress them,
but never skip verification or documentation.

1. **Requirement analysis** — what problem is this solving? Acceptance criteria?
2. **Investigation** — inspect existing code, dependencies, related ADRs.
3. **Technical proposal** — solution + alternatives + trade-offs (security, performance, cost).
4. **Approval** — present plan; significant architectural changes need the owner's
   explicit approval. No silent scope expansion.
5. **Implementation** — small focused changes; follow `docs/04-development/CODING_STANDARDS.md`.
6. **Testing** — run relevant tests; test invalid inputs, edge cases, failure modes.
7. **Code review** — maintainability, architectural consistency, regressions,
   acceptance criteria met.
8. **Documentation** — update docs, ADRs, changelog, status.
9. **Completion report** — what was built, how verified, known limits, next task.

## 7. Agent organization

Hybrid model: **one orchestrator** (the agent talking to the project owner)
coordinates specialist responsibilities. Where real specialized subagents are
unavailable, the orchestrator **simulates each specialist as a separate review
stage** and labels it as such:

| Role | Responsibility |
|---|---|
| Software architect | system design, tech selection, scalability (ADRs) |
| Frontend engineer | UI components, accessibility, client-side logic |
| Backend engineer | APIs, business logic, auth, server-side |
| Database engineer | schema, migrations, indexes, integrity |
| QA engineer | test planning, execution, regression |
| Security reviewer | vulnerabilities, sensitive changes, OWASP guidance |
| Documentation engineer | docs, ADRs, changelog, handoff |
| Code reviewer | independent quality/consistency check |

Rules: all agents use the same documentation; no agent independently introduces
major architectural changes; conflicting implementations are prevented by the
orchestrator before merge.

## 8. Security rules

- **Never commit secrets**: passwords, API keys, JWT secrets, DB credentials,
  production secrets, personal user data. `gitleaks` runs in CI (`.github/workflows/ci.yml`).
- Real secrets live only in `.env` files (gitignored) or GitHub repository secrets.
  Templates: `backend/.env.example`, `frontend/.env.example`.
- `backend/trivia.db` is live user data + the question bank — never delete it,
  never commit it, back it up before running seed/migration scripts
  (see `docs/06-deployment/BACKUP_AND_RECOVERY.md`).
- This app serves **minors**. Treat age/gender data, nicknames, and any personal
  data with child-protection-grade care (see `docs/02-architecture/SECURITY_ARCHITECTURE.md`).
- Consult OWASP Top 10 / ASVS guidance for security-relevant changes.

## 9. Git rules

- Commit style observed in this repo: Conventional Commits
  (`feat:`, `fix:`, `docs:`, `chore:`, or a clear plain imperative subject line).
- Inspect `git diff` before committing. Never commit blindly.
- Feature branches for significant work; `main` stays deployable.
- **No destructive operations** (force-push to shared branches, history rewrites,
  deletions of shared branches) without the owner's explicit approval.
- Do not delete or modify the historical project copies outside this repo
  (`~/Desktop/KwizBoz Andriod` and relatives) without explicit owner approval —
  they are frozen snapshots.

## 10. Environment notes (verified 2026-11-10)

- This repository lives on an **NTFS drive** (`/media/stephen/FILES`). Git is
  configured with `core.fileMode=false` and `core.untrackedCache=true` to
  compensate. Expect slower npm/venv operations than on the NVMe home disk.
- `backend/venv` and `frontend/node_modules` are **not** copied across relocations
  — regenerate them (`python -m venv venv`, `npm ci`). Never copy venvs between
  locations or filesystems; they embed absolute paths.
- Ports: backend **8001** (8000 is taken by MusicApp); frontend dev **5173**
  (Vite auto-increments to 5174 when 5173 is busy — this is normal).
- `bcrypt` is pinned to **4.0.1**; newer versions break `passlib` at import.
- No KVM on the dev host — Android emulator runs in TCG software mode (slow boot).
  Android 14 WebView crashes under TCG; use the Android 11 AVD (`kwizbox_a11`).
- `sqlite3` CLI is not installed; use `python3 -c "import sqlite3 ..."` instead.

## 11. Memory system map

| Memory category | Where it lives |
|---|---|
| Project identity & objectives | `README.md`, `docs/01-project-planning/PROJECT_BRIEF.md` |
| Technical & architectural knowledge | `brain.md`, `CLAUDE.md`, `docs/02-architecture/` |
| Decision history | `docs/07-project-history/DECISION_LOG.md` + `decisions/` ADRs |
| Development & execution history | `project-log.md`, `CHANGELOG.md`, git history |
| Session continuity | `SESSION_HANDOFF.md`, `PROJECT_STATUS.md` |
