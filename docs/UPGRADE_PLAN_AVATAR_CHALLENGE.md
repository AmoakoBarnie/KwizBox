# Upgrade Plan: Avatar Customization + Challenge Head-to-Head
# Logged: 2026-09-11 — not applied yet, planning only.

## UPGRADE 8: Avatar / Profile Customization
## =========================================

### What it is
Signed-in users pick an avatar skin tone, hat, and accessory. The choice is
stored on the User model and the Mascot component renders the personalized
avatar everywhere it already appears (Landing, Play, Quiz, Summary,
ChooseQuiz, Challenge).

### Why it matters
Small personalization increases kid retention. The Mascot is the app's main
character and already appears throughout the UI — making it "theirs" gives
users a reason to come back and show their friends.

### What exists today (starting point)
- Mascot.jsx: pure inline SVG, already supports `gender` (male/female) as a
  visual variable. This is the rendering foundation we build on.
- User model: has nickname, class_level, school_code, is_guest — no avatar
  fields yet.
- Auth context (auth.jsx): exposes `user` object — will carry the new avatar
  fields once the model and API are updated.
- Profile page (Profile.jsx): exists, is the natural home for avatar settings.

### Fields to add to User model (backend/src/models.py)
- `avatar_skin` — String(20), default "warm" — skin tone option.
  Options: warm (current #a86b3c), deep, light, cool — 4 tones.
- `avatar_hat` — String(20), default "none" — headwear.
  Options: none, kente_cap, school_cap, beanie, sun_hat — 5 options.
- `avatar_accessory` — String(20), default "none" — an item.
  Options: none, glasses, watch, necklace, school_bag (the bag strap already
  exists; make it toggleable), bow_tie — 6 options.
- `avatar_gender` — keep existing gender logic but move it to a stored field
  so the profile can set it. Currently gender is passed per-render; storing it
  means the avatar is consistent everywhere without passing the prop each time.

Total: 4 columns. All nullable=False with sensible defaults so existing users
get the current look without any migration fuss.

### Mascot.jsx changes (the rendering layer)
Mascot currently takes `({ state, size, gender, classLevel, walking })`.
After the upgrade it takes `({ state, size, avatar, classLevel, walking })`
where `avatar` is an object: `{ skin, hat, accessory, gender }`.

The component becomes a compositor: it renders the base body (same as today),
then layers on optional SVG groups based on `avatar`:

1. **Skin tone** — the head circle + arm/hand fills currently use `#a86b3c`
   hardcoded. Replace with `skinColor` computed from `avatar.skin`. 4 tones:
   - warm: #a86b3c (current)
   - deep: #6b3a1f
   - light: #d4a574
   - cool: #8d6e63

2. **Hat layer** — a new SVG group rendered above the hair, below/around the
   head, positioned at cx=60 cy=22 (top of head). 5 variants:
   - none: nothing
   - kente_cap: a small Kente-pattern cap (reuse the kente pattern already in
     Mascot's <defs>)
   - school_cap: a peaked school cap (navy with gold button)
   - beanie: a knit beanie (slate with a folded brim)
   - sun_hat: a wide-brim sun hat (straw/tan)
   Each is its own `<g>` with a `showHat` conditional. Position all hats at
   `transform-origin: 60px 22px` so they scale consistently.

3. **Accessory layer** — a new SVG group rendered on the body. 6 variants:
   - none: nothing
   - glasses: round frames over the eyes (two circles + bridge arc)
   - watch: a small circle on the left wrist (left arm rect area)
   - necklace: a thin chain + pendant below the collar
   - school_bag: toggle the existing satchel-strap path on/off (already in the
     SVG; just make it conditional on `avatar.accessory === 'school_bag'`)
   - bow_tie: a small bow at the collar
   Each accessory is a `<g>` with a `showAcc` conditional.

4. **Gender** — keep the existing male/female hair paths. Move the `isFemale`
   ternary into a function of `avatar.gender`. Nothing new here, just wired
   through the avatar object.

5. **Defaults for existing users** — if `avatar` is undefined or all fields are
   default, render exactly the current Mascot (no visual change for existing
   users). This is critical: the upgrade must not change the look of the app
   for anyone who hasn't chosen an avatar.

### Profile page changes (frontend/src/pages/Profile.jsx)
Add an "Avatar" section to the Profile screen:
- Skin tone picker: 4 swatches (circles showing the actual skin tone color)
- Hat picker: 5 small inline SVG thumbnails of each hat option (render mini
  Mascot-with-hat, or simpler: icon + label)
- Accessory picker: 6 swatches
- Gender toggle: male/female (if we store gender)
- "Save" button — POSTs to a new backend endpoint to update the user's avatar.

The picker UI should show a live preview: a small Mascot render that updates
as the user picks options. This is the "try before you buy" moment. The preview
reuses the same Mascot component with the chosen `avatar` object — no separate
preview code needed.

### API changes (backend)
- New endpoint: `PATCH /auth/me` (or `/user/avatar`) — updates the current
  user's avatar fields. Body: `{ skin?, hat?, accessory?, gender? }`.
  Returns the updated user object (or just the avatar fields).
- The existing `GET /auth/me` already returns the user; after the model change
  it will include `avatar_skin`, `avatar_hat`, `avatar_accessory`,
  `avatar_gender` — the frontend reads these on login and stores them in the
  auth context.

### Auth context change (frontend/src/auth.jsx)
The `user` object in auth context should carry `avatar` (the object) once the
API returns it. `login()` already sets `user` from `/auth/me` response — just
make sure the response shape includes the new fields and the context surfaces
them. No separate "load avatar" step needed; it comes with login.

### Where the avatar is consumed (pass `avatar` through)
Every place that renders `<Mascot>` currently passes `gender` explicitly. After
the upgrade, replace per-component `gender` props with a single `avatar` prop
from auth context. Files to touch:
- Landing.jsx — Mascot on landing (no gender prop today; uses default male)
- Play.jsx — Mascot with `state="thinking"` + `size={100}`
- Quiz.jsx — Mascot with `state={mascot}` + `size={76}` + `gender="female"`
- Summary.jsx — Mascot with `state={celebrate?...}` + `size={130}` +
  `gender="female"` + `walking={celebrate}`
- ChooseQuiz.jsx — Mascot with `state="thinking"` + `size={80}`
- Challenge.jsx — possibly a Mascot in the challenge UI (check current usage)

The cleanest path: add `avatar` to the auth context `user` object, then in each
Mascot consumer read `user.avatar` and pass it. For logged-out / guest users,
pass a default avatar (warm skin, no hat, no accessory, gender from the context
default) so nothing breaks.

### Migration / backward compat
- DB migration: ALTER TABLE users ADD COLUMN for each of the 4 new fields with
  defaults. Existing users get the defaults → no visual change.
- The `Avatar` object in the frontend should be backward-compatible: if the API
  returns a user without avatar fields (old client, or during rollout), the
  frontend defaults to the current look.
- Guest users: no avatar stored (guests are device-only). They see the default
  mascot. Optionally, guests could pick a temporary avatar stored in
  localStorage, but that's a later enhancement — not in this first pass.

### Scope of first pass (MVP)
- 4 model fields
- 1 PATCH endpoint
- Profile page avatar section with live preview
- Mascot compositor (skin + hat + accessory layers)
- Pass avatar through auth context to all Mascot consumers
- Default avatar for guests / unset users

### Out of scope for first pass
- Guest localStorage avatar (later)
- Animations that differ per avatar (later — same walk cycle for all)
- Avatar in leaderboards / summary cards as a tiny avatar circle (later —
  nice-to-have, not needed for the core "your mascot is yours" feeling)
- More than 4 skins / 5 hats / 6 accessories (fine-tune later based on what
  kids actually pick)

---

## UPGRADE 9: Challenge Mode — Friend Codes + Head-to-Head
## ============================================================

### What it is
Make the existing challenge flow feel like a real social game:
1. When you create a challenge, you get a **share card** — not just a text code,
   but a card with the code, a QR, and a deep link you can send to a friend.
2. When your friend joins and both of you finish, you see a **head-to-head
   comparison card** — you vs your friend, side by side, with who won, not just
   a ranked leaderboard.

### What exists today (starting point)
**Frontend (Challenge.jsx):**
- Create tab: pick class + subject → `POST /challenge/create` → get a 6-letter
  code → show `CodeDisplay` (big code text + copy button)
- Join tab: enter code → `GET /challenge/{code}/questions` → load questions
- Play: nav to `/quiz` with `challengeCode` in state
- Compare tab: `GET /challenge/{code}/compare` → show `LBRow` leaderboard list
- CopyButton component already exists (clipboard write + "✓ Copied!" toast)
- 4-step "How it works" panel already explains the flow

**Backend (challenge.py):**
- `POST /challenge/create` → generates 6-char code, picks 12 questions by
  seed (deterministic: same class+subject → same questions every time), returns
  code + meta
- `GET /challenge/{code}/questions` → returns the 12 questions for that code
- `POST /challenge/{code}/submit` → scores the submission, creates a QuizSession,
  marks challenge completed when 2+ users have submitted in the window
- `GET /challenge/{code}/compare` → returns completed sessions joined with user
  nickname, class_level, score, correct, total, accuracy, is_creator flag

**Gaps:**
1. Share step is a text code only — no QR, no deep link, no "send to friend"
   UI.
2. Compare shows a leaderboard table — not a "you vs friend" head-to-head card.
3. The "awaiting" state after create is just "share this code" — no prompt to
   share, no visual card to share.

### Part A: Share card (create step)
When a user creates a challenge and gets the code, instead of just showing
`CodeDisplay`, show a **share card** — a visual card the user can share.

**Share card contents:**
- The 6-letter code, big and prominent (already in CodeDisplay — keep it)
- A **QR code** encoding the deep link (see below) — so a friend with a phone
  can scan instead of typing
- A **deep link** URL: `https://<tunnel_or_domain>/challenge/join/<code>` —
  this is the shareable link. When opened, it reads the code from the URL,
  fills the join input, and the user clicks "Join" (or auto-joins if token is
  present).
- Subject + class label (already in challenge-meta — keep it)
- A "Copy link" button (clips the deep link) and a "Copy code" button (already
  in CopyButton — keep it)

**QR code generation:**
- Use a lightweight QR library. Options: `qrcode` npm package (no canvas
  dependency issues in browser), or a CDN SVG QR. The QR encodes the deep link.
- Render as an inline SVG in the share card so it's shareable, not a canvas
  blob.
- Size: ~100x100px in the card.

**Deep link route:**
- Add a React Router route: `/challenge/join/:code` → renders a small "Join
  Challenge" screen that pre-fills the code input with the URL param and focuses
  it, with a big "Join" button. If the user is signed in, optionally auto-load
  the questions on click.
- This route is public (no auth required to view it) — the auth check happens
  when they actually submit/join.
- Optionally add a plain `/challenge/<code>` redirect that lands on the join
  screen too (shorter URL).

**"Send to friend" actions on the share card:**
- Copy link (clipboard)
- Copy code (already exists)
- Optionally: `navigator.share()` if available on mobile (native share sheet) —
  this is the best mobile UX. Wrap in a try/catch; fall back to copy link.
- The share card should have a "Done" / "I shared it" button that returns to
  the awaiting state or to Play.

**Visual design of the share card:**
- Make it feel like a real "invite" — a card with the code as the hero element,
  the QR in a corner, the subject/class as a label, and action buttons.
- Use the existing `card` glass style + the Ghana palette for accent.
- Add a subtle "Share with a friend" heading so the purpose is clear.

### Part B: Head-to-head comparison card (compare step)
After both players have submitted, instead of (or in addition to) the leaderboard
table, show a **head-to-head card**.

**What the card shows:**
- Two columns: "You" and "Your friend" (or "Player 1" / "Player 2" if names are
  awkward)
- Each column shows:
  - The player's avatar/mascot or nickname
  - Score (pts)
  - Correct / total (e.g. "9/12")
  - Accuracy %
  - Best streak during that challenge (if we capture it — currently the submit
    endpoint doesn't record per-question streaks; see "data gap" below)
  - A grade emoji (already in LBRow: 🌟/👍/📚/📖/💪 based on accuracy)
- A **winner banner** at the top: "You won! 🎉" or "Your friend won! 🏆" or
  "It's a tie! 🤝" — determined by score (or correct count as tiebreak).
- A "Play again" / "New challenge" CTA.

**Data the compare endpoint must return for head-to-head:**
Today `GET /challenge/{code}/compare` returns a list of sessions with:
`session_id, nickname, score, correct, total, accuracy, class_level, is_creator`

For a clean head-to-head we need exactly 2 players. The current logic marks a
challenge "completed" when 2+ users submit — so by the time compare is called,
there are at least 2. The frontend already filters to the challenge's players.

**What's missing for a great head-to-head:**
1. **Per-question results for the challenge**: currently `submit` only records
   the aggregate (correct_count, total_pts) in a QuizSession. It doesn't store
   which questions were answered correctly. To show "you both got Q3 right" or
   "you got Q3, your friend didn't" we'd need per-question answer records.
   - This is a real backend addition: either add an `ChallengeSessionAnswer`
     model (challenge_code, user_id, question_id, selected_index, is_correct),
     or record the answers in the existing QuizSession as a JSON blob.
   - Without this, the head-to-head is score-only — still valuable, but less
   - rich. **Recommend: first pass shows score/correct/accuracy/streak; second
     pass adds per-question comparison if it's worth the complexity.**
2. **Best streak per challenge**: the submit endpoint currently doesn't compute
   or store a per-challenge streak. The Quiz.jsx during-play streak is local
   state. To show "your best streak in this challenge: 5", we'd need to capture
   it at submit time. The Quiz component already tracks `streak` state — we'd
   pass it into the submit payload.
   - **Data gap**: `POST /challenge/{code}/submit` takes `answers: list[
     AnswerSubmission]` (question_id + selected_index) and `duration_seconds`.
     It does NOT take `streak`. Add a `max_streak` field to the submit body,
     store it on the QuizSession (add a `max_streak` column or put it in a JSON
     field), and surface it in compare.
3. **Which player is "you"**: the compare endpoint returns `is_creator` for the
   session's user. The frontend already uses this in LBRow. For head-to-head,
   match `is_creator === true` to "you" if the viewer is the creator, otherwise
   match by the viewer's own user ID. The compare response should include the
   current user's session so the frontend knows which column is "you".

### Part C: Flow polish (UX, no backend)
1. **Awaiting state after create** — currently shows the code + "Load my
   questions" + "Create another". Upgrade to: share card (see Part A) + a clear
   "Waiting for your friend to join…" message + a "I'm ready, waiting" state.
   When the friend joins (poll or just on click), both proceed.
2. **Join flow** — after entering a valid code, show a "You're in! Your friend
   created a Class B6 Science challenge. Load your questions when ready." screen
   before the quiz starts — sets expectations.
3. **Post-quiz, pre-compare** — after submitting, show "You finished! Waiting
   for your friend to finish so you can compare…" — a polling or manual-refresh
   state. Currently the flow goes submit → compare (which may be empty if the
   friend hasn't submitted). Add a "Check again" button and a "waiting" state.
4. **Tie / no contest handling** — if scores are equal, show "It's a tie!" not
   "Player 1 won". The comparison logic should handle this.
5. **Expired/complete challenge join** — if someone tries to join an expired or
   completed challenge, show a friendly "This challenge has ended. Create a new
   one!" message, not a raw error.

### Backend changes (challenge.py + models.py)
1. **Submit: accept `max_streak`** — add to `AnswerSubmission` or a new body
   field. Store on the QuizSession (add `max_streak` column, Integer, default 0).
   Surface in compare response.
2. **Compare: return the viewer's own entry** — ensure the response includes a
   flag or the current user's session so the frontend can pick "you" vs "friend".
   Currently returns all sessions; the frontend can match by `user_id` if we
   return user_id too (currently returns nickname but not user_id — add
   `user_id` to the compare response).
3. **Optional, second pass: per-question challenge answers** — add a model or
   JSON column to record per-question correctness for a challenge, so the
   head-to-head can show question-by-question comparison. Defer to v2 unless
   the user wants it now.
4. **Optional: challenge status polling** — add a lightweight endpoint
   `GET /challenge/{code}/status` that returns `{ has_2_players, completed,
   my_submitted }` so the "waiting" UI can poll without fetching the full
   compare every time. Low cost, good UX. Defer to v2 if not needed.

### Frontend changes (Challenge.jsx + new components)
1. **Share card component** (`ShareCard` or inline in Challenge.jsx) — renders
   the code, QR, deep link, copy buttons, subject/class label. Shown in the
   `awaiting` mode after create.
2. **QR code** — use a QR library to render the deep link as SVG inline.
3. **Deep link route** — add `/challenge/join/:code` to the router (App.jsx),
   with a small JoinChallengeScreen component that pre-fills the code.
4. **Head-to-head card component** (`HeadToHead` or inline) — two columns,
   winner banner, stats. Shown in `compare` mode after both players submitted.
5. **Compare mode upgrade** — keep the leaderboard table (it's useful for 3+),
   but when there are exactly 2 players, lead with the head-to-head card.
6. **Waiting states** — "waiting for friend to join" and "waiting for friend to
   finish" states with a "check again" action.
7. **navigator.share** on the share card — try native share, fall back to copy.
8. Pass the viewer's `user_id` / `token` into compare so the backend can mark
   "you" in the response (or the frontend matches locally if user_id is returned).

### Router changes (App.jsx)
- Add route: `/challenge/join/:code` → `JoinChallengeScreen`
- Optionally: `/challenge/:code` → redirect to `/challenge/join/:code`

### Deep link format
- Production / tunnel: `https://<hostname>/challenge/join/<code>`
- Local dev: `http://localhost:5173/challenge/join/<code>`
- The QR encodes whichever hostname is current. In local dev, the QR is less
  useful (can't scan from another device on localhost), but the copy-link button
  still works for testing. In the tunnel, the QR is fully functional.

### MVP scope for first pass
- Share card with code + QR + deep link + copy buttons + navigator.share
- `/challenge/join/:code` deep link route
- Head-to-head card for 2-player compare (score, correct, accuracy, grade,
  winner banner) — using existing compare data + `max_streak` if added
- Add `max_streak` to submit + compare (1 model column + 1 body field)
- Add `user_id` to compare response (so frontend knows who is "you")
- Waiting states for "friend joining" and "friend finishing"
- Keep the existing leaderboard table for 3+ players

### Out of scope for first pass
- Per-question head-to-head comparison (needs new data model — defer to v2)
- Real-time updates (WebSockets/polling) — use manual "check again" + optional
  status endpoint in v2
- Challenge rooms with 3+ head-to-head brackets — leaderboard table already
  handles 3+; head-to-head is specifically for 1-on-1
- Animated win celebration beyond the existing Confetti (the Summary already
  has Confetti for perfect scores — reuse or a small "You won!" animation)

---

## Cross-cutting notes (both upgrades)
## =====================================

### Reuse what exists
- Mascot.jsx is the rendering base for avatars — don't build a separate
  avatar component. Extend Mascot to be a compositor.
- CopyButton + CodeDisplay already exist in Challenge.jsx — reuse for the share
  card. Don't rewrite clipboard logic.
- LBRow, fadeUp, pop variants already in Challenge.jsx — reuse for the
  head-to-head card.
- The Ghana flag palette + glass card style already in styles.css — use it for
  the share card and head-to-head card.

### Auth context is the delivery mechanism for avatars
- Once avatar fields are on the User model and returned by `/auth/me`, the
  auth context `user` object naturally carries them. Every Mascot consumer reads
  `user.avatar`. No separate "load avatar" flow.
- For guests / not-yet-logged-in, use a default avatar object so Mascot never
  receives undefined.

### Test users for dev
- peswa / password123 — normal signed-in user, can create + join challenges,
  can set avatar.
- testuser / password123 — second signed-in user, used to test the 1-on-1
  challenge flow (one creates, one joins).
- The challenge flow needs two signed-in users to test end-to-end. Use
  incognito / two sessions.

### Things to verify after each upgrade
**Avatar:**
- Existing users (peswa, testuser) see the default mascot after upgrade (no
  visual change until they pick an avatar).
- New avatar picks save and persist across login/logout/refresh.
- Avatar renders correctly in all 6 Mascot consumers (Landing, Play, Quiz,
  Summary, ChooseQuiz, Challenge).
- Guest users see the default mascot (no crash from missing avatar).

**Challenge:**
- Create → share card shows code + QR + deep link + copy buttons.
- Deep link `/challenge/join/<code>` pre-fills the code and focuses the input.
- Two users (peswa creates, testuser joins via code) both load the same 12
  questions.
- After both submit, the head-to-head card shows both players with a winner.
- `navigator.share` on mobile attempts native share (graceful fallback to copy).
- Expired/completed challenge gives a friendly message, not a raw error.

### Dependencies
- QR code: `qrcode` npm package (or equivalent) for the share card. No other
  new runtime deps for either upgrade.
- Avatar: no new deps — pure SVG compositor in Mascot.jsx.
- Head-to-head: no new deps — component work + small model + endpoint additions.

---

##文件位置参考 (where to touch)
## =====================================

### Upgrade 8 (Avatar)
- backend/src/models.py — add 4 User columns
- backend/src/routes/auth.py — add PATCH /auth/me (or /user/avatar) endpoint
- backend/src/routes/quiz.py or a new user route — whichever owns user CRUD;
  check where admin user-edit lives to keep avatar editing consistent
- frontend/src/auth.jsx — surface avatar in the user object
- frontend/src/components/Mascot.jsx — compositor: skin + hat + accessory
  layers, avatar prop instead of gender prop
- frontend/src/pages/Profile.jsx — avatar picker section with live preview
- frontend/src/pages/Landing.jsx, Play.jsx, Quiz.jsx, Summary.jsx,
  ChooseQuiz.jsx, Challenge.jsx — pass user.avatar to Mascot instead of
  per-component gender prop

### Upgrade 9 (Challenge)
- backend/src/routes/challenge.py — add max_streak to submit body + store,
  add user_id to compare response, optionally add /challenge/{code}/status
- backend/src/models.py — add max_streak column to QuizSession (and optionally
  a ChallengeSessionAnswer model for v2 per-question comparison)
- frontend/src/pages/Challenge.jsx — share card, head-to-head card, waiting
  states, navigator.share
- frontend/src/App.jsx — add /challenge/join/:code route
- new: frontend/src/pages/JoinChallengeScreen.jsx (or inline in Challenge.jsx)
- new: QR code (qrcode npm package) for share card
