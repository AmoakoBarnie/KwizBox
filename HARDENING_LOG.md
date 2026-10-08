# KwizBox Security Hardening — Implementation Log

**Started:** 2026-10-08
**Status:** P0 items in progress

## Completed

### P0-5: Remove committed credentials
- [x] Rotate `Admin@1234` — removed from `seed_admin.py`, now env-var-only
- [x] Removed test passwords from docs
- [x] Removed Supabase connection string from `brain.md`
- [x] Cleaned `_backup/` of sensitive data

### P0-1: HTTPS-only production, fix Android config
- [x] `AndroidManifest.xml`: removed `android:usesCleartextTraffic="true"`
- [x] `capacitor.config.json`: switched to `https` scheme
- [x] `.env.production`: replaced LAN IP with env var `VITE_API_URL`
- [x] `.env.development`: kept `http://10.0.2.2:8001` for emulator
- [x] `backend/src/main.py`: `ProxyHeadersMiddleware` — `trusted_hosts=["*"]` → `trusted_hosts=["10.0.2.2", "127.0.0.1"]`

### P0-2: Stop leaking challenge answer keys
- [x] Created `q_to_public_dict()` in `challenge.py` — excludes `answer_index`
- [x] `/challenge/{code}/questions` returns only public fields
- [x] `answer_index` stays server-side; grading on submission only

### P0-4: Prevent disabled accounts from logging in
- [x] Login route checks `user.is_active == True`
- [ ] Token revocation for disabled users (P1 — stateless JWT needs versioning)

## In Progress

- P0-6: Server-authoritative challenge scoring (session binding, replay protection)
- P0-7: Challenge comparison isolation (challenge ID filter)
- P0-3: Password reset design (remove broken UI or implement proper flow)

## Pending

- P1-1 through P1-7
- P2-1 through P2-7
- Integration tests
- CI/CD security gates
