# KwizBox — Full Remediation Roadmap

**Audit date:** 2026-10-08
**Repo:** AmoakoBarnie/KwizBox
**Status:** Development-ready, NOT production-ready (all P0 items must close before any public release)

---

## Priority 0 — Fix before any public release

### P0-1. HTTPS-only production, fix Android config
**Files:** `frontend/android/app/src/main/AndroidManifest.xml`, `frontend/capacitor.config.json`, `frontend/.env.production`, `backend/src/main.py`

| Change | Detail |
|---|---|
| Remove `android:usesCleartextTraffic="true"` | Set to `false` or delete attribute (default is false on API 28+) |
| Remove `androidScheme: "http"` / `cleartext: true` | Switch to `https` |
| Replace LAN IP in `.env.production` | Use real deployed backend URL (e.g. `https://kwizbox-api.example.com`) |
| Fix `ProxyHeadersMiddleware` | Change `trusted_hosts=["*"]` to the actual reverse-proxy IP(s) or remove if not behind a proxy |
| Capacitor server config | Use `https` scheme with `cleartext: false` |

**Dev workaround:** Keep a separate `.env.development` with `http://10.0.2.2:8001` for emulator testing. Never ship dev config.

---

### P0-2. Stop leaking challenge answer keys
**File:** `backend/src/routes/challenge.py` — `q_to_dict()` and `get_challenge_questions()`

| Change | Detail |
|---|---|
| Create `q_to_public_dict()` | Excludes `answer_index`, keeps `id, class_level, subject, topic, sub_topic, strand, difficulty, question, options, question_type, image_url` |
| Use public dict in `/challenge/{code}/questions` | Return only public fields to players |
| Grade only on submission | `answer_index` stays server-side; submission route compares against DB |

---

### P0-3. Fix or remove broken password reset
**File:** `backend/src/routes/auth.py`, `backend/src/schemas.py`, `backend/src/models.py`

| Change | Detail |
|---|---|
| Remove security_question/answer from registration flow | `RegisterRequest` doesn't accept them; they're silently ignored |
| Either implement proper reset flow (rate-limited, one-time token via verified channel) OR remove advertised feature | Children's weak security answers = account takeover risk |
| If removing: remove frontend reset UI references | Don't expose a feature that doesn't work |
| Admin recovery path | Controlled support/admin process, no user-enumeration |

---

### P0-4. Prevent disabled accounts from logging in
**File:** `backend/src/routes/auth.py:81-84`

```python
# Current — no is_active check:
user = db.query(User).filter(User.nickname == body.nickname, User.is_guest.is_(False)).first()

# Fix — require active account:
user = db.query(User).filter(User.nickname == body.nickname, User.is_active.is_(True), User.is_guest.is_(False)).first()
```

**Note:** JWTs are stateless — existing tokens remain valid until expiry. Add a `token_version` column or short-lived access tokens with refresh-token revocation for immediate disable.

---

### P0-5. Remove committed credentials and rotate them
**Files:** `backend/src/seed_admin.py`, `roadmap.md`, `brain.md`, various docs/scripts

| Action | Detail |
|---|---|
| Remove `Admin@1234` fallback from `seed_admin.py` | Require `ADMIN_PASSWORD` env var; crash if missing in production |
| Remove test passwords (`password123`, `stephen123`) from all docs | Replace with "set during first admin setup" |
| Remove Supabase connection string from `brain.md` | Move to env config only |
| Remove database/backup files from Git | `_backup/` tree, SQLite DB files, PDFs |
| Add `gitleaks` or `trufflehog` to CI | Secret scanning on every push |
| Rotate every credential that may have been exposed | Change admin password, JWT secrets, DB passwords |
| Add sanitized seed fixtures | Use fake data for demos |

---

### P0-6. Server-authoritative challenge scoring
**File:** `backend/src/routes/challenge.py` — `submit_challenge_score()`

