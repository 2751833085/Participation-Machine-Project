/**
 * Challenge detail page — preview checkpoints + start hunt button.
 * Template mirrors ClassicalChallenge / NeoChallenge in _design-v2.
 * Classical vs neo diverges only via the token layer + a couple of
 * [data-ui-theme] scoped rules in design.css; the HTML is one tree.
 */

import { escapeHtml } from "./page-html.js";
import { renderAppShell } from "./page-shell.js";
import { loadChallengeDetailDeps } from "./hunt-page-deps.js";
const START_HUNT_MAX_DISTANCE_M = 150;

let auth;
let startHuntWithGeoCheck;
let userHasWonChallenge;
let getChallenge;
let huntStartAnchorCoords;
let isHuntFavorited;
let setHuntFavorited;
let showAppToast;
let promptReportChallenge;
let promptGuestNeedsSignIn;
let destroyChallengeMap;
let mountChallengeStartMap;
let challengeDepsPromise;

async function loadChallengeDeps() {
  if (!challengeDepsPromise) {
    challengeDepsPromise = loadChallengeDetailDeps().then((deps) => {
      auth = deps.auth;
      startHuntWithGeoCheck = deps.startHuntWithGeoCheck;
      userHasWonChallenge = deps.userHasWonChallenge;
      getChallenge = deps.getChallenge;
      huntStartAnchorCoords = deps.huntStartAnchorCoords;
      isHuntFavorited = deps.isHuntFavorited;
      setHuntFavorited = deps.setHuntFavorited;
      showAppToast = deps.showAppToast;
      promptReportChallenge = deps.promptReportChallenge;
      promptGuestNeedsSignIn = deps.promptGuestNeedsSignIn;
      destroyChallengeMap = deps.destroyChallengeMap;
      mountChallengeStartMap = deps.mountChallengeStartMap;
    });
  }
  return challengeDepsPromise;
}

function challengeErrorHtml(message, backText = "All hunts") {
  return `<div class="page-narrow"><div class="status-banner error">${escapeHtml(message)}</div><p><a href="#/" class="back-link">← ${escapeHtml(backText)}</a></p></div>`;
}

function resolveHuntAnchor(challenge) {
  try {
    return huntStartAnchorCoords(challenge);
  } catch {
    return null;
  }
}

function challengeMapSectionHtml(huntAnchor) {
  if (!huntAnchor) {
    return `<p class="challenge-start-map-fallback">Map preview unavailable for this hunt.</p>`;
  }
  if (!window.L) {
    return `<p class="challenge-start-map-fallback">Map preview unavailable.</p>`;
  }
  return `
    <div class="challenge-start-map-card" aria-label="Hunt start area preview">
      <div class="challenge-start-map-host" id="challenge-start-map-host">
        <div id="challenge-start-map" class="challenge-start-map" role="img" aria-label="Map: hunt location and ${START_HUNT_MAX_DISTANCE_M} meter start zone"></div>
        <button type="button" class="challenge-start-map-refresh" id="challenge-map-refresh" aria-label="Refresh my location on map">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.64-6.36"/>
            <path d="M21 3v7h-7"/>
          </svg>
        </button>
      </div>
      <p class="challenge-start-map-note">Yellow = hunt start · green = you (only inside map view) · ring = ${START_HUNT_MAX_DISTANCE_M} m to start</p>
    </div>
  `;
}

function challengeSpotsHtml(spots) {
  return spots
    .map(
      (s, i) => `
        <div class="challenge-spot">
          <div class="challenge-spot__num">${i + 1}</div>
          <div class="challenge-spot__thumb">
            <img src="${escapeHtml(s.imageUrl)}" alt="Checkpoint ${i + 1}" loading="lazy" />
          </div>
          <div class="challenge-spot__body">
            <div class="challenge-spot__label">${s.hint ? escapeHtml(s.hint) : `Checkpoint ${i + 1}`}</div>
          </div>
          <svg class="challenge-spot__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      `,
    )
    .join("");
}

async function loadChallengeViewModel(id, c) {
  const spots = c.spots ?? [];
  const title = c.title || "Hunt";
  const area = c.areaLabel || "NYC";
  const mins = c.timeLimitMinutes ?? "?";
  const huntAnchor = resolveHuntAnchor(c);
  const hasPriorWin = auth.currentUser
    ? await userHasWonChallenge(auth.currentUser.uid, id).catch(() => false)
    : false;
  const favorited = auth.currentUser
    ? await isHuntFavorited(id).catch(() => false)
    : false;

  return {
    area,
    c,
    favorited,
    hasPriorWin,
    huntAnchor,
    huntHint: String(c.huntHint || ""),
    id,
    mins,
    spots,
    stopsCount: spots.length,
    title,
  };
}

