/**
 * Home page — NeoUI hunts feed.
 */

import { escapeHtml } from "./page-html.js";
import { applyAppImageLoadMotion, renderAppShell } from "./page-shell.js";
import { loadHuntFeedDeps } from "./hunt-page-deps.js";

let auth;
let gateRoutePreload;
let userHasWonChallenge;
let watchChallenges;
let promptGuestNeedsSignIn;
let watchFavoritedHuntIds;
let setHuntFavorited;
let promptReportChallenge;
let showAppToast;
let homeDepsPromise;

async function loadHomeDeps() {
  if (!homeDepsPromise) {
    homeDepsPromise = loadHuntFeedDeps().then((deps) => {
      auth = deps.auth;
      gateRoutePreload = deps.gateRoutePreload;
      userHasWonChallenge = deps.userHasWonChallenge;
      watchChallenges = deps.watchChallenges;
      promptGuestNeedsSignIn = deps.promptGuestNeedsSignIn;
      watchFavoritedHuntIds = deps.watchFavoritedHuntIds;
      setHuntFavorited = deps.setHuntFavorited;
      promptReportChallenge = deps.promptReportChallenge;
      showAppToast = deps.showAppToast;
    });
  }
  return homeDepsPromise;
}

const STAR = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="m12 3.6 2.62 5.32 5.87.86-4.24 4.13 1 5.84L12 16.98l-5.25 2.77 1-5.84-4.24-4.13 5.87-.86Z"/></svg>`;
const STAR_FILL = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="m12 3.6 2.62 5.32 5.87.86-4.24 4.13 1 5.84L12 16.98l-5.25 2.77 1-5.84-4.24-4.13 5.87-.86Z"/></svg>`;
const WARN_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M12 3 1.7 21h20.6L12 3Zm0 5.6c.5 0 .9.4.9.9v5.8c0 .5-.4.9-.9.9s-.9-.4-.9-.9V9.5c0-.5.4-.9.9-.9Zm0 10.1a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z"/></svg>`;
const TINT_CLASSES = [
  "neo-hunt-card--lavender",
  "neo-hunt-card--peach",
  "neo-hunt-card--mustard",
  "neo-hunt-card--mint",
];
const VIEW_MODE_KEY = "tourgo-hunts-view-mode";
const FIRST_REVEAL_TIMEOUT_MS = 3500;
let listUnsub = null;
let favUnsub = null;
let lastSnap = null;
let huntFeedEl = null;
let viewToggleEl = null;
let viewMode = "grid";
let pendingViewSwitchAnim = false;
/* First-load gate — when the route renders, we hold the grid hidden until
   every visible thumbnail has either decoded or errored. After that first
   reveal, fav toggles and view-mode switches re-render synchronously. */
let firstFeedRevealed = false;
let firstRevealInFlight = false;
/** @type {Set<string>} */
let favoritedIds = new Set();

