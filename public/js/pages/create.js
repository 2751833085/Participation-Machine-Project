/**
 * Create-a-hunt page — multi-spot form with image upload.
 * Design: NeoCreate (extras.jsx, line 303).
 */


import { escapeHtml } from "./page-html.js";
import { renderAppShell } from "./page-shell.js";
const FIREBASE_PATH = "../firebase-init.js";
const MODAL_PATH = "../components/modal.js";
const ROUTER_PATH = "../lib/router.js";
const STATE_PATH = "../lib/state.js";
const AUTH_SERVICE_PATH = "../services/auth.js";
const CHALLENGES_PATH = "../services/challenges.js";
const I18N_PATH = "../lib/i18n.js";
const LOGIN_PAGE_PATH = "./login.js";

let auth;
let openConfirmModal;
let showPublishSuccessOverlay;
let nav;
let saveAuthReturn;
let ensureUser;
let MAX_SPOTS;
let MIN_SPOTS;
let createChallenge;
let inferManhattanPoint;
let t;
let loginPage;
let createDepsPromise;

const NE_ARROW_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7 M8 7 H17 V16"/></svg>`;

async function loadCreateDeps() {
  if (!createDepsPromise) {
    createDepsPromise = Promise.all([
      import(FIREBASE_PATH),
      import(MODAL_PATH),
      import(ROUTER_PATH),
      import(STATE_PATH),
      import(AUTH_SERVICE_PATH),
      import(CHALLENGES_PATH),
      import(I18N_PATH),
      import(LOGIN_PAGE_PATH),
    ]).then(([firebase, modal, router, state, authService, challenges, i18n, login]) => {
      auth = firebase.auth;
      openConfirmModal = modal.openConfirmModal;
      showPublishSuccessOverlay = modal.showPublishSuccessOverlay;
      nav = router.nav;
      saveAuthReturn = state.saveAuthReturn;
      ensureUser = authService.ensureUser;
      MAX_SPOTS = challenges.MAX_SPOTS;
      MIN_SPOTS = challenges.MIN_SPOTS;
      createChallenge = challenges.createChallenge;
      inferManhattanPoint = challenges.inferManhattanPoint;
      t = i18n.t;
      loginPage = login;
    });
  }
  return createDepsPromise;
}

