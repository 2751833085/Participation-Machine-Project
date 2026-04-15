/**
 * Profile page — edit avatar & unique display name, merits, theme, sign-out.
 */

import { auth } from "../firebase-init.js";
import { renderShell } from "../components/shell.js";
import { escapeHtml } from "../lib/utils.js";
import {
  getThemePreference,
  setThemePreference,
} from "../lib/state.js";
import { openAlertModal, openConfirmModal } from "../components/modal.js";
import { signOutUser } from "../services/auth.js";
import {
  AVATAR_PRESETS,
  avatarSrcForId,
  DuplicateUsernameError,
  normalizeUsername,
  saveUserProfile,
  watchUserProfile,
} from "../services/users.js";

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

export function render() {
  const user = auth.currentUser;
  const accountLabel = user
    ? user.email || user.phoneNumber || "Google account"
    : "Not signed in";

  renderShell(
    `
    <div class="profile-v2 profile-page">
      <header class="profile-v2-hero">
        <h1 class="h1 profile-page-title">Profile</h1>
        <p class="lead profile-page-lead">Avatar, name, merits, and how the app looks. You can use the same Google account on <strong>several phones or browsers</strong> at once.</p>
      </header>
      ${
        user
          ? `
      <section class="card profile-v2-identity" aria-labelledby="profile-identity-heading">
        <h2 id="profile-identity-heading" class="profile-v2-section-title">Identity</h2>
        <div class="profile-v2-identity-grid">
          <button type="button" class="profile-v2-avatar-btn profile-hero-btn" id="profile-avatar-open" aria-label="Change avatar" title="Change avatar">
            <span class="profile-hero-ring"></span>
          </button>
          <div class="profile-v2-identity-fields">
            <div class="form-field profile-v2-field">
              <label for="profile-display-name">Public username</label>
              <input
                id="profile-display-name"
                type="text"
                class="input-grow"
                maxlength="24"
                autocomplete="nickname"
                placeholder="Letters and numbers"
                aria-describedby="profile-name-hint"
              />
              <p class="field-hint" id="profile-name-hint">2–24 characters · saves when you leave the field</p>
            </div>
            <p class="profile-save-status" id="profile-save-status" aria-live="polite"></p>
          </div>
        </div>
      </section>
      `
          : ""
      }
      <section class="card profile-v2-merit-card" aria-labelledby="profile-merit-heading">
        <h2 id="profile-merit-heading" class="profile-v2-section-title">Merits</h2>
        <div class="profile-v2-merit-row">
          <span class="profile-v2-merit-label">Total</span>
          <span class="profile-v2-merit-value" id="merit-points">—</span>
        </div>
        <p class="profile-v2-merit-caption">From hunts you finish</p>
      </section>
      <section class="card profile-v2-panel">
        <h2 class="profile-v2-section-title">Account</h2>
        <div class="profile-value profile-v2-account">${escapeHtml(accountLabel)}</div>
      </section>
      <section class="card profile-v2-panel">
        <h2 class="profile-v2-section-title">Appearance</h2>
        <fieldset class="profile-theme-fieldset">
          <legend class="visually-hidden">Theme</legend>
          <div class="profile-theme-row">
            <label class="profile-theme-pill">
              <input type="radio" name="profile-theme" value="light" />
              <span>Light</span>
            </label>
            <label class="profile-theme-pill">
              <input type="radio" name="profile-theme" value="dark" />
              <span>Dark</span>
            </label>
            <label class="profile-theme-pill">
              <input type="radio" name="profile-theme" value="system" />
              <span>System</span>
            </label>
          </div>
        </fieldset>
      </section>
      <div class="profile-v2-actions">
        ${
          user
            ? '<button type="button" class="btn btn-ghost btn-block profile-v2-signout" id="profile-sign-out">Sign out</button>'
            : '<a href="#/login" class="btn btn-primary btn-block">Sign in with Google</a>'
        }
      </div>
    </div>
  `,
    "profile",
  );

  const pref = getThemePreference();
  document.querySelectorAll('input[name="profile-theme"]').forEach((input) => {
    if (input.value === pref) input.checked = true;
    input.addEventListener("change", () => {
      if (input.checked) setThemePreference(input.value);
    });
  });

  document
    .getElementById("profile-sign-out")
    ?.addEventListener("click", async () => {
      const ok = await openConfirmModal({
        title: "Sign out?",
        message:
          "You will need to sign in again to create hunts or play.",
        confirmText: "Sign out",
      });
      if (!ok) return;
      try {
        await signOutUser();
        /* Only changing the fragment does not reload the document; force a full reload. */
        location.hash = "#/login";
        window.location.reload();
      } catch (e) {
        alert(e.message || "Could not sign out.");
      }
    });

  if (!user) return;

  const nameInput = document.getElementById("profile-display-name");
  const heroBtn = document.getElementById("profile-avatar-open");
  const statusEl = document.getElementById("profile-save-status");

  let committedDisplayName = "";
  let committedAvatarId = "";
  let profileHydrated = false;
  let inputFocused = false;
  let statusClear = null;

  function setStatus(text, kind) {
    if (statusClear) clearTimeout(statusClear);
    statusEl.textContent = text;
    statusEl.dataset.kind = kind || "";
    if (text && kind === "ok") {
      statusClear = window.setTimeout(() => {
        statusEl.textContent = "";
        statusEl.dataset.kind = "";
      }, 2200);
    }
  }

  function openAvatarPicker() {
    if (avatarPickerBackdrop) return;
    let pendingAvatarId = committedAvatarId;

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

    function paintGridSelection() {
      grid.querySelectorAll(".profile-avatar-choice").forEach((b) => {
        const id = b.dataset.avatar ?? "";
        b.classList.toggle("is-selected", id === pendingAvatarId);
      });
    }

    grid.innerHTML = AVATAR_PRESETS.map((p) => {
      const sel = p.id === pendingAvatarId ? " is-selected" : "";
      const inner = p.file
        ? `<img src="img/avatars/${escapeHtml(p.file)}" alt="" width="56" height="56" loading="lazy" />`
        : `<span class="profile-avatar-blank" aria-hidden="true"></span>`;
      return `<button type="button" class="profile-avatar-choice${sel}" data-avatar="${escapeHtml(p.id)}" role="listitem" aria-label="${escapeHtml(p.label)}" title="${escapeHtml(p.label)}">${inner}</button>`;
    }).join("");

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

    const finish = () => {
      closeAvatarPicker();
    };

    cancelBtn.addEventListener("click", finish);

    confirmBtn.addEventListener("click", async () => {
      if (pendingAvatarId === committedAvatarId) {
        finish();
        return;
      }
      confirmBtn.disabled = true;
      cancelBtn.disabled = true;
      try {
        await saveUserProfile({
          displayName: nameInput.value,
          avatarId: pendingAvatarId,
        });
        setStatus("Saved", "ok");
        finish();
      } catch (e) {
        if (e instanceof DuplicateUsernameError || e?.code === "DUPLICATE_USERNAME") {
          nameInput.value = committedDisplayName;
          await openAlertModal({
            title: "Name taken",
            message: e.message,
            okText: "OK",
          });
        } else {
          await openAlertModal({
            title: "Could not save",
            message: e.message || "Try again.",
            okText: "OK",
          });
        }
        syncHero(committedAvatarId);
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
        paintGridSelection();
      });
    });

    document.body.appendChild(backdrop);
    cancelBtn.focus();
  }

  function syncHero(avatarId) {
    const ring = heroBtn?.querySelector(".profile-hero-ring");
    if (!ring) return;
    if (ring.dataset.shownAvatar === avatarId) return;
    ring.dataset.shownAvatar = avatarId;
    const src = avatarSrcForId(avatarId);
    ring.innerHTML = src
      ? `<img src="${escapeHtml(src)}" alt="" class="profile-hero-img" width="120" height="120" decoding="async" />`
      : `<span class="profile-hero-blank" aria-hidden="true"></span>`;
  }

  function applySnapshot(data) {
    if (!data) return;
    const nextName = data.displayName || "";
    const nextAvatar = data.avatarId || "";

    if (
      profileHydrated &&
      nextName === committedDisplayName &&
      nextAvatar === committedAvatarId
    ) {
      return;
    }
    profileHydrated = true;

    committedDisplayName = nextName;
    committedAvatarId = nextAvatar;
    if (!inputFocused) {
      nameInput.value = committedDisplayName;
    }
    syncHero(committedAvatarId);
  }

  heroBtn.addEventListener("click", () => openAvatarPicker());

  async function trySaveDisplayName() {
    const v = nameInput.value.trim();
    if (v === committedDisplayName) return;
    if (v.length === 1) {
      nameInput.value = committedDisplayName;
      await openAlertModal({
        title: "Invalid name",
        message: "Use at least 2 characters, or clear the field to remove your name.",
        okText: "OK",
      });
      return;
    }
    if (v.length > 0 && normalizeUsername(v) === null) {
      nameInput.value = committedDisplayName;
      await openAlertModal({
        title: "Invalid name",
        message:
          "Use only letters, numbers, and single spaces (2–24 characters).",
        okText: "OK",
      });
      return;
    }
    try {
      await saveUserProfile({ displayName: nameInput.value, avatarId: undefined });
      setStatus("Saved", "ok");
    } catch (e) {
      nameInput.value = committedDisplayName;
      if (e instanceof DuplicateUsernameError || e?.code === "DUPLICATE_USERNAME") {
        await openAlertModal({
          title: "Name taken",
          message: e.message,
          okText: "OK",
        });
      } else {
        await openAlertModal({
          title: "Could not save",
          message: e.message || "Try again.",
          okText: "OK",
        });
      }
    }
  }

  nameInput.addEventListener("focus", () => {
    inputFocused = true;
  });
  nameInput.addEventListener("blur", () => {
    inputFocused = false;
    if (saveDebounce) {
      clearTimeout(saveDebounce);
      saveDebounce = null;
    }
    void trySaveDisplayName();
  });
  nameInput.addEventListener("input", () => {
    if (saveDebounce) clearTimeout(saveDebounce);
    saveDebounce = window.setTimeout(() => {
      saveDebounce = null;
      void trySaveDisplayName();
    }, 600);
  });

  profileUnsub = watchUserProfile(user.uid, applySnapshot, () => {});
}

export function cleanup() {
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
