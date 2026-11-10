# CONTRIBUTING.md

How to contribute to KwizBox. Whether you are a human developer or an AI agent,
the rules are the same: **understand before changing, verify before claiming,
document before closing.**

## Read first

1. `AGENTS.md` — operating rules (applies to humans too).
2. `PROJECT_STATUS.md` — where the project is right now.
3. `docs/04-development/CODING_STANDARDS.md` — code style.
4. `docs/02-architecture/` — the as-built architecture you must stay consistent with.

## Workflow for any significant change

Follow the nine phases in `AGENTS.md` §6: requirement analysis → investigation →
proposal → **approval** (for architectural/scope changes) → implementation →
testing → review → documentation → completion report.

## Branching & commits

- `main` must always be deployable. Significant work happens on feature branches
  (`feature/<topic>` or `fix/<topic>`), merged via PR.
- Commit messages: Conventional Commits — `feat:`, `fix:`, `docs:`, `chore:`,
  `refactor:`, `test:` — with a clear, specific subject. Look at `git log` for
  the house style (e.g. `fix(mascots): make the hero mascots actually walk…`).
- Inspect `git diff --staged` before every commit. Never commit what you
  haven't looked at.

## Never commit

- Secrets of any kind (`.env` contents, JWT secrets, DB passwords, API tokens).
  CI runs `gitleaks` and will reject the history.
- `backend/trivia.db` (live user data; gitignored by design).
- Build output (`frontend/dist/`), dependencies (`node_modules/`, `venv/`), logs.

## Testing expectations

- Any change to `backend/src/` or `frontend/src/` must be accompanied by running
  the relevant tests (see `docs/05-testing/TEST_STRATEGY.md` for the inventory).
- Record actual commands + results in `docs/05-testing/TEST_RESULTS.md`.
- New features need at least one automated check that would fail without them.

## Documentation expectations

A change is not "done" until:

- `CHANGELOG.md` has an entry (user-visible or structural changes).
- Relevant `docs/` pages reflect the new reality.
- Significant decisions got an ADR (`docs/07-project-history/decisions/`).
- `PROJECT_STATUS.md` and `SESSION_HANDOFF.md` are updated at session end.

## Special obligations for this project

- KwizBox serves **children**. Changes touching accounts, personal data
  (nickname, age, gender, school), or policy pages need a security review
  stage before merge (see `docs/02-architecture/SECURITY_ARCHITECTURE.md`).
- The question bank (`trivia.db`) is precious: back it up before any seed or
  migration script touches it.