const CLOSE_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
const LIST_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>`;

function spotRowHtml(i) {
  const n = String(i + 1).padStart(2, "0");
  return `
    <div class="create-spot-row" data-spot-index="${i}">
      <div class="create-spot-row__num" aria-hidden="true">${n}</div>
      <div class="create-spot-row__body">
        <label class="create-field create-field--file">
          <span class="create-field__label">Checkpoint photo ${i + 1}</span>
          <input class="create-field__file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required />
        </label>
        <label class="create-field">
          <span class="create-field__label">Hint (optional)</span>
          <input class="create-field__input" type="text" name="hint" placeholder="${escapeHtml(t("create.basicHintPlaceholder"))}" />
        </label>
      </div>
      <div class="create-spot-row__grip" aria-hidden="true">${LIST_ICON}</div>
    </div>
  `;
}

export async function render() {
  await loadCreateDeps();
  if (!auth.currentUser) {
    saveAuthReturn("#/create-list");
    loginPage.render();
    return;
  }

  let spotCount = MIN_SPOTS;
  const rows = () =>
    Array.from({ length: spotCount }, (_, i) => spotRowHtml(i)).join("");

  await renderAppShell(
    `
    <div class="create-page">
      <section class="create-hero" data-tint="peach">
        <div class="create-hero__kicker">Title</div>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxlength="80"
          placeholder="Midtown After Dark"
          class="create-hero__input"
          autocomplete="off"
        />
        <div class="create-hero__chip">Tap to edit</div>
      </section>

      <section class="create-meta-grid">
        <label class="create-meta-card" data-tint="mint">
          <span class="create-meta-card__k">Time</span>
          <span class="create-meta-card__v">
            <input id="minutes" name="minutes" type="number" min="5" max="180" value="30" required />
          </span>
          <span class="create-meta-card__u">min</span>
        </label>
        <div class="create-meta-card" data-tint="lav">
          <span class="create-meta-card__k">Spots</span>
          <span class="create-meta-card__v" id="create-spot-count-display">${String(spotCount).padStart(2, "0")}</span>
          <span class="create-meta-card__u">stops</span>
        </div>
        <div class="create-meta-card" data-tint="mustard">
          <span class="create-meta-card__k">Max</span>
          <span class="create-meta-card__v">${String(MAX_SPOTS).padStart(2, "0")}</span>
          <span class="create-meta-card__u">/ cap</span>
        </div>
      </section>

      <section class="create-area-block">
        <label class="create-field">
          <span class="create-field__label">Area / neighborhood</span>
          <input id="area" name="area" type="text" required maxlength="80" placeholder="Union Square, Manhattan" class="create-field__input" />
        </label>
        <label class="create-field">
          <span class="create-field__label">Hunt hint <span class="create-field__optional">(optional)</span></span>
          <input id="hunt-hint" name="huntHint" type="text" maxlength="300" placeholder="${escapeHtml(t("create.huntHintPlaceholder"))}" class="create-field__input" />
        </label>
      </section>

      <div id="create-status" class="create-status"></div>

      <form id="create-form" class="create-form">
        <div class="create-section-head">
          <h2 class="create-section-title">
            Checkpoints
            <span class="create-section-title__meta" id="create-spot-count-label">${spotCount}/${MAX_SPOTS}</span>
          </h2>
          <div class="create-section-actions">
            <button type="button" class="create-chip-btn create-chip-btn--primary" id="add-spot">+ Add</button>
            <button type="button" class="create-chip-btn" id="remove-spot">Remove</button>
          </div>
        </div>

        <div id="spot-rows" class="create-spot-list">${rows()}</div>

        <div class="create-cta">
          <button type="submit" class="create-cta__btn" id="submit-create">Publish hunt ${NE_ARROW_ICON}</button>
        </div>
      </form>
    </div>
  `,
    "create-list",
    { hideHeader: true },
  );

  const spotRowsEl = document.getElementById("spot-rows");
  const statusEl = document.getElementById("create-status");
  const form = document.getElementById("create-form");
  const countDisplay = document.getElementById("create-spot-count-display");
  const countLabel = document.getElementById("create-spot-count-label");
  const backBtn = document.getElementById("create-back");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (window.history.length > 1) window.history.back();
      else nav("#/create");
    });
  }

  function syncCount() {
    if (countDisplay) countDisplay.textContent = String(spotCount).padStart(2, "0");
    if (countLabel) countLabel.textContent = `${spotCount}/${MAX_SPOTS}`;
  }

  document.getElementById("add-spot").addEventListener("click", () => {
    if (spotCount >= MAX_SPOTS) return;
    spotCount += 1;
    spotRowsEl.innerHTML = rows();
    syncCount();
  });

  document.getElementById("remove-spot").addEventListener("click", () => {
    if (spotCount <= MIN_SPOTS) return;
    spotCount -= 1;
    spotRowsEl.innerHTML = rows();
    syncCount();
  });

  form.addEventListener("submit", (e) => {
    void handleCreateSubmit(e, { statusEl, spotRowsEl });
  });
}

async function handleCreateSubmit(e, { statusEl, spotRowsEl }) {
  e.preventDefault();
  statusEl.innerHTML = "";
  const btn = document.getElementById("submit-create");
  try {
    const draft = readCreateDraft(spotRowsEl);
    const confirmed = await confirmCreatePublish();
    if (!confirmed) return;
    btn.disabled = true;
    await publishCreateDraft(draft, statusEl);
  } catch (err) {
    statusEl.innerHTML = `<div class="status-banner error">${escapeHtml(err.message || "Could not publish.")}</div>`;
    btn.disabled = false;
  }
}

function readCreateDraft(spotRowsEl) {
  const rowEls = spotRowsEl.querySelectorAll(".create-spot-row");
  if (rowEls.length < MIN_SPOTS) {
    throw new Error(`Add at least ${MIN_SPOTS} checkpoint${MIN_SPOTS > 1 ? "s" : ""}.`);
  }
  return {
    title: document.getElementById("title").value.trim(),
    areaLabel: document.getElementById("area").value.trim(),
    timeLimitMinutes: parseInt(document.getElementById("minutes").value, 10),
    huntHint: document.getElementById("hunt-hint")?.value.trim() || "",
    ...readCheckpointRows(rowEls),
  };
}

function readCheckpointRows(rowEls) {
  const files = [];
  const hints = [];
  rowEls.forEach((row) => {
    const input = row.querySelector('input[type="file"]');
    const hint = row.querySelector('input[name="hint"]')?.value.trim() ?? "";
    if (!input?.files?.[0]) throw new Error("Each checkpoint needs a photo.");
    files.push(input.files[0]);
    hints.push(hint);
  });
  return { files, hints };
}

function confirmCreatePublish() {
  return openConfirmModal({
    title: "Publish this hunt?",
    message: "Are you sure?\n\nOnce uploaded, your hunt cannot be undone for now.",
    confirmText: "Publish",
    cancelText: "Cancel",
    animate: true,
  });
}

async function publishCreateDraft(draft, statusEl) {
  await ensureUser();
  statusEl.innerHTML = '<div class="status-banner info">Publishing&hellip;</div>';
  const anchor = inferManhattanPoint({ areaLabel: draft.areaLabel });
  const spotLatLngs = anchor
    ? draft.files.map(() => ({ lat: anchor.lat, lng: anchor.lng }))
    : undefined;
  const newChallengeId = await createChallenge({
    ...draft,
    ...(anchor ? { lat: anchor.lat, lng: anchor.lng, spotLatLngs } : {}),
  });
  await showPublishSuccessOverlay({
    title: "Published!",
    message: "Opening photos & comments for your hunt…",
  });
  nav(`#/hunt-review/${newChallengeId}`);
}

export function cleanup() {}