| Change | Detail |
|---|---|
| Persist `ChallengeSession` on join | Bind player to challenge at join time |
| Enforce one submission per session | Unique constraint on `(challenge_code, player_id)` |
| Validate submitted question IDs match challenge | Reject IDs not in the challenge's question set |
| Validate answer indexes against correct answers server-side | Don't trust client-provided correctness |
| Cap `duration_seconds` server-side | Compute from `started_at` → submit time |
| Reject replayed submissions | Idempotency key or session status check |
| Compute streak/timing server-side | Not from client-provided values |

---

### P0-7. Fix challenge comparison isolation
**File:** `backend/src/routes/challenge.py` — `compare_challenge_scores()`

| Change | Detail |
|---|---|
| Filter by challenge ID | Add `QuizSession.challenge_code == code` filter |
| Remove unused `window_start` | Actually use it or delete |
| Return only intended participants | Challenge creator's class/subject only |

---

## Priority 1 — Fix immediately after release blockers

### P1-1. Rate limiting gaps
**File:** `backend/src/rate_limit.py`, `backend/src/routes/`

| Endpoint | Issue |
|---|---|
| `/admin/token` | No rate limit |
| `/auth/guest` | Can abuse per-IP limit to create unlimited guest rows |
| `/quiz/check` | No rate limit, reveals correct answers |
| `/quiz/challenge/create` | No rate limit |
| `/quiz/challenge/{code}/questions` | No rate limit |
| ProxyHeadersMiddleware | `trusted_hosts=["*"]` — spoofable |

**Fix:** Add rate limits to all endpoints, trust only actual proxy IPs, add request-body limits, cleanup TTL for guests/sessions.

---

### P1-2. CORS and security headers
**File:** `backend/src/main.py:33-47`

| Change | Detail |
|---|---|
| Replace wildcard methods/headers | Explicit `["GET","POST","PUT","PATCH","DELETE","OPTIONS"]` |
| Remove `allow_credentials: true` with wildcard origins | Explicit origin allowlist only |
| Add security headers middleware | CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy |
| Build dev/prod CORS separately | Dev: localhost only; Prod: deployed origin |

---

### P1-3. Stop using localStorage for bearer tokens
**Files:** `frontend/src/auth.jsx`, `frontend/src/pages/Admin.jsx`

| Change | Detail |
|---|---|
| Web: HttpOnly, Secure, SameSite=Strict cookies | Or in-memory access token + rotating refresh token |
| Capacitor: platform secure storage | Android Keystore / iOS Keychain |
| Tighten CSP | Remove `unsafe-inline` where practical |

---

### P1-4. Server-side input validation
**Gaps found:**
- Registration: no nickname case normalization, no school-code ownership/activation check
- Login schemas: no length bounds
- `school_code`: no activation/expiry/max-use enforcement
- `QuizResultRequest`: no issued-pack/session ID binding
- `check_answer`: unauthenticated, reveals correct index
- Admin list endpoints: unconstrained `limit`/`offset`
- `AdminCreate`: no minimum password length

---

### P1-5. Transaction/concurrency protections
| Change | Detail |
|---|---|
| Issue opaque quiz-session ID at pack time | Bind submissions to exact session |
| Idempotency key on submissions | Prevent duplicate scoring |
| Lock/update transactionally | `SELECT FOR UPDATE` on session |
| Unique constraint: one completion per session | Prevent double-scoring |

---

### P1-6. Account deletion and privacy claims
| Discrepancy | Fix |
|---|---|
| UI offers deletion; policy says admin-only | Make policy match actual behavior |
| Policy says no IP collection; `last_ip` stored | State what's collected and why |
| No contact channel for deletion requests | Add support email/channel |
| Child data without guardian consent process | Define child-safety/guardian handling |

---

### P1-7. Android release hardening
| File | Change |
|---|---|
| `AndroidManifest.xml` | `android:allowBackup="false"` |
| `file_paths.xml` | Restrict to app-specific directories (`cache-path`, `files-path`), remove `external-path` at `.` |
| `build.gradle` | `minifyEnabled true`, `shrinkResources true` for release |
| Version | Bump `versionCode` and `versionName` |
| Signing | Configure keystore via CI secrets, add release build pipeline |

