/**
 * Profile hero: avatar picker, display name input, Firestore profile watch.
 */
import { applyImageLoadMotion, escapeHtml, openAlertModal, AVATAR_PRESETS, avatarSrcForId, DuplicateUsernameError, normalizeUsername, saveUserProfile, watchUserProfile, agentDebugLog } from "./profile-utils.js";

let profileUnsub = null;
let saveDebounce = null;
let avatarPickerBackdrop = null;

function closeAvatarPicker() {
  if (!avatarPickerBackdrop) return;
  const onKey = avatarPickerBackdrop._onKey;
  if (onKey) document.removeEventListener("keydown", onKey);
  avatarPickerBackdrop.remove();
  avatarPickerBackdrop = null;
}

function createIdentityCtx() {
  return {
    nameInput: document.getElementById("profile-display-name"),
    heroBtn: document.getElementById("profile-avatar-open"),
    heroNameEl: document.querySelector("[data-profile-display-name]"),
    statusEl: document.getElementById("profile-save-status"),
    state: {
      committedAvatarId: "",
      committedDisplayName: "",
      inputFocused: false,
      profileHydrated: false,
      statusClear: null,
    },
  };
}

function setStatus(ctx, text, kind) {
  const { state, statusEl } = ctx;
  if (state.statusClear) clearTimeout(state.statusClear);
  statusEl.textContent = text;
  statusEl.dataset.kind = kind || "";
  if (text && kind === "ok") {
    state.statusClear = window.setTimeout(() => {
      statusEl.textContent = "";
      statusEl.dataset.kind = "";
    }, 2200);
  }
}

function avatarChoiceHtml(pendingAvatarId) {
  return AVATAR_PRESETS.map((p, idx) => {
    const sel = p.id === pendingAvatarId ? " is-selected" : "";
    const inner = p.file
      ? `<img src="../img/avatars/${escapeHtml(p.file)}" alt="" width="56" height="56" loading="eager" decoding="async" fetchpriority="low" />`
      : `<span class="profile-avatar-blank" aria-hidden="true"></span>`;
    return `<button type="button" class="profile-avatar-choice${sel}" data-avatar="${escapeHtml(p.id)}" role="listitem" aria-label="${escapeHtml(p.label)}" title="${escapeHtml(p.label)}" style="--av-stagger: ${idx}">${inner}</button>`;
  }).join("");
}

function paintGridSelection(grid, pendingAvatarId) {
  grid.querySelectorAll(".profile-avatar-choice").forEach((b) => {
    const id = b.dataset.avatar ?? "";
    b.classList.toggle("is-selected", id === pendingAvatarId);
  });
}

function avatarDialogElements(pendingAvatarId) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.setAttribute("role", "presentation");
  avatarPickerBackdrop = backdrop;

  const dialog = document.createElement("div");
  dialog.className = "modal-dialog profile-avatar-modal";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "profile-avatar-modal-title");

  const h = document.createElement("h2");
  h.className = "modal-dialog-title";
  h.id = "profile-avatar-modal-title";
  h.textContent = "Choose avatar";

  const grid = document.createElement("div");
  grid.className = "profile-avatar-grid profile-avatar-grid--modal";
  grid.setAttribute("role", "list");
  grid.innerHTML = avatarChoiceHtml(pendingAvatarId);

  const actions = document.createElement("div");
  actions.className = "modal-dialog-actions";
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn btn-ghost";
  cancelBtn.textContent = "Cancel";
  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.className = "btn btn-primary";
  confirmBtn.textContent = "Confirm";

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  dialog.appendChild(h);
  dialog.appendChild(grid);
  dialog.appendChild(actions);
  backdrop.appendChild(dialog);

  return { backdrop, cancelBtn, confirmBtn, grid };
}

