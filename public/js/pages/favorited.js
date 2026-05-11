/**
 * Favorited hunts — lists `users/{uid}/favoritedHunts` with live updates.
 * Design: NeoSaved (Claude design).
 */

import { escapeHtml } from "./page-html.js";
import { applyAppImageLoadMotion, renderAppShell } from "./page-shell.js";
import { loadHuntFeedDeps } from "./hunt-page-deps.js";

let auth;
let gateRoutePreload;
let userHasWonChallenge;
let getChallenge;
let watchFavoritedHuntIds;
let setHuntFavorited;
let promptReportChallenge;
let showAppToast;
let promptGuestNeedsSignIn;
let favoritedDepsPromise;

async function loadFavoritedDeps() {
  if (!favoritedDepsPromise) {
    favoritedDepsPromise = loadHuntFeedDeps().then((deps) => {
      auth = deps.auth;
      gateRoutePreload = deps.gateRoutePreload;
      userHasWonChallenge = deps.userHasWonChallenge;
      getChallenge = deps.getChallenge;
      watchFavoritedHuntIds = deps.watchFavoritedHuntIds;
      setHuntFavorited = deps.setHuntFavorited;
      promptReportChallenge = deps.promptReportChallenge;
      showAppToast = deps.showAppToast;
      promptGuestNeedsSignIn = deps.promptGuestNeedsSignIn;
    });
  }
  return favoritedDepsPromise;
}

let feedEl = null;
let favorUnsub = null;
let viewToggleEl = null;
/* First-paint gate — only the first non-empty paint after route entry
   is held back until images decode + fonts settle. Toggles (view-mode,
   fav flips) re-render synchronously. */
let savedFirstRevealed = false;
/** @type {string[]} */
let orderedIds = [];
let viewMode = "list";
let pendingViewSwitchAnim = false;
const VIEW_MODE_KEY = "tourgo-saved-view-mode";