function nav(to) {
  const h = to.startsWith("#") ? to : `#${to}`;
  if (location.hash !== h) {
    location.hash = h;
    return;
  }
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

function getViewModePreference() {
  const stored = localStorage.getItem(VIEW_MODE_KEY);
  return stored === "list" ? "list" : "grid";
}

function setViewModePreference(nextMode) {
  viewMode = nextMode === "list" ? "list" : "grid";
  localStorage.setItem(VIEW_MODE_KEY, viewMode);
}

function renderViewToggle() {
  if (!viewToggleEl) return;
  viewToggleEl.innerHTML = `
    <button type="button" class="neo-view-toggle__btn ${viewMode === "grid" ? "is-active" : ""}" data-view-mode="grid" aria-pressed="${viewMode === "grid"}">Grid</button>
    <button type="button" class="neo-view-toggle__btn ${viewMode === "list" ? "is-active" : ""}" data-view-mode="list" aria-pressed="${viewMode === "list"}">List</button>
  `;
}

function huntCardHtml(c, id, index, mode = "grid") {
  const spots = c.spots?.length ?? 0;
  const mins = c.timeLimitMinutes ?? "?";
  const title = c.title || "Untitled hunt";
  const area = c.areaLabel || "NYC";
  const thumb = c.spots?.[0]?.imageUrl;
  const fav = favoritedIds.has(id);
  const createdBy = c.createdBy || "";
  const tint = TINT_CLASSES[index % TINT_CLASSES.length];
  const thumbInner = thumb
    ? `<img class="neo-hunt-card__thumb" src="${escapeHtml(thumb)}" alt="" width="400" height="400" loading="lazy" decoding="async" />`
    : `<div class="neo-hunt-card__thumb neo-hunt-card__thumb--empty" aria-hidden="true"></div>`;
  const isList = mode === "list";
  const cardClass = `neo-hunt-card neo-home-card ${tint} ${isList ? "neo-hunt-card--list" : ""}`;
  if (isList) {
    return `
      <li>
        <a class="${cardClass}" href="#/challenge/${encodeURIComponent(id)}" data-hunt-card data-challenge-id="${escapeHtml(id)}" data-created-by="${escapeHtml(createdBy)}">
          <span class="neo-hunt-card__thumb-wrap">${thumbInner}</span>
          <span class="neo-hunt-card__text">
            <span class="neo-hunt-card__meta">${escapeHtml(String(spots))} checkpoints · ${escapeHtml(String(mins))} min</span>
            <span class="neo-hunt-card__title">${escapeHtml(title)}</span>
            <span class="neo-hunt-card__footer">
              <span>${escapeHtml(area)}</span>
            </span>
          </span>
          <span class="neo-hunt-card__actions">
            <button type="button" class="neo-hunt-action-btn neo-hunt-action-btn--fav ${fav ? "is-favorited" : ""}" data-challenge-id="${escapeHtml(id)}" aria-label="${fav ? "Remove from saved" : "Add to saved"}" aria-pressed="${fav}">
              ${fav ? STAR_FILL : STAR}
            </button>
            <button type="button" class="neo-hunt-action-btn neo-hunt-action-btn--report" aria-label="Report this hunt" title="Report" data-challenge-id="${escapeHtml(id)}" data-challenge-title="${escapeHtml(title)}">${WARN_ICON}</button>
          </span>
        </a>
      </li>
    `;
  }

  return `
    <li>
      <a class="${cardClass}" href="#/challenge/${encodeURIComponent(id)}" data-hunt-card data-challenge-id="${escapeHtml(id)}" data-created-by="${escapeHtml(createdBy)}">
        <span class="neo-hunt-card__thumb-wrap">${thumbInner}</span>
        <span class="neo-hunt-card__text">
          <span class="neo-hunt-card__meta">${escapeHtml(String(spots))} checkpoints · ${escapeHtml(String(mins))} min</span>
          <span class="neo-hunt-card__title">${escapeHtml(title)}</span>
          <span class="neo-hunt-card__footer">
            <span>${escapeHtml(area)}</span>
          </span>
        </span>
        <span class="neo-hunt-card__actions neo-hunt-card__actions--grid">
          <button type="button" class="neo-hunt-action-btn neo-hunt-action-btn--fav ${fav ? "is-favorited" : ""}" data-challenge-id="${escapeHtml(id)}" aria-label="${fav ? "Remove from saved" : "Add to saved"}" aria-pressed="${fav}">
            ${fav ? STAR_FILL : STAR}
          </button>
          <button type="button" class="neo-hunt-action-btn neo-hunt-action-btn--report" aria-label="Report this hunt" title="Report" data-challenge-id="${escapeHtml(id)}" data-challenge-title="${escapeHtml(title)}">${WARN_ICON}</button>
        </span>
      </a>
    </li>
  `;
}

/* gateRoutePreload (../lib/preload-gate.js) handles all the image-decode
   + font-ready bookkeeping. Kept as a thin local wrapper so the existing
   call sites read clearly. */
function waitForFeedImages(scope) {
  return gateRoutePreload(scope, { timeoutMs: FIRST_REVEAL_TIMEOUT_MS });
}

function renderFeed() {
  if (!huntFeedEl || !lastSnap) return;
  const docs = lastSnap.docs;
  const countEl = document.getElementById("hunts-count");
  if (countEl) countEl.textContent = String(docs.length);
  if (!docs.length) {
    huntFeedEl.innerHTML = `<p class="neo-hunts-empty">No hunts yet. Be the first to <a href="#/create">create one</a>.</p>`;
    huntFeedEl.classList.remove("loading", "is-prepping");
    huntFeedEl.classList.add("is-ready");
    firstFeedRevealed = true;
    return;
  }
  /* Decide whether this render needs the first-reveal gate. We only gate
     on the *first* successful render after route entry; subsequent ones
     (fav flips, view-mode toggles) update in place. */
  const shouldGate = !firstFeedRevealed && !firstRevealInFlight;
  if (shouldGate) {
    firstRevealInFlight = true;
    huntFeedEl.classList.remove("is-ready");
    huntFeedEl.classList.add("is-prepping");
  }
  huntFeedEl.innerHTML = `
    <div class="neo-hunts-mode-stage">
      <ul class="neo-hunts-grid ${viewMode === "list" ? "neo-hunts-grid--list" : ""}" role="list">
        ${docs.map((d, index) => huntCardHtml(d.data(), d.id, index, viewMode)).join("")}
      </ul>
    </div>
  `;
  huntFeedEl.classList.remove("loading");
  revealHomeFeedWhenReady(shouldGate);
  animateHomeViewSwitch();
  void applyAppImageLoadMotion(huntFeedEl);
}

function revealHomeFeedWhenReady(shouldGate) {
  if (!shouldGate) return;
  waitForFeedImages(huntFeedEl).then(() => {
    // Defensive — the route might have been left while we waited.
    if (!huntFeedEl) return;
    huntFeedEl.classList.remove("is-prepping");
    huntFeedEl.classList.add("is-ready");
    firstFeedRevealed = true;
    firstRevealInFlight = false;
  });
}

function animateHomeViewSwitch() {
  const animGrid = huntFeedEl.querySelector(".neo-hunts-grid");
  if (!pendingViewSwitchAnim || !(animGrid instanceof HTMLElement)) return;
  animGrid.classList.add("neo-view-switch-enter");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      animGrid.classList.add("neo-view-switch-enter-active");
    });
  });
  const clear = () => {
    animGrid.classList.remove("neo-view-switch-enter", "neo-view-switch-enter-active");
  };
  animGrid.addEventListener("transitionend", clear, { once: true });
  pendingViewSwitchAnim = false;
}

