# Tourgo Design System

## Overview

**Tourgo** is a mobile-first web app for timed photo scavenger hunts set in Manhattan, NYC. Players browse "hunts" (challenges with multiple geo-tagged checkpoints), start a timed run, and submit photo proof at each checkpoint to earn "merits." Users can also create their own hunts, favorite hunts, view leaderboards, and manage a profile.

The app is built as a Firebase SPA using native ES Modules — no bundler. It is strictly portrait-orientation on narrow phone screens (a landscape "portrait gate" overlay blocks usage on wide screens).

**Sources used:**
- Codebase: `Participation-Machine-Project/` (mounted via File System Access API)
  - Key CSS: `public/css/tokens.css`, `components.css`, `layout.css`, `pages.css`, `base.css`
  - Key JS: `public/js/pages/home.js`, `run.js`, `components/shell.js`
  - Architecture doc: `ARCHITECTURE.md`

---

## Products

| Surface | Description |
|---|---|
| **Tourgo Web App** | Mobile portrait SPA — hunts feed, challenge detail, live run, create, profile, leaderboard, map |

---

## Content Fundamentals

### Tone & Voice
- **Warm, understated, and slightly literary.** Copy feels like a boutique travel guide — confident without being loud.
- **Second person ("you")** for UI text. First-person is rare.
- **Sentence case** almost everywhere. ALL CAPS only for small metadata labels and nav captions (e.g. badge text, dock labels).
- **No emoji** in UI copy. Unicode symbols (⚠) are used sparingly with `font-variant-emoji: text` to suppress color rendering.
- **Short, declarative statements.** E.g. "Good day." — "Timed photo hunts on Manhattan streets."
- **Italic** used sparingly for contextual/ambient info (e.g. NYC weather context line).
- Placeholder copy: "Untitled hunt", "No hunts yet. Be the first to create one."
- Error messages: plain prose, not technical. E.g. "Time is up. Try another hunt!"
- Success messages: brief, personal. E.g. "You finished in time. Merits added to your profile."

### Casing
| Element | Case |
|---|---|
| Page titles / h1 | Sentence case |
| Section headings | Sentence case |
| Badge labels | UPPERCASE |
| Dock nav labels | Sentence case (short: Hunts, Saved, Create, Rank, Profile) |
| Button labels | Sentence case |
| Form labels | UPPERCASE small |

---

## Visual Foundations

