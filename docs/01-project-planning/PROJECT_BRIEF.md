# PROJECT_BRIEF.md

> Part of `docs/01-project-planning/`. What KwizBox is and why it exists.
> Verified against the live system 2026-11-10.

## What we are building

**KwizBox** — a mobile-first STEM trivia application for Ghanaian learners,
aligned to the NaCCA curriculum. Learners pick their class level and subject,
answer quiz rounds (typically 12 questions), earn points with streak/combo
collect badges, climb leaderboards, and challenge friends
head-to-head with shareable codes. A 3D mascot character reacts to their
answers. The question bank stands at **7,890 reviewed questions** (grew from
3,230 → 7,710 → 7,890; PR #2's 180 merged 2026-11-10).

## Why we are building it

- Learning in Ghana is exam-oriented and content-scarce; NaCCA-aligned practice
  material that feels like a game (not a past paper) is rare.
- Target devices are low-end Android phones on metered/3G data — the app is
  designed mobile-first and low-data (PWA, small payloads, cached shell).
- The question bank is large and curriculum-tagged (class → subject → strand →
  topic → sub-topic → difficulty), enabling targeted practice rather than
  random trivia.

## Who will use it

- **Primary users:** learners from Primary 4 (B4) through JHS 3 (B9) — ages
  ~9–16 — plus senior-level students (S1–S3, SHS 1–3) added in later phases.
- **Secondary:** teachers (school codes, class leaderboards), parents, and
  school administrators (admin dashboard: users, questions, school codes,
  audit, exports).
- **Guest mode:** anyone can play without registering (device-local only,
  excluded from leaderboards by design).

## What success looks like

- Playable on a low-end Android phone over 3G without frustration.
- Learners return repeatedly (streaks, daily challenge, friend challenges).
- The app is published: public backend (Fly.io), Play Store listing, policy
  pages in place (Privacy/Terms/Cookie — present in `frontend/src/pages/`).
- The question bank keeps growing with reviewed content (7,710 today).

## Project boundaries

**In scope:** the trivia app (web PWA + Android via Capacitor), its backend
API, the question bank and its tooling, deployment, and the admin dashboard.

**Out of scope for the current milestone:** offline quiz packs, push
notifications, multi-language (Twi/Ga/Ewe), analytics dashboards, adaptive
difficulty, monetization. See `SCOPE.md`.

## Current status in one paragraph

The application is functionally complete for its core loop (register/guest →
choose quiz → play → results → progress/leaderboards/challenges/admin) and has
an Android build. The project is mid-flight on a deliberate release path:
migrate SQLite → Postgres (Supabase), deploy the backend publicly (Fly.io),
rebuild the APK against the public backend, and submit to the Play Store.
Security hardening (rate limits, security headers, cookie auth, secret
scanning in CI) is underway and partially committed.