async function showProfileSaveError(ctx, e) {
  ctx.nameInput.value = ctx.state.committedDisplayName;
  if (e instanceof DuplicateUsernameError || e?.code === "DUPLICATE_USERNAME") {
    await openAlertModal({
      title: "Name taken",
      message: e.message,
      okText: "OK",
    });
    return;
  }
  await openAlertModal({
    title: "Could not save",
    message: e.message || "Try again.",
    okText: "OK",
  });
}

function openAvatarPicker(ctx) {
  if (avatarPickerBackdrop) return;
  let pendingAvatarId = ctx.state.committedAvatarId;
  const { backdrop, cancelBtn, confirmBtn, grid } = avatarDialogElements(pendingAvatarId);
  const finish = () => closeAvatarPicker();

  cancelBtn.addEventListener("click", finish);
  confirmBtn.addEventListener("click", async () => {
    if (pendingAvatarId === ctx.state.committedAvatarId) {
      finish();
      return;
    }
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    try {
      const chosenAvatarId = pendingAvatarId;
      await saveUserProfile({
        displayName: ctx.nameInput.value,
        avatarId: chosenAvatarId,
      });
      setStatus(ctx, "Saved", "ok");
      finish();
      requestAnimationFrame(() => {
        syncHero(ctx, chosenAvatarId, { forceReplay: true });
      });
    } catch (e) {
      await showProfileSaveError(ctx, e);
      syncHero(ctx, ctx.state.committedAvatarId);
    } finally {
      if (avatarPickerBackdrop) {
        confirmBtn.disabled = false;
        cancelBtn.disabled = false;
      }
    }
  });

  grid.querySelectorAll(".profile-avatar-choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      pendingAvatarId = btn.dataset.avatar ?? "";
      paintGridSelection(grid, pendingAvatarId);
    });
  });

  document.body.appendChild(backdrop);
  cancelBtn.focus();
}

function replayHeroEnterAnim(ctx, reason = "external") {
  const ring = ctx.heroBtn?.querySelector(".profile-hero-ring");
  if (!ring) return;
  ring.classList.remove("is-avatar-entering");
  // eslint-disable-next-line no-unused-expressions
  ring.offsetWidth;
  requestAnimationFrame(() => {
    ring.classList.add("is-avatar-entering");
    // #region agent log
    agentDebugLog("runA", "H30", "public/js/pages/profile/identity.js:replayHeroEnterAnim", "profile-hero-replay", {
      reason,
      ringClass: ring.className,
    });
    // #endregion
  });
}

function logHeroImageState(event, avatarId, img) {
  // #region agent log
  agentDebugLog("run5", "H12", "public/js/pages/profile/identity.js:syncHero", event, {
    hasImage: Boolean(img),
    avatarId,
    className: img?.className || "",
    complete: img?.complete ?? null,
    naturalWidth: img?.naturalWidth ?? null,
    src: img?.getAttribute("src") || "",
  });
  // #endregion
}

function syncHero(ctx, avatarId, opts = {}) {
  const ring = ctx.heroBtn?.querySelector(".profile-hero-ring");
  if (!ring) return;
  const same = ring.dataset.shownAvatar === avatarId;
  if (same && !opts.forceReplay) return;
  ring.dataset.shownAvatar = avatarId;
  const src = avatarSrcForId(avatarId);
  if (!same) {
    ring.innerHTML = src
      ? `<img src="${escapeHtml(src)}" alt="" class="profile-hero-img" width="120" height="120" decoding="async" />`
      : `<span class="profile-hero-blank" aria-hidden="true"></span>`;
  }
  replayHeroEnterAnim(ctx, same ? "force" : "avatar-change");
  const img = ring.querySelector("img.profile-hero-img");
  logHeroImageState("profile-hero-sync", avatarId, img);
  if (!img) return;
  applyImageLoadMotion(ring);
  // #region agent log
  agentDebugLog("run11", "H28", "public/js/pages/profile/identity.js:syncHero", "profile-hero-motion-applied", {
    className: img.className,
    complete: img.complete,
    naturalWidth: img.naturalWidth || 0,
  });
  // #endregion
  requestAnimationFrame(() => {
    // #region agent log
    agentDebugLog("run5", "H14", "public/js/pages/profile/identity.js:syncHero", "profile-hero-next-frame", {
      className: img.className,
      complete: img.complete,
      naturalWidth: img.naturalWidth || 0,
    });
    // #endregion
  });
}

