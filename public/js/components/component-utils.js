export { auth, db } from "../firebase-init.js";
export { agentDebugLog } from "../lib/agent-log.js";
export { syncDockVisualViewport } from "../lib/dock-visual-viewport.js";
export { t } from "../lib/i18n.js";
export { refreshNetworkBanner } from "../lib/network-banner.js";
export {
  effectiveTheme,
  getThemePreference,
  setThemePreference,
  syncThemeFromStorage,
} from "../lib/state.js";
export { escapeHtml } from "../lib/html.js";
export { openAlertModal } from "./modal.js";
export { isGuestBrowsing, promptGuestNeedsSignIn } from "../services/auth.js";
export {
  addPhotoComment,
  aggregateVoteCounts,
  myPhotoReaction,
  setMyCommentVote,
  setMyPhotoVote,
  watchCommentVotes,
  watchPhotoComments,
  watchPhotoVotes,
} from "../services/run-social.js";
export { watchMeritPoints } from "../services/users.js";
