/**
 * Profile page — edit avatar & unique display name, merits, theme, sign-out.
 */

import { auth } from "../firebase-init.js";
import { renderShell } from "../components/shell.js";
import { escapeHtml } from "../lib/utils.js";
import {
  getThemePreference,
  isGuestSession,
  setThemePreference,
} from "../lib/state.js";
import {
  getUiThemeDefinition,
  getUiThemePreference,
  setUiThemePreference,
  syncUiThemeFromStorage,
  UI_THEME_MATERIAL_DESIGN,
} from "../lib/ui-theme.js";
import { openAlertModal, openConfirmModal } from "../components/modal.js";
import { signOutUser } from "../services/auth.js";
import {
  deleteUserChallenge,
  getChallenge,
  updateUserChallengeDetails,
  watchUserPublishedChallenges,
} from "../services/challenges.js";
import {
  AVATAR_PRESETS,
  avatarSrcForId,
  DuplicateUsernameError,
  MERIT_PER_WIN,
  normalizeUsername,
  saveUserProfile,
  watchUserProfile,
} from "../services/users.js";

let profileUnsub = null;
let publishedUnsub = null;
let publishedClickHandler = null;
let publishedListHost = null;
let publishedSheetKeyHandler = null;
let publishedSheetUiAbort = null;
let saveDebounce = null;
let avatarPickerBackdrop = null;

function closePublishedSheet() {
  if (publishedSheetKeyHandler) {
    document.removeEventListener("keydown", publishedSheetKeyHandler);
    publishedSheetKeyHandler = null;
  }
  const sheet = document.getElementById("profile-published-sheet");
  if (sheet) {
    sheet.hidden = true;
    sheet.setAttribute("aria-hidden", "true");
  }
  delete document.body.dataset.modalOpen;
}

function openPublishedSheet() {
  const sheet = document.getElementById("profile-published-sheet");
  if (!sheet || !sheet.hidden) return;
  sheet.hidden = false;
  sheet.setAttribute("aria-hidden", "false");
  document.body.dataset.modalOpen = "true";
  publishedSheetKeyHandler = (e) => {
    if (e.key === "Escape") closePublishedSheet();
  };
  document.addEventListener("keydown", publishedSheetKeyHandler);
  document.getElementById("profile-published-sheet-close")?.focus();
}

function closeAvatarPicker() {
  if (!avatarPickerBackdrop) return;
  const onKey = avatarPickerBackdrop._onKey;
  if (onKey) document.removeEventListener("keydown", onKey);
  avatarPickerBackdrop.remove();
  avatarPickerBackdrop = null;
}

function clearPublishedListBindings() {
  if (publishedListHost && publishedClickHandler) {
    publishedListHost.removeEventListener("click", publishedClickHandler);
  }
  publishedClickHandler = null;
  publishedListHost = null;
  if (publishedUnsub) {
    publishedUnsub();
    publishedUnsub = null;
  }
}

function formatPublishedDate(ts) {
  if (!ts || typeof ts.toDate !== "function") return "";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      ts.toDate(),
    );
  } catch {
    return "";
  }
}

function paintPublishedHuntList(el, docs) {
  if (!el) return;
  if (!docs.length) {
    el.innerHTML =
      '<p class="card-meta profile-published-empty">You have not published any hunts yet. Tap <strong>Create</strong> below to add one.</p>';
    return;
  }
  el.innerHTML = `<ul class="profile-published-stack">${docs
    .map((d) => {
      const c = d.data();
      const id = escapeHtml(d.id);
      const title = escapeHtml(c.title || "Untitled hunt");
      const area = escapeHtml(c.areaLabel || "—");
      const n = c.spots?.length ?? 0;
      const mins = c.timeLimitMinutes ?? "?";
      const when = formatPublishedDate(c.createdAt);
      const metaBits = [
        `${n} checkpoint${n === 1 ? "" : "s"} · ${mins} min`,
        when ? `Published ${when}` : "",
      ].filter(Boolean);
      return `<li class="profile-published-row">
        <p class="profile-published-row-title">${title}</p>
        <p class="profile-published-row-meta">${area}</p>
        <p class="profile-published-row-meta">${escapeHtml(metaBits.join(" · "))}</p>
        <div class="profile-published-actions">
          <a class="btn btn-secondary btn-small" href="#/challenge/${id}">View</a>
          <button type="button" class="btn btn-secondary btn-small" data-published-action="edit" data-challenge-id="${id}">Edit details</button>
          <button type="button" class="btn btn-small profile-published-delete" data-published-action="delete" data-challenge-id="${id}">Delete</button>
        </div>
      </li>`;
    })
    .join("")}</ul>`;
}

