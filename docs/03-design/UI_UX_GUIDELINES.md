# UI_UX_GUIDELINES.md

> Part of `docs/03-design/`. The design language of KwizBox, extracted from
> the live implementation (`frontend/src/styles.css`, components) so new work
> stays consistent.

## Identity

- **Audience:** Ghanaian learners ~9–18 on low-end Android, often 3G.
- **Feel:** playful, celebratory, proudly Ghanaian — but fast and legible.
- **Mobile-first**: everything is designed for the phone; desktop is the
  stretched phone, not a separate layout.

## Color system

| Token | Value | Use |
|---|---|---|
| Ghana green | `#00B36B` | primary actions, success |
| Ghana gold | `#FFD23F` | accents, highlights, streaks |
| Ghana red | `#CE1126` | wrong answers, destructive |
| Night-sky navy gradient | `#050a18 → #0f1f35` | dark theme background |
| Glass cards | translucent + `backdrop-filter: blur` | panels/sections |

Dark theme is default; light theme via toggle (sun/moon, top-right). Night-sky
layer (stars, planets, shooting star) renders **only** in dark theme.

## Components & patterns

- **Glassmorphism cards** for all content panels.
- **Kente-pattern frames** (`KenteFrame.jsx`) for decorative titles/borders.
- **Inline expandable sections** for quiz selection (no popup overlays).
- **Mascot system** (3D, React Three Fiber): state-driven clips —
  `thinking→idle`, correct→`celebrate`, wrong→`encourage`, walking→`walk`;
  characters by class level × gender (`shs_male/youth_male/shs_female/
  youth_female`). Clip names are a load-bearing contract (see
  `models/README.md`).
- **Feedback rituals:** confetti on results; sound effects (correct, wrong,
  streak, combo, click) with a persistent toggle; flame animation for streaks.
- **Page transitions:** framer-motion springs throughout.

## Accessibility rules (non-negotiable)

1. Focus-visible rings on all interactive elements.
2. Skip-navigation link present.
3. `prefers-reduced-motion` respected — including JS-driven motion (CSS
   `no-motion` alone is insufficient; components need their own guards —
   verified by `verify-reduced-motion.mjs`).
4. Text contrast maintained in both themes.
5. Touch targets sized for small screens.

## Performance rules (design-level)

- Low-data: no large images; SVG diagrams only where pedagogically needed.
- 3D assets are meshopt-compressed GLBs; keep the decoder wired.
- PWA shell cached for offline startup; quiz content itself is online-only
  for now (offline packs are out of current scope).

## When adding new UI

- Reuse design tokens and glass-card language; do not introduce a second
  visual system.
- New animated elements must ship with a reduced-motion path.
- New pages get routes in `App.jsx` with framer-motion transitions to match.
- Anything user-facing that collects data must be reflected in the policy
  pages (`policy-check.mjs` will flag drift).
