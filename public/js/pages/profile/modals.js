import { agentDebugLog, DuplicateUsernameError, normalizeUsername, saveUserProfile, updateUserChallengeDetails } from "./profile-utils.js";

/**
 * Username edit modal — opened from the settings cog.
 * Syncs the hidden `#profile-display-name` input on save so the
 * existing save-on-blur logic stays consistent.
 */
export function openEditUsernameModal() {
  const currentInput = document.getElementById("profile-display-name");
  const currentName = currentInput ? currentInput.value : "";
  const savedScrollY = lockUsernameModalScroll();
  const ui = createUsernameModalElements(currentName);
  const { backdrop, dialog, input, errEl, cancelBtn, saveBtn } = ui;

  const finish = () => {
    window.visualViewport?.removeEventListener("resize", onVvResize);
    backdrop.remove();
    delete document.body.dataset.modalOpen;
    document.removeEventListener("keydown", onKey);
    document.documentElement.classList.remove("is-username-modal-open");
    document.body.style.top = "";
    window.scrollTo(0, savedScrollY);
  };

  const onKey = (e) => handleUsernameModalKey(e, finish);
  document.addEventListener("keydown", onKey);
  backdrop.addEventListener("click", (e) => handleUsernameBackdropClick(e, backdrop, finish));
  dialog.addEventListener("click", (e) => e.stopPropagation());

  cancelBtn.addEventListener("click", finish);
  saveBtn.addEventListener("click", () =>
    saveUsernameFromModal({ input, errEl, saveBtn, cancelBtn, currentInput, finish }),
  );

  document.body.appendChild(backdrop);
  const onVvResize = () => {
    const rect = dialog.getBoundingClientRect();
    const vv = window.visualViewport;
    agentDebugLog("run4", "H11", "public/js/pages/profile/modals.js:openEditUsernameModal", "username-modal-vv-resize", {
      dialogTop: Math.round(rect.top),
      dialogBottom: Math.round(rect.bottom),
      viewportHeight: window.innerHeight,
      visualViewportHeight: vv ? Math.round(vv.height) : null,
      visualViewportOffsetTop: vv ? Math.round(vv.offsetTop) : null,
    });
  };
  window.visualViewport?.addEventListener("resize", onVvResize);
  const backdropCs = window.getComputedStyle(backdrop);
  const rect = dialog.getBoundingClientRect();
  agentDebugLog("run4", "H11", "public/js/pages/profile/modals.js:openEditUsernameModal", "username-modal-open", {
    alignItems: backdropCs.alignItems,
    justifyContent: backdropCs.justifyContent,
    dialogTop: Math.round(rect.top),
    dialogBottom: Math.round(rect.bottom),
    viewportHeight: window.innerHeight,
    visualViewportHeight: window.visualViewport ? Math.round(window.visualViewport.height) : null,
  });
  input.focus();
  input.select();
}

function lockUsernameModalScroll() {
  document.body.dataset.modalOpen = "true";
  const savedScrollY = window.scrollY || window.pageYOffset || 0;
  document.documentElement.classList.add("is-username-modal-open");
  document.body.style.top = `-${savedScrollY}px`;
  return savedScrollY;
}

function createUsernameModalElements(currentName) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.setAttribute("role", "presentation");

  const dialog = document.createElement("div");
  dialog.className = "modal-dialog profile-username-modal";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "profile-username-modal-title");

  const h = document.createElement("h2");
  h.className = "modal-dialog-title";
  h.id = "profile-username-modal-title";
  h.textContent = "Edit username";

  const lead = document.createElement("p");
  lead.className = "modal-dialog-text";
  lead.textContent =
    "Public name shown on hunts and leaderboards. Letters, numbers, and single spaces (2–24 characters).";

  const field = usernameField(currentName);
  const errEl = usernameErrorElement();
  const { actions, cancelBtn, saveBtn } = usernameModalActions();

  dialog.append(h, lead, field, errEl, actions);
  backdrop.appendChild(dialog);
  return { backdrop, dialog, input: field.querySelector("input"), errEl, cancelBtn, saveBtn };
}

function usernameField(currentName) {
  const field = document.createElement("div");
  field.className = "form-field";
  const lab = document.createElement("label");
  lab.htmlFor = "profile-username-modal-input";
  lab.textContent = "Username";
  const input = document.createElement("input");
  input.id = "profile-username-modal-input";
  input.type = "text";
  input.className = "input-grow";
  input.maxLength = 24;
  input.autocomplete = "nickname";
  input.placeholder = "Letters and numbers";
  input.value = currentName;
  field.append(lab, input);
  return field;
}

function usernameErrorElement() {
  const errEl = document.createElement("p");
  errEl.className = "profile-edit-hunt-err";
  errEl.setAttribute("aria-live", "polite");
  errEl.hidden = true;
  return errEl;
}

function usernameModalActions() {
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
  return { actions, cancelBtn, saveBtn };
}

function handleUsernameModalKey(e, finish) {
  if (e.key === "Escape") finish();
}

function handleUsernameBackdropClick(e, backdrop, finish) {
  if (e.target === backdrop) finish();
}

function showUsernameError(errEl, message) {
  errEl.textContent = message;
  errEl.hidden = false;
}

function validateUsernameInput(next, errEl) {
  if (next === "" || (next.length >= 2 && normalizeUsername(next) !== null)) return true;
  showUsernameError(errEl, "Use letters, numbers, and single spaces (2–24 characters).");
  return false;
}

function syncSavedUsername(currentInput, next) {
  if (currentInput) currentInput.value = next;
  const heroNameEl = document.querySelector("[data-profile-display-name]");
  if (heroNameEl) heroNameEl.textContent = next || "Your account";
}

function usernameSaveErrorMessage(e) {
  if (e instanceof DuplicateUsernameError || e?.code === "DUPLICATE_USERNAME") {
    return e.message || "Name already taken.";
  }
  return e?.message || "Could not save.";
}

async function saveUsernameFromModal({ input, errEl, saveBtn, cancelBtn, currentInput, finish }) {
  errEl.hidden = true;
  errEl.textContent = "";
  const next = input.value.trim();
  if (!validateUsernameInput(next, errEl)) return;
  saveBtn.disabled = true;
  cancelBtn.disabled = true;
  try {
    await saveUserProfile({ displayName: next, avatarId: undefined });
    syncSavedUsername(currentInput, next);
    finish();
  } catch (e) {
    showUsernameError(errEl, usernameSaveErrorMessage(e));
  } finally {
    saveBtn.disabled = false;
    cancelBtn.disabled = false;
  }
}

/**
 * @param {{ id: string, title?: string, areaLabel?: string, timeLimitMinutes?: number, huntHint?: string }} c
 */
export function openEditHuntDetailsModal(c) {
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