/**
 * @param {{ id: string, title?: string, areaLabel?: string, timeLimitMinutes?: number, huntHint?: string }} c
 */
function openEditHuntDetailsModal(c) {
  return new Promise((resolve) => {
    document.body.dataset.modalOpen = "true";
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.setAttribute("role", "presentation");

    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "edit-hunt-dlg-title");

    const h = document.createElement("h2");
    h.className = "modal-dialog-title";
    h.id = "edit-hunt-dlg-title";
    h.textContent = "Edit hunt";

    const lead = document.createElement("p");
    lead.className = "modal-dialog-text";
    lead.textContent =
      "Checkpoint photos and map positions stay the same. You can change the listing text and time limit.";

    const form = document.createElement("div");
    form.className = "profile-edit-hunt-form";

    const titleWrap = document.createElement("div");
    titleWrap.className = "form-field";
    const titleLab = document.createElement("label");
    titleLab.htmlFor = "edit-hunt-title";
    titleLab.textContent = "Title";
    const titleIn = document.createElement("input");
    titleIn.id = "edit-hunt-title";
    titleIn.type = "text";
    titleIn.className = "input-grow";
    titleIn.maxLength = 120;
    titleIn.value = c.title || "";

    const areaWrap = document.createElement("div");
    areaWrap.className = "form-field";
    const areaLab = document.createElement("label");
    areaLab.htmlFor = "edit-hunt-area";
    areaLab.textContent = "Area / neighborhood";
    const areaIn = document.createElement("input");
    areaIn.id = "edit-hunt-area";
    areaIn.type = "text";
    areaIn.className = "input-grow";
    areaIn.maxLength = 120;
    areaIn.value = c.areaLabel || "";

    const minWrap = document.createElement("div");
    minWrap.className = "form-field";
    const minLab = document.createElement("label");
    minLab.htmlFor = "edit-hunt-mins";
    minLab.textContent = "Time limit (minutes)";
    const minIn = document.createElement("input");
    minIn.id = "edit-hunt-mins";
    minIn.type = "number";
    minIn.className = "input-grow";
    minIn.min = "1";
    minIn.max = "1440";
    minIn.step = "1";
    minIn.value = String(
      Number.isFinite(c.timeLimitMinutes) ? c.timeLimitMinutes : 30,
    );

    const hintWrap = document.createElement("div");
    hintWrap.className = "form-field";
    const hintLab = document.createElement("label");
    hintLab.htmlFor = "edit-hunt-hint";
    hintLab.textContent = "Hunt hint (optional)";
    const hintTa = document.createElement("textarea");
    hintTa.id = "edit-hunt-hint";
    hintTa.className = "input-grow";
    hintTa.rows = 3;
    hintTa.maxLength = 800;
    hintTa.value =
      typeof c.huntHint === "string" ? c.huntHint : "";

    const errEl = document.createElement("p");
    errEl.className = "profile-edit-hunt-err";
    errEl.setAttribute("aria-live", "polite");
    errEl.hidden = true;

    titleWrap.append(titleLab, titleIn);
    areaWrap.append(areaLab, areaIn);
    minWrap.append(minLab, minIn);
    hintWrap.append(hintLab, hintTa);
    form.append(titleWrap, areaWrap, minWrap, hintWrap, errEl);

    const actions = document.createElement("div");
    actions.className = "modal-dialog-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-ghost";
    cancelBtn.textContent = "Cancel";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn btn-primary";
    saveBtn.textContent = "Save";

    actions.append(cancelBtn, saveBtn);
    dialog.append(h, lead, form, actions);
    backdrop.appendChild(dialog);

    const finish = (saved) => {
      backdrop.remove();
      delete document.body.dataset.modalOpen;
      document.removeEventListener("keydown", onKey);
      resolve(saved);
    };

    const onKey = (e) => {
      if (e.key === "Escape") finish(false);
    };
    document.addEventListener("keydown", onKey);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) finish(false);
    });
    dialog.addEventListener("click", (e) => e.stopPropagation());

    cancelBtn.addEventListener("click", () => finish(false));

    saveBtn.addEventListener("click", async () => {
      errEl.hidden = true;
      errEl.textContent = "";
      saveBtn.disabled = true;
      cancelBtn.disabled = true;
      try {
        await updateUserChallengeDetails(c.id, {
          title: titleIn.value,
          areaLabel: areaIn.value,
          timeLimitMinutes: parseInt(minIn.value, 10),
          huntHint: hintTa.value,
        });
        finish(true);
      } catch (e) {
        errEl.textContent = e?.message || "Could not save.";
        errEl.hidden = false;
      } finally {
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
      }
    });

    document.body.appendChild(backdrop);
    titleIn.focus();
  });
}

