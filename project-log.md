# KwizBox project log

> Append-only record of what was asked, decided and shipped. Newest entries at
> the bottom. Git history and `CHANGELOG.md` hold the detailed diff.

## 2026-11-14 — Fly.io production launch

- Owner request: “Set me up on Fly.io and launch this project as an app in the
  stephen-amoako organization: https://fly.io/agent-ready.md”.
- Decision: use **Fly Machines** (not Sprites), a single Machine with a 1 GB
  persistent volume, SQLite (no Postgres migration), and a sanitized
  questions-only seed. All secrets via `fly secrets`; none in `fly.toml`/Git.
- Created app `kwizbox-gh` in the owner's Fly personal org (display name
  “Stephen Amoako”), region `jnb`, volume `kwizbox_data`.
- Added Dockerfile, fly.toml, .dockerignore, deploy/entrypoint.sh and
  scripts/build_production_seed.py; fixed BUG-024 (Fly client IP), BUG-025
  (manifest path) and BUG-026 (cache-busting + CSP hash).
- Deployed and verified publicly: health/admin/policies/manifest, routes
  13/13, guest 5/5, security smoke 30/30, full API 37/37, register UI 15/15,
  duel 13/13. Machine restart preserved the volume.
- Live URL: <https://kwizbox-gh.fly.dev>.
- Open: 26 test users created by verification need owner-approved cleanup
  (md5-verified backup first); M3 Capacitor APK can now target the public URL.