function nav(to) {
  const h = to.startsWith("#") ? to : `#${to}`;
  if (location.hash !== h) {
    location.hash = h;
    return;
  }
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

const TINTS = ["peach", "lav", "mint", "mustard"];

const BOOKMARK_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
const TINT_CLASS = {
  peach: "neo-hunt-card--peach",
  lav: "neo-hunt-card--lavender",
  mint: "neo-hunt-card--mint",
  mustard: "neo-hunt-card--mustard",
};

function setFeedHtml(html) {
  if (!feedEl) return;
  feedEl.innerHTML = html;
  feedEl.classList.remove("loading");
  feedEl.removeAttribute("aria-busy");
}

function getViewModePreference() {
  const stored = localStorage.getItem(VIEW_MODE_KEY);
  return stored === "grid" ? "grid" : "list";
}

function setViewModePreference(nextMode) {
  viewMode = nextMode === "grid" ? "grid" : "list";
  localStorage.setItem(VIEW_MODE_KEY, viewMode);
}

function renderViewToggle() {
  if (!viewToggleEl) return;
  viewToggleEl.innerHTML = `
    <button type="button" class="neo-view-toggle__btn ${viewMode === "grid" ? "is-active" : ""}" data-view-mode="grid" aria-pressed="${viewMode === "grid"}">Grid</button>
    <button type="button" class="neo-view-toggle__btn ${viewMode === "list" ? "is-active" : ""}" data-view-mode="list" aria-pressed="${viewMode === "list"}">List</button>
  `;
}

function savedCardHtml(c, id, tintIdx, mode = "list") {
  const spots = c.spots?.length ?? 0;
  const mins = c.timeLimitMinutes ?? "?";
  const area = c.areaLabel || "NYC";
  const title = c.title || "Untitled hunt";
  const thumb = c.spots?.[0]?.imageUrl;
  const createdBy = c.createdBy || "";
  const tint = TINTS[tintIdx % TINTS.length];
  const thumbHtml = thumb
    ? `<img class="neo-hunt-card__thumb" src="${escapeHtml(thumb)}" alt="" loading="lazy" decoding="async" />`
    : `<div class="neo-hunt-card__thumb neo-hunt-card__thumb--empty" aria-hidden="true"></div>`;

  const isGrid = mode === "grid";
  if (isGrid) {
    return `
      <li>
        <a class="neo-hunt-card neo-saved-card ${TINT_CLASS[tint] || "neo-hunt-card--peach"}" data-tint="${tint}" href="#/challenge/${encodeURIComponent(id)}" data-hunt-card data-challenge-id="${escapeHtml(id)}" data-created-by="${escapeHtml(createdBy)}">
          <span class="neo-hunt-card__thumb-wrap">${thumbHtml}</span>
          <span class="neo-hunt-card__text">
            <span class="neo-hunt-card__meta">${escapeHtml(String(spots))} checkpoints · ${escapeHtml(String(mins))} min</span>
            <span class="neo-hunt-card__title">${escapeHtml(title)}</span>
            <span class="neo-hunt-card__footer">
              <span>${escapeHtml(area)}</span>
              <button type="button" class="neo-hunt-card__warn hunt-row__report" aria-label="Report this hunt" title="Report" data-challenge-id="${escapeHtml(id)}" data-challenge-title="${escapeHtml(title)}">\u26A0\uFE0E</button>
            </span>
          </span>
          <button type="button" class="neo-hunt-card__heart hunt-favorite-btn is-favorited" data-challenge-id="${escapeHtml(id)}" aria-label="Remove from saved" aria-pressed="true">${BOOKMARK_ICON}</button>
        </a>
      </li>
    `;
  }

  return `
    <li>
      <a class="neo-hunt-card neo-saved-card neo-hunt-card--list ${TINT_CLASS[tint] || "neo-hunt-card--peach"}" data-tint="${tint}" href="#/challenge/${encodeURIComponent(id)}" data-hunt-card data-challenge-id="${escapeHtml(id)}" data-created-by="${escapeHtml(createdBy)}">
        <span class="neo-hunt-card__thumb-wrap">
          ${thumbHtml}
        </span>
        <span class="neo-hunt-card__text">
          <span class="neo-hunt-card__meta">${escapeHtml(area)}</span>
          <span class="neo-hunt-card__title">${escapeHtml(title)}</span>
          <span class="neo-hunt-card__footer">
            <span>${escapeHtml(String(spots))} spots · ${escapeHtml(String(mins))}m</span>
            <span class="neo-saved-when">Saved</span>
          </span>
        </span>
        <span class="neo-hunt-card__actions">
          <button type="button" class="neo-hunt-card__heart hunt-favorite-btn is-favorited" data-challenge-id="${escapeHtml(id)}" aria-label="Remove from saved" aria-pressed="true">
            ${BOOKMARK_ICON}
          </button>
          <button type="button" class="neo-hunt-card__warn hunt-row__report" aria-label="Report this hunt" title="Report" data-challenge-id="${escapeHtml(id)}" data-challenge-title="${escapeHtml(title)}">\u26A0\uFE0E</button>
        </span>
      </a>
    </li>
  `;
}

async function paintFeed() {
  if (!feedEl) return;
  const countEl = document.getElementById("favorited-count");
  if (!orderedIds.length) {
    if (countEl) countEl.textContent = "0";
    setFeedHtml(
      '<p class="neo-hunts-empty">You have not saved any hunts yet. Browse <a href="#/">Open hunts</a> and tap the bookmark on a listing.</p>',
    );
    return;
  }

  const visible = await loadVisibleSavedCards();
  if (countEl) countEl.textContent = String(visible.length);
  setFeedHtml(savedFeedHtml(visible));
  revealSavedFeedWhenReady(visible);
  animateSavedViewSwitch();
  void applyAppImageLoadMotion(feedEl);
}

async function loadVisibleSavedCards() {
  const cards = await Promise.all(
    orderedIds.map(async (id, idx) => {
      const c = await getChallenge(id);
      if (!c) return null;
      return savedCardHtml(c, c.id || id, idx, viewMode);
    }),
  );
  return cards.filter(Boolean);
}

function savedFeedHtml(visible) {
  return visible.length
    ? `<div class="neo-hunts-mode-stage"><ul class="neo-hunts-grid ${viewMode === "list" ? "neo-hunts-grid--list" : ""}" role="list">${visible.join("")}</ul></div>`
    : '<p class="neo-hunts-empty">Your saved hunts are no longer available.</p>';
}

function revealSavedFeedWhenReady(visible) {
  // First non-empty paint after route entry -> hold the feed hidden until
  // thumbs decode + fonts load, then fade in cleanly.
  if (savedFirstRevealed || !visible.length || !feedEl) return;
  savedFirstRevealed = true;
  gateRoutePreload(feedEl);
}

function animateSavedViewSwitch() {
  const animGrid = feedEl?.querySelector(".neo-hunts-grid");
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

function handleSavedViewModeClick(modeBtn) {
  const nextMode = modeBtn.getAttribute("data-view-mode");
  setViewModePreference(nextMode);
  renderViewToggle();
  pendingViewSwitchAnim = true;
  void paintFeed();
}

async function handleSavedFavoriteClick(e, fav) {
  e.preventDefault();
  e.stopPropagation();
  const challengeId = fav.getAttribute("data-challenge-id");
  if (!challengeId) return;
  if (!auth.currentUser) {
    await promptGuestNeedsSignIn("Saving favorites needs a Google account.");
    return;
  }
  const was = fav.classList.contains("is-favorited");
  try {
    await setHuntFavorited(challengeId, !was);
    showAppToast(was ? "Removed from Saved." : "Added to Saved.");
  } catch (err) {
    showAppToast(err?.message || "Could not update favorites.");
  }
}

async function handleSavedReportClick(e, btn) {
  e.preventDefault();
  e.stopPropagation();
  const challengeId = btn.getAttribute("data-challenge-id");
  if (!challengeId) return;
  const huntTitle = btn.getAttribute("data-challenge-title") || "Hunt";
  await promptReportChallenge({ challengeId, huntTitle });
}

async function handleSavedCardClick(e, row) {
  if (!auth.currentUser) return;
  const challengeId = savedCardChallengeId(row);
  if (!challengeId) return;
  const createdBy = row.getAttribute("data-created-by") || "";
  e.preventDefault();
  if (createdBy && createdBy === auth.currentUser.uid) {
    nav(`#/hunt-review/${challengeId}`);
    return;
  }
  try {
    const won = await userHasWonChallenge(
      auth.currentUser.uid,
      challengeId,
    );
    if (won) nav(`#/hunt-review/${challengeId}`);
    else nav(`#/challenge/${challengeId}`);
  } catch {
    nav(`#/challenge/${challengeId}`);
  }
}

function savedCardChallengeId(row) {
  const href = row.getAttribute("href") || "";
  const match = href.match(/#\/challenge\/([^/?#]+)/);
  return match ? match[1] : "";
}

async function onFeedClick(e) {
  if (handleSavedViewToggleClick(e)) return;
  if (await handleSavedFeedActionClick(e)) return;
  await handleSavedFeedCardClick(e);
}

function handleSavedViewToggleClick(e) {
  const modeBtn = e.target.closest("[data-view-mode]");
  if (!modeBtn || !viewToggleEl?.contains(modeBtn)) return false;
  handleSavedViewModeClick(modeBtn);
  return true;
}

async function handleSavedFeedActionClick(e) {
  const fav = e.target.closest(".hunt-favorite-btn");
  if (fav && feedEl?.contains(fav)) {
    await handleSavedFavoriteClick(e, fav);
    return true;
  }
  const btn = e.target.closest(".hunt-row__report");
  if (btn && feedEl?.contains(btn)) {
    await handleSavedReportClick(e, btn);
    return true;
  }
  return false;
}

async function handleSavedFeedCardClick(e) {
  const row = e.target.closest("a[data-hunt-card]");
  if (row && feedEl?.contains(row)) {
    await handleSavedCardClick(e, row);
  }
}

export async function render() {
  await loadFavoritedDeps();
  orderedIds = [];
  savedFirstRevealed = false;
  viewMode = getViewModePreference();
  await renderAppShell(
    `
    <div class="neo-hunts-page neo-saved-page saved-page">
      <header class="saved-header">
        <div class="saved-header__kicker">&#x2605; Saved &middot; <span id="favorited-count">0</span></div>
        <h1 class="saved-header__title">Your<br/>stash.</h1>
      </header>

      <div class="neo-view-toggle neo-view-toggle--saved" id="saved-view-toggle" role="group" aria-label="Saved layout view"></div>

      <div id="favorited-feed" role="region" aria-busy="true"></div>
    </div>
  `,
    "favorited",
    { hideHeader: true },
  );

  viewToggleEl = document.getElementById("saved-view-toggle");
  renderViewToggle();
  viewToggleEl?.addEventListener("click", onFeedClick);
  feedEl = document.getElementById("favorited-feed");
  feedEl?.addEventListener("click", onFeedClick);

  const uid = auth.currentUser?.uid;
  if (!uid) {
    setFeedHtml(
      '<p class="neo-hunts-empty">Sign in to view your saved hunts.</p>',
    );
    return;
  }

  favorUnsub = watchFavoritedHuntIds(
    uid,
    (ids) => {
      orderedIds = ids;
      void paintFeed();
    },
    (err) => {
      setFeedHtml(
        `<div class="status-banner error">${escapeHtml(err.message)}</div>`,
      );
    },
  );
}

export function cleanup() {
  viewToggleEl?.removeEventListener("click", onFeedClick);
  viewToggleEl = null;
  feedEl?.removeEventListener("click", onFeedClick);
  feedEl = null;
  if (favorUnsub) {
    favorUnsub();
    favorUnsub = null;
  }
  orderedIds = [];
  savedFirstRevealed = false;
}