function handleViewModeClick(modeBtn) {
  const nextMode = modeBtn.getAttribute("data-view-mode");
  setViewModePreference(nextMode);
  renderViewToggle();
  pendingViewSwitchAnim = true;
  if (lastSnap) renderFeed();
}

async function handleFavoriteClick(e, fav) {
  e.preventDefault();
  e.stopPropagation();
  const id = fav.getAttribute("data-challenge-id");
  if (!id) return;
  if (!auth.currentUser) {
    await promptGuestNeedsSignIn("Saving favorites needs a Google account.");
    return;
  }
  const was = favoritedIds.has(id);
  try {
    await setHuntFavorited(id, !was);
    if (!was) favoritedIds.add(id);
    else favoritedIds.delete(id);
    renderFeed();
    showAppToast(was ? "Removed from Saved." : "Added to Saved.");
  } catch (err) {
    showAppToast(err?.message || "Could not update favorites.");
  }
}

async function handleReportClick(e, reportBtn) {
  e.preventDefault();
  e.stopPropagation();
  const challengeId = reportBtn.getAttribute("data-challenge-id");
  if (!challengeId) return;
  const huntTitle = reportBtn.getAttribute("data-challenge-title") || "Hunt";
  await promptReportChallenge({ challengeId, huntTitle });
}

