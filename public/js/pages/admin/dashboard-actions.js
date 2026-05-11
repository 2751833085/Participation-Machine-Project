import { nav, signOutUser, adminPortalRequest } from "./admin-utils.js";
import { setPortalErr } from "./frame.js";
import { renderHuntSocialPhotos } from "./social.js";

export function bindAdminLogout() {
  document.getElementById("admin-logout")?.addEventListener("click", async () => {
    try {
      await signOutUser();
    } finally {
      nav("#/login");
    }
  });
}

export function bindSocialControls(elements) {
  document.getElementById("admin-load-social")?.addEventListener("click", () => {
    void loadSocialForSelected(elements);
  });
}

export function bindSocialModerationActions(elements) {
  document.getElementById("admin-main")?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (await maybeDeletePhoto(target, elements)) return;
    if (await maybeDeleteComment(target, elements)) return;
    await maybePostReply(target, elements);
  });
}

async function maybeDeletePhoto(target, elements) {
  if (!target.matches("[data-admin-del-photo]")) return false;
  const photoId = target.getAttribute("data-photo-id");
  if (!photoId || !confirm(`Delete photo ${photoId} and all its comments?`)) {
    return true;
  }
  await runPortalAction(
    () => adminPortalRequest("deleteRunPhoto", { photoId }),
    "Delete failed.",
  );
  await loadSocialForSelected(elements);
  return true;
}

async function maybeDeleteComment(target, elements) {
  if (!target.matches("[data-admin-del-comment]")) return false;
  const photoId = target.getAttribute("data-photo-id");
  const commentId = target.getAttribute("data-comment-id");
  if (!photoId || !commentId || !confirm("Delete this comment?")) {
    return true;
  }
  await runPortalAction(
    () => adminPortalRequest("deleteComment", { photoId, commentId }),
    "Delete failed.",
  );
  await loadSocialForSelected(elements);
  return true;
}

async function maybePostReply(target, elements) {
  if (!target.matches("[data-admin-post-reply]")) return false;
  const reply = readReplyBox(target);
  if (!reply.photoId || reply.text.length < 1) {
    setPortalErr("Enter comment text.");
    return true;
  }
  await runPortalAction(
    () =>
      adminPortalRequest("postAdminComment", {
        photoId: reply.photoId,
        text: reply.text,
        ...(reply.parentCommentId ? { parentCommentId: reply.parentCommentId } : {}),
      }),
    "Post failed.",
  );
  clearReplyBox(reply.textarea);
  await loadSocialForSelected(elements);
  return true;
}

function readReplyBox(target) {
  const box = target.closest(".admin-staff-reply-box");
  if (!(box instanceof HTMLElement)) {
    return { photoId: "", parentCommentId: "", text: "", textarea: null };
  }
  const textarea = box.querySelector(".admin-staff-reply-text");
  const text = textarea && "value" in textarea ? String(textarea.value).trim() : "";
  return {
    photoId: box.dataset.photoId || "",
    parentCommentId: box.dataset.parent || "",
    text,
    textarea,
  };
}

function clearReplyBox(textarea) {
  if (textarea && "value" in textarea) {
    textarea.value = "";
  }
}

async function loadSocialForSelected({ huntSelect, socialRoot }) {
  const challengeId = huntSelect?.value || "";
  setPortalErr("");
  if (!challengeId) {
    setPortalErr("Choose a hunt first.");
    return;
  }
  showSocialLoading(socialRoot);
  try {
    const data = await adminPortalRequest("listRunPhotosForChallenge", {
      challengeId,
    });
    renderHuntSocialPhotos(data?.photos || []);
  } catch (error) {
    setPortalErr(socialLoadMessage(error));
    if (socialRoot) socialRoot.innerHTML = "";
  }
}

function showSocialLoading(root) {
  if (root) {
    root.innerHTML = '<p class="admin-muted">Loading…</p>';
  }
}

function socialLoadMessage(error) {
  const code = String(error?.code || "");
  if (code.includes("permission-denied")) {
    return "Unauthorized — set Functions secret ADMIN_DASHBOARD_PASSWORD to match this admin password, deploy functions, then sign in again.";
  }
  if (code.includes("not-found")) {
    return "adminPortal function not found. Deploy: firebase deploy --only functions";
  }
  return error?.message || "Could not load photos.";
}

export function bindUserActions({ tbUsers }) {
  tbUsers?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (handleDeleteUserClick(target)) return;
    handleSetMeritsClick(target);
  });
}

function handleDeleteUserClick(target) {
  if (!target.matches("[data-admin-user-del]")) return false;
  const uid = target.getAttribute("data-uid");
  if (uid) void deleteUser(uid);
  return true;
}

function handleSetMeritsClick(target) {
  if (!target.matches("[data-admin-merit-set]")) return false;
  const uid = target.getAttribute("data-uid");
  if (!uid) return true;
  const input = target
    .closest(".admin-action-stack")
    ?.querySelector("[data-admin-merit-input]");
  const raw = input && "value" in input ? input.value : "0";
  void setMerits(uid, raw);
  return true;
}

async function deleteUser(uid) {
  if (!confirm(`PERMANENTLY delete user ${uid} (Auth + Firestore + attempts + photos)?`)) {
    return;
  }
  await runPortalAction(() => adminPortalRequest("deleteUser", { uid }), "deleteUser failed.");
  setPortalErr("");
}

async function setMerits(uid, raw) {
  const meritPoints = Number(raw);
  if (!Number.isFinite(meritPoints) || meritPoints < 0) {
    setPortalErr("Merits must be a non-negative number.");
    return;
  }
  await runPortalAction(
    () => adminPortalRequest("setUserMeritPoints", { uid, meritPoints }),
    "setUserMeritPoints failed.",
  );
}

export function bindChallengeActions({ tbChallenges }) {
  tbChallenges?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.matches("[data-admin-ch-del]")) return;
    const challengeId = target.getAttribute("data-cid");
    if (challengeId) void deleteChallenge(challengeId);
  });
}

async function deleteChallenge(challengeId) {
  if (
    !confirm(
      `PERMANENTLY delete hunt ${challengeId} and all attempts, photos, and Storage files?`,
    )
  ) {
    return;
  }
  await runPortalAction(
    () => adminPortalRequest("deleteChallenge", { challengeId }),
    "deleteChallenge failed.",
  );
}

export function bindAttemptActions({ tbAttempts }) {
  tbAttempts?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.matches("[data-admin-at-del]")) return;
    const attemptId = target.getAttribute("data-aid");
    if (attemptId) void deleteAttempt(attemptId);
  });
}

async function deleteAttempt(attemptId) {
  if (!confirm(`Delete attempt ${attemptId} and its run photos?`)) return;
  await runPortalAction(
    () => adminPortalRequest("deleteAttempt", { attemptId }),
    "deleteAttempt failed.",
  );
}

async function runPortalAction(action, fallbackMessage) {
  setPortalErr("");
  try {
    await action();
    return true;
  } catch (error) {
    setPortalErr(error?.message || fallbackMessage);
    return false;
  }
}
