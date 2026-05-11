# Tourgo NeoUI Implementation Guide

This document describes the current UI design direction for implementing Tourgo and Tourgo Friends in the main codebase. The source previews live in `_design-v2/project`.

## Preview Files

- `Tourgo UI.html`: main Tourgo app UI.
- `Tourgo Friends UI.html`: Tourgo Friends / manhunt UI.
- `lib/preview-shell.jsx`: preview-only shell. It renders pure 390 x 844 iPhone-ratio app screens without the device frame, dynamic island, status bar, or home indicator.
- `lib/neo-pages.jsx`: shared NeoUI tokens and base Tourgo screens.
- `lib/main-ui.jsx`: additional Tourgo main app screens and menus.
- `lib/friends-ui.jsx`: Friends screens and game states.
- `lib/loaders.jsx`: Rose Orbit and Spiral Search loaders.

Current preview URLs:

- `http://127.0.0.1:4173/Tourgo%20UI.html`
- `http://127.0.0.1:4173/Tourgo%20Friends%20UI.html?v=role-after-dispersal#friends-light`

## Visual System

The active theme is NeoUI only. Classical is not part of the active UI.

Fonts:

- Display: `Barlow Condensed`, fallback `"DIN Condensed", "Arial Narrow"`.
- UI/body: `"Avenir Next", "Helvetica Neue", "Segoe UI", Arial`.

Light palette:

- `bg #ece8df`
- `bgAlt #f1ede4`
- `surface #f7f3ea`
- `accent #c76a4e`
- `accentSoft #d99a82`
- `deep #3c5b53`
- `text #2c3c37`
- `muted #6a7570`
- `dock #e0d2b3`
- cards: lavender `#bdaec4`, peach `#d9a892`, mustard `#c4b585`, mint `#a8b8ac`

Dark palette:

- `bg #242b2c`
- `bgAlt #2d3536`
- `surface #374042`
- `accent #d88d6f`
- `accentSoft #9f6a59`
- `deep #e6dcc8`
- `text #f4efe4`
- `muted #b2bdb8`
- `dock #343d3f`
- cards: lavender `#4a4658`, peach `#59453f`, mustard `#554c38`, mint `#3b4e48`

Design language:

- Color-blocked cards with low-radius slabs, hard shadow accents, condensed uppercase headings.
- Use real SVG/lucide-style icons for dock tabs and actions. Do not use placeholder glyphs like hollow circles for active navigation.
- Fixed circular controls must use equal width/height, `aspect-ratio: 1 / 1`, and `flex-shrink: 0`.
- Dark mode should stay mineral graphite, not black or purple-heavy.

## Preview/Device Rules

- Implementation should target the screen content, not an iPhone mockup shell.
- Keep the app screen ratio at 390 x 844 in previews.
- Do not render dynamic island, iPhone bezel, status bar overlays, or home indicator as part of app UI.
- For keyboard-open states, reserve the lower area for the iOS keyboard and keep the active input/control above it. Do not shift whole screens upward unless a modal/input would otherwise be covered.

## Loading Rules

All loading UI uses math-curve loaders:

- Blocking/fullscreen loading: Rose Orbit.
- Refresh/inline loading: Spiral Search.
- Loader backgrounds should be transparent/bare by default. Keep only the animated curve and text where needed.
- Match colors to NeoUI tokens for light/dark.

## Tourgo Main Flow

Main Tourgo preview contains 29 screens per mode:

1. Welcome
2. Sign in
3. Hunts home
4. Hunt detail
5. Active run
6. Leaderboard
7. Profile
8. Loading
9. Loading overlay
10. Daily welcome
11. Confirm modal
12. Top banner
13. Reviews
14. Grid view
15. Map explore
16. Create menu
17. Create hunt
18. Create map sheet
19. Photo proof
20. Saved
21. Admin
22. Profile menu
23. Filter sheet
24. Report modal
25. Publish success
26. Sign in, keyboard open
27. Map search, keyboard open
28. Create title, keyboard open
29. Report details, keyboard open

Important implementation notes:

- Main dock includes Hunts, Saved, Create, Rank, Profile.
- Popup/sheet surfaces must match NeoUI cards: rounded slabs, token backgrounds, strong CTA button.
- Report/details keyboard state must keep the detail field and submit actions visible above keyboard.
- Map search keyboard state must keep search field visible and avoid moving the entire map incoherently.