function challengePageHtml(vm) {
  const favClass = vm.favorited ? "challenge-fav is-favorited" : "challenge-fav";
  const favLabel = vm.favorited ? "Unfavorite hunt" : "Favorite hunt";
  const favIcon = vm.favorited ? "★" : "☆";
  const thumbUrl = vm.spots?.[0]?.imageUrl || "";
  const heroStyle = thumbUrl
    ? ` style="background-image:url('${escapeHtml(thumbUrl)}')"`
    : "";
  const titleStack = escapeHtml(vm.title).split(/\s+/).filter(Boolean).join("<br/>");
  const mapSection = challengeMapSectionHtml(vm.huntAnchor);
  const spotsHtml = challengeSpotsHtml(vm.spots);
  const startLabel = vm.hasPriorWin ? "Restart hunt" : "Start hunt";
  const lede = vm.huntHint
    ? escapeHtml(vm.huntHint)
    : `${escapeHtml(vm.area)} loop. ${vm.stopsCount} checkpoint${vm.stopsCount === 1 ? "" : "s"} to capture.`;

  return `
    <div class="challenge-page">
      <div class="challenge-hero-card"${heroStyle}>
        <div class="challenge-hero-card__scrim" aria-hidden="true"></div>
        <div class="challenge-hero-card__top">
          <a href="#/" class="challenge-hero__back" aria-label="Back to all hunts">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
          </a>
          <div class="challenge-hero__chip">${vm.stopsCount} STOP${vm.stopsCount === 1 ? "" : "S"} · ${escapeHtml(String(vm.mins))} MIN</div>
        </div>
        <div class="challenge-hero-card__text">
          <div class="challenge-hero__kicker">${escapeHtml(vm.area)} · Scenic Loop</div>
          <div class="challenge-hero__title">${titleStack || escapeHtml(vm.title)}</div>
        </div>
        <div class="challenge-hero__toolbar">
          <button type="button" class="${favClass}" id="challenge-favorite-btn" aria-label="${favLabel}" title="${favLabel}" aria-pressed="${vm.favorited ? "true" : "false"}" data-challenge-id="${escapeHtml(vm.id)}">
            <span class="challenge-fav__icon" aria-hidden="true">${favIcon}</span>
          </button>
          <button type="button" class="challenge-report" aria-label="Report this hunt" title="Report" data-challenge-id="${escapeHtml(vm.id)}" data-challenge-title="${escapeHtml(vm.title)}">\u26A0\uFE0E</button>
        </div>
      </div>

      <div class="challenge-stats">
        <div class="challenge-stat challenge-stat--peach">
          <div class="challenge-stat__v">${escapeHtml(String(vm.mins))}</div>
          <div class="challenge-stat__k">min</div>
        </div>
        <div class="challenge-stat challenge-stat--mint">
          <div class="challenge-stat__v">${vm.stopsCount}</div>
          <div class="challenge-stat__k">stops</div>
        </div>
        <div class="challenge-stat challenge-stat--mustard">
          <div class="challenge-stat__v">+50</div>
          <div class="challenge-stat__k">merits</div>
        </div>
      </div>

      <div class="challenge-body">
        <h2 class="challenge-section-title">The Route</h2>
        <p class="challenge-lede">${lede}</p>
        ${mapSection}
        <h2 class="challenge-section-title">Checkpoints</h2>
        <div class="challenge-spots">${spotsHtml}</div>
        <div id="challenge-status" class="challenge-status-slot"></div>
        <a href="#/hunt-review/${escapeHtml(vm.id)}" class="btn btn-secondary btn-block challenge-review-btn" aria-label="Review photos from this hunt">Review — photos from this hunt</a>
      </div>

      <div class="challenge-cta-dock">
        <button type="button" class="btn btn-primary btn-block challenge-start-btn" id="start-hunt">
          <span>${escapeHtml(startLabel)}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
        </button>
      </div>
    </div>
  `;
}

function updateFavoriteButton(favBtn, on) {
  favBtn.classList.toggle("is-favorited", on);
  favBtn.setAttribute("aria-pressed", on ? "true" : "false");
  const icon = favBtn.querySelector(".challenge-fav__icon");
  if (icon) icon.textContent = on ? "★" : "☆";
  favBtn.setAttribute("aria-label", on ? "Unfavorite hunt" : "Favorite hunt");
  favBtn.setAttribute("title", on ? "Unfavorite hunt" : "Favorite hunt");
}

function bindChallengeActions(vm) {
  document.getElementById("start-hunt").addEventListener("click", () => {
    const st = document.getElementById("challenge-status");
    const btn = document.getElementById("start-hunt");
    void startHuntWithGeoCheck({
      challenge: vm.c,
      challengeId: vm.id,
      statusEl: st,
      buttonEl: btn,
      loginReturnHash: `#/challenge/${vm.id}`,
      confirmRepeatWin: vm.hasPriorWin,
    });
  });

  const favBtn = document.getElementById("challenge-favorite-btn");
  favBtn?.addEventListener("click", (e) => void handleChallengeFavoriteClick(e, favBtn, vm.id));

  const reportBtn = document.querySelector(".challenge-report");
  reportBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await promptReportChallenge({
      challengeId: vm.id,
      huntTitle: vm.title,
    });
  });
}

async function handleChallengeFavoriteClick(e, favBtn, id) {
  e.preventDefault();
  e.stopPropagation();
  if (!auth.currentUser) {
    await promptGuestNeedsSignIn("Saving favorites needs a Google account.");
    return;
  }
  const on = favBtn.classList.contains("is-favorited");
  try {
    await setHuntFavorited(id, !on);
    updateFavoriteButton(favBtn, !on);
    showAppToast(!on ? "Added to Favorited." : "Removed from Favorited.");
  } catch (err) {
    showAppToast(err?.message || "Could not update favorites.");
  }
}

export async function render(id) {
  await loadChallengeDeps();
  destroyChallengeMap();
  await renderAppShell('<p class="loading">Loading hunt…</p>', "hunts");

  try {
    const c = await getChallenge(id);
    if (!c) {
      await renderAppShell(
        challengeErrorHtml("This hunt was not found."),
        "hunts",
      );
      return;
    }

    const vm = await loadChallengeViewModel(id, c);

    await renderAppShell(
      challengePageHtml(vm),
      "hunts",
    );

    if (vm.huntAnchor && window.L) {
      mountChallengeStartMap(vm.huntAnchor);
    }
    bindChallengeActions(vm);
  } catch (err) {
    await renderAppShell(
      challengeErrorHtml(err.message),
      "hunts",
    );
  }
}

export function cleanup() {
  if (destroyChallengeMap) destroyChallengeMap();
}