async function handleHuntCardClick(e, card) {
  if (!auth.currentUser) return;
  const id = card.getAttribute("data-challenge-id");
  if (!id) return;
  const createdBy = card.getAttribute("data-created-by") || "";
  e.preventDefault();
  if (createdBy && createdBy === auth.currentUser.uid) {
    nav(`#/hunt-review/${id}`);
    return;
  }
  try {
    const won = await userHasWonChallenge(auth.currentUser.uid, id);
    nav(won ? `#/hunt-review/${id}` : `#/challenge/${id}`);
  } catch {
    nav(`#/challenge/${id}`);
  }
}

async function onFeedClick(e) {
  if (handleHomeViewToggleClick(e)) return;
  if (await handleHomeFeedActionClick(e)) return;
  await handleHomeFeedCardClick(e);
}

function handleHomeViewToggleClick(e) {
  const modeBtn = e.target.closest("[data-view-mode]");
  if (!modeBtn || !viewToggleEl?.contains(modeBtn)) return false;
  handleViewModeClick(modeBtn);
  return true;
}

async function handleHomeFeedActionClick(e) {
  const fav = e.target.closest(".neo-hunt-action-btn--fav");
  if (fav && huntFeedEl?.contains(fav)) {
    await handleFavoriteClick(e, fav);
    return true;
  }
  const reportBtn = e.target.closest(".neo-hunt-action-btn--report");
  if (reportBtn && huntFeedEl?.contains(reportBtn)) {
    await handleReportClick(e, reportBtn);
    return true;
  }
  return false;
}

async function handleHomeFeedCardClick(e) {
  const card = e.target.closest("a[data-hunt-card]");
  if (card && huntFeedEl?.contains(card)) {
    await handleHuntCardClick(e, card);
  }
}

function bindFavoritesWatch() {
  if (favUnsub) {
    favUnsub();
    favUnsub = null;
  }
  const uid = auth.currentUser?.uid;
  if (!uid) {
    favoritedIds = new Set();
    if (lastSnap) renderFeed();
    return;
  }
  favUnsub = watchFavoritedHuntIds(
    uid,
    (ids) => {
      favoritedIds = new Set(ids);
      if (lastSnap) renderFeed();
    },
    () => {},
  );
}

export async function render() {
  await loadHomeDeps();
  lastSnap = null;
  firstFeedRevealed = false;
  firstRevealInFlight = false;
  viewMode = getViewModePreference();

  await renderAppShell(
    `
    <div class="neo-hunts-page">
      <header class="neo-page-hero">
        <p class="neo-page-hero__kicker">&#x2605; Hunts &middot; <span id="hunts-count">0</span></p>
        <h1 class="neo-page-hero__title" id="hero-dynamic-title">Hunts<br><span class="neo-page-hero__accent">For You.</span></h1>
      </header>
      <div class="neo-view-toggle" id="hunts-view-toggle" role="group" aria-label="Hunts layout view"></div>
      <div id="hunts-feed" role="region" aria-busy="true"></div>
    </div>
    `,
    "hunts",
    { hideHeader: true },
  );

  viewToggleEl = document.getElementById("hunts-view-toggle");
  renderViewToggle();
  viewToggleEl?.addEventListener("click", onFeedClick);
  huntFeedEl = document.getElementById("hunts-feed");
  huntFeedEl?.addEventListener("click", onFeedClick);
  bindFavoritesWatch();

  listUnsub = watchChallenges(
    40,
    (snap) => {
      lastSnap = snap;
      renderFeed();
    },
    (err) => {
      if (huntFeedEl) {
        huntFeedEl.innerHTML = `<li><div class="status-banner error">${escapeHtml(err.message)}</div></li>`;
      }
    },
  );
}

export function cleanup() {
  viewToggleEl?.removeEventListener("click", onFeedClick);
  viewToggleEl = null;
  huntFeedEl?.removeEventListener("click", onFeedClick);
  huntFeedEl = null;
  firstFeedRevealed = false;
  firstRevealInFlight = false;
  if (favUnsub) {
    favUnsub();
    favUnsub = null;
  }
  favoritedIds = new Set();
  if (listUnsub) {
    listUnsub();
    listUnsub = null;
  }
  lastSnap = null;
}