---

## Priority 2 — Dependency, quality, and operations upgrades

### P2-1. Frontend dependency upgrades
**10 vulnerabilities (1 critical, 5 high, 4 moderate):**

| Severity | Package | Fix |
|---|---|---|
| Critical | tar (via Capacitor CLI) | Upgrade Capacitor CLI to v7+ |
| High | brace-expansion | Update via npm audit fix |
| High | fast-uri | Update to latest |
| High | source-map-js | Update to latest |
| High | @capacitor/cli | Upgrade to v7+ |
| High | vite | Upgrade to v6+ |
| Moderate | esbuild | Breaking change with vite 8 |
| Moderate | react-router / react-router-dom | Update to latest |
| Moderate | vite-plugin-pwa | Update after vite upgrade |

**Strategy:** Branch, upgrade Capacitor/Vite/React Router together, run browser/mobile smoke tests, pin versions, add Dependabot/Renovate.

---

### P2-2. Python dependency hygiene
- Generate `requirements-lock.txt` or use `pip-tools`/`poetry`
- Run `pip-audit` in CI
- Upgrade FastAPI/Pydantic/SQLAlchemy/Jose/SlowAPI as compatible
- Rebase on current Python image (3.12+)

---

### P2-3. Automated tests
- API integration tests (temporary DB)
- Permission-matrix tests for every admin route
- Negative tests for answer leakage and replay
- Property tests for scoring
- Android/frontend smoke tests

---

### P2-4. CI/CD security gates
- `npm ci` + `npm audit --audit-level=moderate`
- `pip-audit`
- Secret scanning (gitleaks/trufflehog)
- Static analysis (Bandit/Ruff/Semgrep)
- Python tests + frontend build
- Docker image scan (Trivy/Grype)
- Android manifest checks
- DB migration verification

---

### P2-5. Docker hardening
- Multi-stage build (builder → slim runtime)
- Non-root user at runtime
- Minimal runtime packages
- Explicit `PORT` env
- Structured logging, health checks
- DB migration + backup strategy at startup

---

### P2-6. Repository cleanup
- Move `_backup/` to private archive
- Remove generated artifacts (`dist/`, `build/`, APKs, PDFs, DB files)
- Keep only reproducible source + seed fixtures
- Clear source-of-truth structure

---

### P2-7. Documentation reconciliation
| Drift | Fix |
|---|---|
| README claims reset endpoints exist | Update to match actual API |
| README says routes require auth inconsistently | Document auth requirements per route |
| SQLite vs Postgres confusion | State actual deployment target |
| Privacy policy vs actual IP collection | Align policy with model |
| LAN HTTP in production docs | Replace with real HTTPS URL |
| Name spelling inconsistencies (KwizBox/KwizBoz) | Standardize to one name |

---

## Suggested implementation order (after approval)

1. Rotate credentials + remove from code (P0-5)
2. HTTPS/Android config + proxy trust (P0-1)
3. Answer leakage fix + scoring validation + comparison isolation (P0-2, P0-6, P0-7)
4. Login `is_active` check + password reset design (P0-4, P0-3)
5. Rate limits + CORS + security headers + token storage (P1-1, P1-2, P1-3)
6. Input validation + concurrency protections (P1-4, P1-5)
7. Privacy/account deletion alignment (P1-6)
8. Android release hardening (P1-7)
9. Dependency upgrades + CI gates (P2-1 → P2-5)
10. Repository cleanup + docs reconciliation (P2-6, P2-7)
11. Final security regression audit + release build

---

## Positive findings to preserve

- Bcrypt password hashing ✓
- JWT expiry + shorter admin tokens ✓
- Role-based admin permissions + audit logging ✓
- Pydantic validation on key flows ✓
- Parameterized SQL queries ✓
- Frontend build succeeds + accessibility features ✓
- `JWT_SECRET` required (no silent default) ✓
- Account deletion, data export, password change concepts present ✓
