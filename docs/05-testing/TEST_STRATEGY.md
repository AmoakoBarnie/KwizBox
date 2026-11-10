# TEST_STRATEGY.md

> Part of `docs/05-testing/`. What is tested, how, where — and what is not
> yet covered. Inventory verified 2026-11-10.

## Test levels

| Level | Scope | Where |
|---|---|---|
| Unit | Question-type helpers | `backend/tests/test_question_types.py` (pytest) |
| API / smoke | Auth (incl. cookie auth), security headers, rate limits, admin token endpoints | `frontend/tests/smoke-auth.mjs` — runs in CI |
| Integration / E2E | Full user journeys in a real browser | `frontend/tests/*.mjs` (Playwright scripts, Node-runnable) |
| Specialized | Mascot 3D rendering/locomotion geometry, reduced motion, policy truthfulness, offline shell, back buttons, route reachability | dedicated scripts below |
| CI gates | Frontend production build, backend smoke, secret scanning (gitleaks) | `.github/workflows/ci.yml` |
| Manual / emulator | Android app on the Android 11 AVD (TCG mode, no KVM on host) | historical evidence recorded; repeat per release |

## Script inventory (`frontend/tests/`, 19 files)

| Script | What it verifies |
|---|---|
| `smoke-auth.mjs` | Auth endpoints incl. cookie auth, headers, rate limits, admin tokens (CI) |
| `route-smoke.mjs` | All routes reachable |
| `e2e-guest.mjs` | Guest → quiz → submit → leaderboard |
| `e2e-register.mjs` | Registration flow |
| `full-e2e.mjs` | Full app smoke (auth + rate limits + quiz + challenge) |
| `back-button.mjs` | Browser back behaviour on pages |
| `offlinePractice.test.js` | PWA offline shell behaviour |
| `policy-check.mjs` + `policy-facts.mjs` | Policy pages exist and match app reality (child-safety/GDPR) |
| `mascot-render-check.mjs` | Mascot canvases render |
| `measure-app-mascot.mjs`, `measure-locomotion.mjs` | Measured mascot motion (traverse span, facing flips, bob amplitude) |
| `stride-geometry.mjs`, `stride-shape.mjs` | Walk cycle stride metrics |
| `verify-walk-plays.mjs` | Walk clip actually plays |
| `verify-reduced-motion.mjs` | Mascots hold still under reduced motion |
| `promo-shots.mjs`, `record-mascots.mjs`, `shoot-live.mjs` | Screenshot/video capture tooling |

## Test environments

- **Local dev:** backend `:8001` (SQLite), frontend `:5173/5174`.
- **Postgres test (M1):** backend on temp port (8002) with `DATABASE_URL`.
- **CI:** GitHub Actions — fresh SQLite at `/tmp/kwizbox-smoke.db`, Node 20,
  Python 3.11, gitleaks.
- **Emulator:** Android 11 AVD `kwizbox_a11` (snapshot `kwizbox_ready`),
  TCG software mode (~6 min boot; no KVM on host).

## Coverage strategy & current gaps (honest)

Covered: auth surface, core loop, policy truthfulness, mascot motion (unusually
well — measured, not eyeballed), offline shell, build integrity.

Gaps (tracked in TRACEABILITY):
1. No unit tests for `scoring.py`, `mastery.py`, `periods.py` math.
2. Edge cases: question-pool exhaustion, challenge expiry, daily determinism.
3. Full admin-dashboard E2E + role permission matrix.
4. Performance/load testing — none (acceptable pre-scale; revisit at M5).
5. Accessibility beyond reduced motion (screen reader passes).

## Regression policy

- CI must be green on `main` before any deploy.
- Before release milestones (M2–M4): run the full local script battery and
  the emulator flow; record in `TEST_RESULTS.md`.

## Security testing

- gitleaks on every push (history scanning).
- Smoke asserts security headers + rate limits (CI).
- Manual review stage for auth/data changes (AGENTS.md §7/§8).
- OWASP Top 10 checklist pass before Play Store submission (M4).