### Color Mood
A **"Scottish cabin / boutique hotel"** palette — warm parchment backgrounds, deep espresso browns, and muted sage greens. Two full themes: light (cream/linen) and dark (near-black/charcoal). Accent shifts from dark brown (#5c4a38) in light to warm gold (#c4a574) in dark.

### Color System (CSS vars in `colors_and_type.css`)
| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | #f3ece2 | #141210 | Page background |
| `--bg-warm` | #e8dfd2 | #1c1915 | Slightly warmer bg |
| `--surface` | #fdf9f3 | #221e19 | Card / panel surface |
| `--surface-2` | #efe8dc | #2e2923 | Secondary surface |
| `--text` | #221e1a | #f5f0e8 | Primary text |
| `--text-muted` | #5e564c | #9a9288 | Secondary text |
| `--border` | #dcd3c4 | #3d3730 | Default border |
| `--border-strong` | #c9bfb0 | #524a41 | Emphasized border |
| `--accent` | #5c4a38 | #c4a574 | Primary accent (CTAs, links) |
| `--accent-hover` | #453624 | #d4b88a | Hover state |
| `--accent-soft` | rgba(92,74,56,0.14) | rgba(196,165,116,0.18) | Soft accent fills |
| `--brown` | #7a5c45 | #b09a86 | Secondary brown |
| `--ok` | #4a6b4f | #7aab84 | Success/ok state |
| `--danger` | #a84848 | #e07a7a | Error/danger state |
| `--footer-bg` | #2a241c | #0f0d0b | Footer dark band |

### Typography
- **Display:** Cormorant Garamond — weights 500, 600, 700 + italic 500. Used for all headings, hero titles, brand name, modal titles. Tight tracking (−0.025em to −0.035em). Large sizes (clamp 2.2–2.75rem for h1).
- **UI:** DM Sans — weights 400, 500, 600, 700. Used for all body, buttons, labels, badges, nav. Slightly expanded tracking on caps (0.06–0.2em).
- Both fonts loaded via Google Fonts. See `colors_and_type.css` for the full import URL.

### Spacing & Radius
- Base unit: 1rem (16px)
- Border radii: `--radius-sm` 10px, `--radius-md` 14px, `--radius` 16px, `--radius-lg` 22px
- Tap target minimum: `--tap` 48px
- Title text inset: `--title-text-inset` 0.45rem (optical left-align for headings)

### Shadows
```
--shadow-sm: 0 1px 3px rgba(42,37,32,0.06)
--shadow-md: 0 10px 28px rgba(42,37,32,0.08)
--shadow-lg: 0 22px 56px rgba(42,37,32,0.12)
```
Shadows use warm brown tones (rgba 42,37,32), never cold grey.

### Backgrounds
The body has a subtle radial-gradient: accent-soft glow at top center + brown-soft glow at bottom-left, over `--bg`. No full-bleed photography in chrome. Hunt thumbnails are photo content only.

### Animation & Motion
- Easing: `cubic-bezier(0.25, 0.1, 0.25, 1)` — standard ease. Spring-like entry: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Page transitions: fade + translateY(12px) enter, 0.38s.
- Modal entry: sheet-style translateY(14px) + opacity, 0.34s spring.
- Dock tab icons scale 1.06× on active.
- FAB (create button): gradient circle with box-shadow glow; scales 1.05× on hover.
- `prefers-reduced-motion` respected everywhere.

### Cards
- Background: `--surface`, border: `1px solid --border`, radius: `--radius` (16px), shadow: `--shadow-md`.
- Hunt row cards: horizontal layout (120×120px thumb + body), min-height 7.5rem, hover lifts (translateY(−1px) + shadow-md + accent border tint).
- No left-border color accent pattern.

### Hover / Press States
- Buttons: background darkens to `--surface-2`, border to `--border-strong`.
- Primary buttons: `--accent-hover` (darker shade).
- Ghost buttons: background fills to `--surface-2`.
- Links: color to `--accent-hover`; active: opacity 0.9.
- No opacity-only hovers on buttons.

### Backdrop / Blur
- App header: `backdrop-filter: blur(14px)` with 88% opaque surface.
- App dock: `backdrop-filter: blur(16px)` with 94% opaque surface.
- Modal backdrop: `backdrop-filter: blur(10px)` with rgba(20,20,18,0.52).

### Corner Radii
Cards/modals: 16px. Buttons: 10px. Badges: 4px. Pills: 999px. FAB: 50%.

### Imagery
Hunt thumbnails are user-uploaded real photos (cover crop, 120×120). No stock illustrations in chrome. Avatar images are provided as `.webp` files (see `assets/avatars/`).

---

## Iconography

- **Style:** Custom inline SVG, stroke-based, 2px stroke-width, `stroke-linecap="round" stroke-linejoin="round"`. Filled variants exist for active states (fill="currentColor", stroke="none").
- **Size:** 22×22px for dock icons; 24×24px internal viewBox.
- **No external icon font/CDN** — all icons are hand-crafted SVGs inlined in JS components.
- **No emoji used as icons.** Unicode symbols used only in alerts with `font-variant-emoji: text`.
- Icon source: `Participation-Machine-Project/public/js/components/shell.js` — DOCK_ICONS object contains all nav icons (hunts, favorited, create/plus, leaderboard, profile, signIn).
- Icons are copied into `assets/icons/` as individual SVG files.

---

## Files Index

```
README.md                  ← This file
colors_and_type.css        ← All CSS custom properties + Google Fonts import
SKILL.md                   ← Agent skill definition

assets/
  avatars/                 ← Default avatar .webp files (16 avatars)
  icons/                   ← Dock SVG icons (outline + filled variants)
  manhattan-browse-map.svg ← NYC map SVG asset

preview/
  colors-light.html        ← Light theme color swatches
  colors-dark.html         ← Dark theme color swatches
  colors-semantic.html     ← Semantic color tokens (ok, danger, accent)
  type-display.html        ← Cormorant Garamond specimens
  type-ui.html             ← DM Sans specimens
  type-scale.html          ← Full type scale (h1→label)
  spacing-tokens.html      ← Radius + shadow + spacing tokens
  components-buttons.html  ← Button variants
  components-cards.html    ← Card + hunt row + badge
  components-forms.html    ← Form fields + status banners
  components-dock.html     ← Bottom dock navigation
  components-modals.html   ← Modal dialog

ui_kits/tourgo-web/
  README.md                ← UI kit notes
  index.html               ← Interactive prototype (Home → Challenge → Run)
  Shell.jsx                ← App shell, dock nav
  HuntCard.jsx             ← Hunt row card component
  HeroSection.jsx          ← Page hero band
  RunPage.jsx              ← Live run timer + checkpoints
  ProfilePage.jsx          ← Profile screen
```
