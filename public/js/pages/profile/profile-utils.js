export { escapeHtml } from "../../lib/html.js";
export { agentDebugLog } from "../../lib/agent-log.js";
export { openAlertModal, openConfirmModal } from "../../components/modal.js";
export { applyImageLoadMotion } from "../../components/shell.js";
export {
  deleteUserChallenge,
  getChallenge,
  updateUserChallengeDetails,
  watchUserPublishedChallenges,
} from "../../services/challenges.js";
export {
  AVATAR_PRESETS,
  DuplicateUsernameError,
  avatarSrcForId,
  normalizeUsername,
  saveUserProfile,
  watchUserProfile,
} from "../../services/users.js";