export function render() {
  const user = auth.currentUser;
  const guestBrowseOnly = !user && isGuestSession();
  const accountLabel = user
    ? user.email || user.phoneNumber || "Google account"
    : guestBrowseOnly
      ? "Guest browse"
      : "Not signed in";

  renderShell(
    `
    <div class="profile-v2 profile-page">
      <section class="hero profile-v2-hero" aria-labelledby="profile-heading">
        <p class="hero-eyebrow">Profile</p>
        <h1 class="hero-title" id="profile-heading">Your account</h1>
        <p class="lead hero-lead">Avatar, name, merits, and app appearance.</p>
      </section>
      ${
        guestBrowseOnly
          ? `
      <section class="card profile-v2-panel" aria-live="polite">
        <div class="status-banner info">
          Guest mode is browse-only. Sign in with Google to set your avatar and public name, publish hunts, join runs, and use comments or reactions.
        </div>
        <p class="card-meta" style="margin-top:0.75rem;">
          <a href="#/login" class="btn btn-primary btn-block">Sign in with Google</a>
        </p>
      </section>
      `
          : ""
      }
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
      <section
        class="card profile-v2-panel profile-v2-published-gate"
        aria-labelledby="profile-published-gate-heading"
      >
        <h2 id="profile-published-gate-heading" class="profile-v2-section-title">
          Your published hunts
        </h2>
        <p class="profile-v2-merit-caption profile-v2-published-gate-lead">
          View, edit listing text and time limits, or delete hunts you published. Checkpoint photos and map pins are not changed there.
        </p>
        <button type="button" class="btn btn-secondary btn-block" id="profile-published-open">
          View published hunts
        </button>
      </section>
      <div
        id="profile-published-sheet"
        class="profile-published-sheet"
        hidden
        aria-hidden="true"
      >
        <div class="profile-published-sheet__backdrop" aria-hidden="true"></div>
        <div
          class="profile-published-sheet__panel card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-published-sheet-title"
        >
          <div class="profile-published-sheet__head">
            <h2 id="profile-published-sheet-title" class="profile-published-sheet__title">
              Your published hunts
            </h2>
            <button
              type="button"
              class="btn btn-primary btn-small profile-published-sheet__close"
              id="profile-published-sheet-close"
            >
              Close
            </button>
          </div>
          <p class="profile-published-sheet__lead profile-v2-merit-caption">
            Edit listing text and time limits, or delete a hunt you created. Checkpoint photos and map pins are not changed here.
          </p>
          <div class="profile-published-sheet__body">
            <div
              id="profile-published-list"
              class="profile-published-list"
              aria-live="polite"
            >
              <p class="card-meta">Loading…</p>
            </div>
          </div>
        </div>
      </div>
      `
          : ""
      }
      <section class="card profile-v2-merit-card" aria-labelledby="profile-merit-heading">
        <h2 id="profile-merit-heading" class="profile-v2-section-title">Merits</h2>
        <div class="profile-v2-merit-row">
          <span class="profile-v2-merit-label">Total</span>
          <span class="profile-v2-merit-value" id="merit-points" data-merit-points>—</span>
        </div>
        <p class="profile-v2-merit-caption">Lifetime points on your Tourgo account</p>
        <details class="profile-v2-merit-how" role="region" aria-labelledby="profile-merit-how-heading">
          <summary class="profile-v2-merit-how-summary">How you earn merits</summary>
          <h3 id="profile-merit-how-heading" class="profile-v2-merit-how-title">How you earn Merits</h3>
          <p class="profile-v2-merit-lead">
            Each time you <strong>win a timed run</strong> (every checkpoint submitted before the countdown ends), Tourgo adds
            <strong>+${MERIT_PER_WIN} Merits</strong> as soon as the winning photo upload completes.
          </p>
          <ol class="profile-v2-merit-steps">
            <li><strong>Sign in with Google</strong> so points save to this profile.</li>
            <li>From Home or a hunt page, <strong>start the run</strong> and keep it <strong>active</strong> until you finish.</li>
            <li>
              For <strong>each checkpoint</strong>, take or choose a photo that passes the hunt&rsquo;s checks while time remains
              (including location proof when that hunt requires it). You cannot submit after time is up.
            </li>
            <li>
              When the <strong>last</strong> required checkpoint is accepted, the run is marked <strong>won</strong> and
              <strong>+${MERIT_PER_WIN}</strong> is added to your total here.
            </li>
            <li>
              <strong>Same hunt, new run:</strong> every separate winning run earns <strong>+${MERIT_PER_WIN}</strong> again.
              There is no daily cap in the app.
            </li>
          </ol>
          ${
            guestBrowseOnly || !user
              ? `<p class="profile-v2-merit-foot">Guest or signed-out browsing does not earn Merits&mdash;sign in with Google before you finish a run.</p>`
              : ""
          }
        </details>
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
        <p class="profile-theme-caption">Color mode</p>
        <fieldset class="profile-theme-fieldset profile-ui-theme-fieldset">
          <legend class="visually-hidden">UI Theme</legend>
          <div class="profile-theme-row">
            <label class="profile-theme-pill profile-ui-theme-pill">
              <input type="radio" name="profile-ui-theme" value="classical" />
              <span>Classical</span>
            </label>
            <label class="profile-theme-pill profile-ui-theme-pill">
              <input type="radio" name="profile-ui-theme" value="material-design" />
              <span>Material Design <em class="profile-theme-beta-badge">Beta</em></span>
            </label>
          </div>
        </fieldset>
        <p class="profile-theme-caption profile-theme-caption-beta">Switching to Beta may be unstable.</p>
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

  const uiThemePref = getUiThemePreference();
  document
    .querySelectorAll('input[name="profile-ui-theme"]')
    .forEach((input) => {
      if (input.value === uiThemePref) input.checked = true;
      input.addEventListener("change", async () => {
        if (!input.checked) return;
        const nextThemeId = input.value;
        const prevThemeId = getUiThemePreference();
        if (nextThemeId === prevThemeId) return;
        const nextTheme = getUiThemeDefinition(nextThemeId);
        if (!nextTheme) return;
        if (nextTheme.id === UI_THEME_MATERIAL_DESIGN && nextTheme.beta) {
          const ok = await openConfirmModal({
            title: "Enable Material Design Beta?",
            message:
              "Material Design Beta may be unstable and visual details can change while we improve it. Continue?",
            confirmText: "Enable Beta",
            cancelText: "Keep Classical",
          });
          if (!ok) {
            const fallback = document.querySelector(
              `input[name="profile-ui-theme"][value="${prevThemeId}"]`,
            );
            if (fallback) fallback.checked = true;
            return;
          }
        }
        setUiThemePreference(nextThemeId);
        syncUiThemeFromStorage();
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

  clearPublishedListBindings();

  /* Keep fixed layer under viewport clipping (main / transforms); true edge-to-edge. */
  const publishedSheetRoot = document.getElementById("profile-published-sheet");
  if (publishedSheetRoot) {
    document.body.appendChild(publishedSheetRoot);
  }

  publishedSheetUiAbort?.abort();
  publishedSheetUiAbort = new AbortController();
  const sheetUiSignal = publishedSheetUiAbort.signal;
  document
    .getElementById("profile-published-open")
    ?.addEventListener("click", openPublishedSheet, { signal: sheetUiSignal });
  document
    .getElementById("profile-published-sheet-close")
    ?.addEventListener("click", closePublishedSheet, { signal: sheetUiSignal });

  publishedListHost = document.getElementById("profile-published-list");
  if (publishedListHost) {
    publishedClickHandler = async (e) => {
      const t = e.target.closest("[data-published-action]");
      if (!t) return;
      const action = t.dataset.publishedAction;
      const id = t.dataset.challengeId;
      if (!id || !action) return;

      if (action === "edit") {
        const fresh = await getChallenge(id);
        if (!fresh) {
          await openAlertModal({
            title: "Not found",
            message: "This hunt may have been deleted.",
            okText: "OK",
          });
          return;
        }
        await openEditHuntDetailsModal(fresh);
        return;
      }

      if (action === "delete") {
        const ok = await openConfirmModal({
          title: "Delete this hunt?",
          message:
            "This permanently removes the hunt from Tourgo. Stored checkpoint photos for it will be deleted. Shared links will stop working.",
          confirmText: "Delete",
          cancelText: "Cancel",
        });
        if (!ok) return;
        try {
          await deleteUserChallenge(id);
        } catch (err) {
          await openAlertModal({
            title: "Could not delete",
            message: err?.message || "Try again.",
            okText: "OK",
          });
        }
      }
    };
    publishedListHost.addEventListener("click", publishedClickHandler);

    publishedUnsub = watchUserPublishedChallenges(
      user.uid,
      (snap) => paintPublishedHuntList(publishedListHost, snap.docs),
      (err) => {
        console.warn("watchUserPublishedChallenges", err);
        if (publishedListHost) {
          publishedListHost.innerHTML = `<div class="status-banner error">${escapeHtml(err.message || "Could not load your hunts. If this is new, wait a minute for the database index to finish building, then refresh.")}</div>`;
        }
      },
    );
  }

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

    grid.innerHTML = AVATAR_PRESETS.map((p, idx) => {
      const sel = p.id === pendingAvatarId ? " is-selected" : "";
      const inner = p.file
        ? `<img src="img/avatars/${escapeHtml(p.file)}" alt="" width="56" height="56" loading="eager" decoding="async" fetchpriority="low" />`
        : `<span class="profile-avatar-blank" aria-hidden="true"></span>`;
      return `<button type="button" class="profile-avatar-choice${sel}" data-avatar="${escapeHtml(p.id)}" role="listitem" aria-label="${escapeHtml(p.label)}" title="${escapeHtml(p.label)}" style="--av-stagger: ${idx}">${inner}</button>`;
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
  closePublishedSheet();
  publishedSheetUiAbort?.abort();
  publishedSheetUiAbort = null;
  closeAvatarPicker();
  clearPublishedListBindings();
  if (saveDebounce) {
    clearTimeout(saveDebounce);
    saveDebounce = null;
  }
  if (profileUnsub) {
    profileUnsub();
    profileUnsub = null;
  }
}
