/**
 * Home-screen render runtime facade.
 */
export { DEFAULT_SETTINGS } from "../lib/constants.js";
export { escapeHtml, fmtAgo, fmtClock, getInitial, tsMs } from "../lib/format-utils.js";
export { getOrCreateFriendCode, loadStats } from "../lib/local-prefs.js";
export { gameNow } from "../lib/server-time.js";
export { state } from "../state.js";
