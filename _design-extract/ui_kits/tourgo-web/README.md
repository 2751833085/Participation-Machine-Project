# Tourgo Web App — UI Kit

## Overview
High-fidelity interactive prototype of the Tourgo mobile web app.
Portrait-only SPA — 375px wide phone form factor.

## Screens covered
| Screen | Route key | Description |
|---|---|---|
| Home | `home` | Hunts feed with hero greeting, live favorites |
| Challenge detail | `challenge` | Checkpoint previews + start button |
| Active run | `run` | Live countdown timer, checkpoint photo upload UI |
| Create | `create` | Multi-checkpoint hunt creation form |
| Leaderboard | `leaderboard` | Ranked player list with avatars + merits |
| Profile | `profile` | Avatar picker, merits display, dark mode toggle |

## Files
| File | Purpose |
|---|---|
| `index.html` | Main prototype entry point |
| `Shell.jsx` | AppHeader, Dock, color constants, icon SVGs |
| `HuntCard.jsx` | HuntRow, HeroSection, SectionTitle, Badge |
| `RunPage.jsx` | RunPage, StatusBanner, TimerBar, CheckpointRow |
| `ProfilePage.jsx` | ProfilePage with avatar grid and settings |

## Usage
Open `index.html` in a browser. Use the **Tweaks** panel (toolbar toggle) to switch between light/dark themes and jump to any start screen.

Navigation within the prototype is fully clickable:
- Tap a hunt row → Challenge detail
- Tap "Start hunt" → Active run with live timer
- Bottom dock → all main sections

## Design notes
- Fonts: Cormorant Garamond (display) + DM Sans (UI), both from Google Fonts
- Avatar images sourced from `../../assets/avatars/`
- All color tokens match `colors_and_type.css` exactly
- No external icon dependencies — all icons are inline SVGs
