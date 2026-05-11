/**
 * English-only string table. The language system has been removed — this module
 * is a compatibility shim so existing `t(key)` call sites keep resolving while
 * pages are being rewritten. Once every caller is replaced with a literal string
 * this file can be deleted.
 */

const STRINGS = {
  "shell.guest": "Guest",
  "shell.toggleTheme": "Toggle theme",
  "shell.nav.hunts": "Hunts",
  "shell.nav.saved": "Saved",
  "shell.nav.create": "Create",
  "shell.nav.rank": "Rank",
  "shell.nav.profile": "Profile",
  "shell.offlineReconnect": "Reconnect",
  "shell.offlineText":
    "Unable to connect to the internet. When your connection is back, tap Reconnect to reload this page.",
  "shell.portraitTitle": "Turn to portrait",
  "shell.portraitBody":
    "This experience is built for narrow phone screens in portrait. Use a mobile device or rotate your display to continue.",
  "create.searchPlaceholder": "Place name, or leave blank + Search",
  "create.searchAria": "Search Manhattan address",
  "create.searchButton": "Search",
  "create.useMyLocation": "Use my location",
  "create.hintPlaceholder": "Street or landmark clue",
  "create.huntHintPlaceholder": "Optional clue for the entire hunt",
  "create.basicHintPlaceholder": "Landmark or street clue",
  "home.heroLead":
    "Timed photo hunts on Manhattan streets — open a listing to preview checkpoints, then start the clock. Tap + below to publish your own.",
  "home.openHunts": "Open hunts",
};

export function t(key) {
  return STRINGS[key] ?? key;
}