## Tourgo Friends Flow

Friends preview contains 37 screens per mode:

1. Friends start
2. Create room
3. Join room
4. Friends ranks
5. Social
6. Me
7. Room lobby
8. Ready check
9. Dispersal
10. Role reveal, runner
11. Role reveal, hunter
12. Hunter status
13. Runner status
14. Team chat
15. Hunter scan tab
16. Runner QR tab
17. Room about
18. Camera headshot
19. Photo preview
20. Scanner overlay
21. Create confirm
22. Add friend modal
23. Capture confirm
24. Stalemate overlay
25. Relocate alert
26. Captured overlay
27. Spectator stats
28. Spectator chat
29. Spectator exit
30. Hunters win
31. Runners win
32. Creating room
33. Created success
34. Create room, keyboard open
35. Join code, keyboard open
36. Add friend, keyboard open
37. Team chat, keyboard open

## Friends Phase Logic

The current intended game sequence is:

1. Lobby: players upload/capture photo and become ready.
2. Ready check: all players must agree. Each player has a vote state: Ready, Waiting, or Cancelled.
3. Once everyone taps Ready, enter Dispersal immediately.
4. After Dispersal ends, show a one-time fullscreen role reveal for 5 seconds.
5. Role reveal text is English: `You are a Runner.` or `You are a Hunter.`
6. After role reveal, enter the corresponding active game UI.

Ready check UI requirements:

- Display `Everyone must agree`.
- Show progress like `4/5 agreed`.
- Show each player as a compact status tile with avatar, name, host ribbon when relevant, and Ready/Waiting state.
- Bottom actions: `Cancel` and `I'm ready`.
- Text should say Dispersal begins when everyone agrees. Do not say countdown appears before Dispersal.

Dispersal UI requirements:

- This phase happens before role reveal.
- Runners hide first; hunters wait.
- Keep role hidden during Dispersal.

Role reveal UI requirements:

- Fullscreen, one-time, no dock.
- Show `Dispersal complete · 5 sec`.
- Show `You are a` + large `Runner.` or `Hunter.`
- Include a brief role instruction.
- Then transition to Runner/Hunter active status.

## Friends Navigation

Home dock:

- Start
- Ranks
- Social
- Me

Game dock:

- Status
- Team
- Scan/QR
- About

Spectator dock:

- Stats
- All chat
- Exit

All dock icons must be actual SVG icons. Social uses a group/people icon. Team chat uses a chat bubble icon.

## Keyboard States

Required keyboard-open states:

- Tourgo: sign in, map search, create title, report details.
- Friends: create room, join code, add friend, team chat.

Implementation rules:

- The keyboard is an overlay occupying the bottom portion of the 390 x 844 screen.
- The active field or active composer must remain above the keyboard.
- Team chat must not shift the entire interface down/up. Keep header and layout stable; only the composer/input area should adapt.
- Add friend modal may lift just enough to keep the code field visible.

## Friends Special States

Create room:

- Room setup with duration/settings chips.
- Create action opens a confirm modal.

Join room:

- Six-character code input.
- Found room summary appears once code is entered.

Camera/photo:

- Camera headshot screen shows capture state.
- Photo preview has `Save & ready`.

Scanner/capture:

- Hunter scanner overlay scans runner QR.
- Capture confirm must be explicit and final.

Interruptions:

- Stalemate overlay.
- Runner relocate alert.
- Captured overlay leading to spectator mode.

Spectator:

- Stats, all chat read-only, exit decision.

End states:

- Hunters win.
- Runners escape.

## Implementation Checklist

- Keep NeoUI tokens centralized.
- Build reusable primitives: screen shell, top bar, dock, card, pill, metric, modal/sheet, loader, keyboard-safe area.
- Implement light/dark modes from the same component props/tokens.
- Use SVG icons, not text glyph placeholders.
- Verify all circular controls stay circular.
- Verify text does not overflow buttons/cards on 390 px width.
- Verify keyboard-open states do not cover active fields.
- Verify Friends phase order exactly: Ready check -> Dispersal -> Role reveal -> active game.
- Verify loading uses Rose Orbit/Spiral Search and no background card unless explicitly needed.
