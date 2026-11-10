# CODING_STANDARDS.md

> Part of `docs/04-development/`. How code is written here. Derived from the
> existing codebase's actual conventions (verified 2026-11-10) — follow the
> code's grain, don't fight it.

## General

- Small, focused changes. One logical change per commit; inspect the staged
  diff before committing.
- No drive-by refactors inside feature commits — separate `refactor:` commit.
- Comments explain *why*, code explains *what*. The house style already does
  this well (see `models.py` section markers).

## Python (backend)

- Modules live in `backend/src/`; routers in `backend/src/routes/`.
- Pydantic schemas validate all inputs/outputs (`schemas.py`,
  `schemas_admin.py`) — never trust raw request bodies.
- SQLAlchemy 2.0 style; new columns must be added via the idempotent
  `ALTER TABLE` pattern in `database.py` (SQLite `create_all()` will NOT
  alter existing tables — recorded pitfall).
- Secrets/config only via `config.py` (pydantic-settings) from env — never
  hardcoded, never defaulted for `JWT_SECRET`.
- Dependency changes must respect the pin discipline
  (`bcrypt==4.0.1` especially) and update `DEPENDENCY_REGISTER.md`.
- Docstrings at module top describing purpose (existing style).

## JavaScript/React (frontend)

- Pages in `src/pages/`, components in `src/components/`, shared logic in
  `src/` top-level modules (`api.js`, `auth.jsx`, `badges.js`, `subjects.js`,
  `sound.js`).
- Function components + hooks only (codebase is 100% function components).
- API calls go through `src/api.js` — no ad-hoc `fetch` in components.
- Animation: framer-motion; every JS-driven animation ships a
  `prefers-reduced-motion` guard.
- 3D: mascot clip names are a contract (`idle/celebrate/encourage/walk/blink`)
  — renaming a clip is a breaking change requiring `models/README.md` update.
- Style additions go into the design system (`styles.css` tokens) — no inline
  hex values that duplicate existing tokens.
- Question images are SVGs under `backend/static/questions/`, served at
  `/media/questions/`.

## Tests

- New backend behaviour: extend `backend/tests/` (pytest).
- New frontend behaviour: add a `.mjs` script in `frontend/tests/` following
  the existing script style, runnable with plain Node.
- A change is not done until its check runs green and is recorded in
  `docs/05-testing/TEST_RESULTS.md`.

## Commits

Conventional Commits, house style examples from history:

```
feat: capture age and sex at sign-up and guest creation
fix(mascots): make the hero mascots actually walk, turn, and face their direction
docs: correct the policy pages to match what the app actually does
chore: prepare publish-ready policy, Android signing scaffold, and gitignore cleanup
```

## Definition of Done (per change)

1. Code follows the standards above.
2. Relevant tests run, green, recorded.
3. Docs updated (CHANGELOG + affected `docs/` pages; ADR if architectural).
4. `PROJECT_STATUS.md` reflects the new state.
5. No secrets, no `trivia.db`, no build output in the commit.