function applySnapshot(ctx, data) {
  if (!data) return;
  const nextName = data.displayName || "";
  const nextAvatar = data.avatarId || "";
  const nextMerit = Number(data.meritPoints ?? 0);
  const { state } = ctx;

  if (isSnapshotAlreadyApplied(state, nextName, nextAvatar)) {
    paintMeritPoints(nextMerit);
    return;
  }
  state.profileHydrated = true;
  state.committedDisplayName = nextName;
  state.committedAvatarId = nextAvatar;
  paintSnapshotIdentity(ctx, nextMerit);
  syncHero(ctx, state.committedAvatarId);
}

function isSnapshotAlreadyApplied(state, nextName, nextAvatar) {
  return state.profileHydrated &&
    nextName === state.committedDisplayName &&
    nextAvatar === state.committedAvatarId;
}

function paintSnapshotIdentity(ctx, nextMerit) {
  const { state } = ctx;
  if (!state.inputFocused) {
    ctx.nameInput.value = state.committedDisplayName;
  }
  if (ctx.heroNameEl) {
    ctx.heroNameEl.textContent = state.committedDisplayName || "Your account";
  }
  paintMeritPoints(nextMerit);
}

function paintMeritPoints(nextMerit) {
  const mEl = document.getElementById("merit-points");
  if (mEl) mEl.textContent = nextMerit.toLocaleString();
}

async function validateDisplayName(ctx, value) {
  if (value.length === 1) {
    ctx.nameInput.value = ctx.state.committedDisplayName;
    await openAlertModal({
      title: "Invalid name",
      message: "Use at least 2 characters, or clear the field to remove your name.",
      okText: "OK",
    });
    return false;
  }
  if (value.length > 0 && normalizeUsername(value) === null) {
    ctx.nameInput.value = ctx.state.committedDisplayName;
    await openAlertModal({
      title: "Invalid name",
      message:
        "Use only letters, numbers, and single spaces (2–24 characters).",
      okText: "OK",
    });
    return false;
  }
  return true;
}

async function trySaveDisplayName(ctx) {
  const v = ctx.nameInput.value.trim();
  if (v === ctx.state.committedDisplayName) return;
  if (!(await validateDisplayName(ctx, v))) return;
  try {
    await saveUserProfile({ displayName: ctx.nameInput.value, avatarId: undefined });
    setStatus(ctx, "Saved", "ok");
  } catch (e) {
    await showProfileSaveError(ctx, e);
  }
}

/**
 * Wire hero avatar, inline name editor, and live profile snapshot for a signed-in user.
 */
export function initProfileIdentity(user) {
  const ctx = createIdentityCtx();
  const { heroBtn, nameInput, state } = ctx;

  heroBtn.addEventListener("click", () => openAvatarPicker(ctx));
  nameInput.addEventListener("focus", () => {
    state.inputFocused = true;
  });
  nameInput.addEventListener("blur", () => {
    state.inputFocused = false;
    if (saveDebounce) {
      clearTimeout(saveDebounce);
      saveDebounce = null;
    }
    void trySaveDisplayName(ctx);
  });
  nameInput.addEventListener("input", () => {
    if (saveDebounce) clearTimeout(saveDebounce);
    saveDebounce = window.setTimeout(() => {
      saveDebounce = null;
      void trySaveDisplayName(ctx);
    }, 600);
  });

  profileUnsub = watchUserProfile(user.uid, (data) => applySnapshot(ctx, data), () => {});
}

export function cleanupProfileIdentity() {
  closeAvatarPicker();
  if (saveDebounce) {
    clearTimeout(saveDebounce);
    saveDebounce = null;
  }
  if (profileUnsub) {
    profileUnsub();
    profileUnsub = null;
  }
}
