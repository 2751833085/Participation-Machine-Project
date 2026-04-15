/**
 * Challenge detail page — preview checkpoints + start hunt button.
 */

import { auth } from "../firebase-init.js";
import { renderShell } from "../components/shell.js";
import { escapeHtml } from "../lib/utils.js";
import { nav } from "../lib/router.js";
import { effectiveTheme, saveAuthReturn } from "../lib/state.js";
import {
  assertWithinRadius,
  getGeoPosition,
  START_HUNT_MAX_DISTANCE_M,
} from "../lib/geo-hunt-rules.js";
import { createAttempt, userHasWonChallenge } from "../services/attempts.js";
import {
  getChallenge,
  huntStartAnchorCoords,
} from "../services/challenges.js";

const MAP_MAX_ZOOM = 20;
/** Keep some street context around the 150 m circle. */
const CHALLENGE_MAP_MAX_ZOOM = 16;

let challengeMapCleanup = null;

function tileUrlForTheme() {
  return effectiveTheme() === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
}

function presenceIcon(kind) {
  return window.L.divIcon({
    className: `map-presence map-presence--${kind}`,
    html: '<span class="map-presence-pulse" aria-hidden="true"></span><span class="map-presence-core" aria-hidden="true"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function destroyChallengeMap() {
  if (challengeMapCleanup) {
    challengeMapCleanup();
    challengeMapCleanup = null;
  }
}

/**
 * Map is framed on the hunt anchor + 150 m circle. Player (green) is shown only if
 * the current fix lies inside the visible bounds (off-screen = hidden).
 */
function mountChallengeStartMap(anchor) {
  const host = document.getElementById("challenge-start-map-host");
  const mapEl = document.getElementById("challenge-start-map");
  const refreshBtn = document.getElementById("challenge-map-refresh");
  if (!host || !mapEl || !window.L) return;

  const L = window.L;
  let map = null;
  let playerMarker = null;
  let refreshing = false;

  map = L.map(mapEl, {
    zoomControl: false,
    attributionControl: false,
    maxZoom: MAP_MAX_ZOOM,
  });

  /* Leaflet needs a real view + non-zero container before fitBounds / getBounds
   * (otherwise layerPointToLatLng can run against an undefined map state). */
  map.setView([anchor.lat, anchor.lng], 15, { animate: false });

  L.control.zoom({ position: "topright" }).addTo(map);

  L.tileLayer(tileUrlForTheme(), {
    attribution: "",
    subdomains: "abcd",
    maxZoom: MAP_MAX_ZOOM,
    maxNativeZoom: MAP_MAX_ZOOM,
  }).addTo(map);

  const zoneAccent = "#e6b847";
  const huntCircle = L.circle([anchor.lat, anchor.lng], {
    radius: START_HUNT_MAX_DISTANCE_M,
    color: zoneAccent,
    weight: 2,
    opacity: 0.85,
    fillColor: zoneAccent,
    fillOpacity: 0.12,
    interactive: false,
  }).addTo(map);

  L.marker([anchor.lat, anchor.lng], {
    icon: presenceIcon("checkpoint"),
    interactive: false,
    keyboard: false,
  }).addTo(map);

  function fitHuntFrame() {
    if (!map?.getContainer?.()) return;
    const sz = map.getSize();
    if (!sz || sz.x < 8 || sz.y < 8) return;
    map.invalidateSize({ animate: false });
    try {
      map.fitBounds(huntCircle.getBounds(), {
        padding: [28, 28],
        maxZoom: CHALLENGE_MAP_MAX_ZOOM,
        animate: false,
      });
    } catch {
      map.setView([anchor.lat, anchor.lng], CHALLENGE_MAP_MAX_ZOOM, {
        animate: false,
      });
    }
  }

  function syncPlayerMarker(pos) {
    if (!map || !pos) return;
    const ll = L.latLng(pos.lat, pos.lng);
    if (!Number.isFinite(ll.lat) || !Number.isFinite(ll.lng)) return;
    let bounds;
    try {
      const sz = map.getSize();
      if (!sz || sz.x < 8 || sz.y < 8) return;
      bounds = map.getBounds();
    } catch {
      return;
    }
    if (!bounds?.contains) return;
    if (!bounds.contains(ll)) {
      if (playerMarker) {
        playerMarker.remove();
        playerMarker = null;
      }
      return;
    }
    if (!playerMarker) {
      playerMarker = L.marker(ll, {
        icon: presenceIcon("player"),
        interactive: false,
        keyboard: false,
      }).addTo(map);
    } else {
      playerMarker.setLatLng(ll);
    }
  }

  async function refreshPlayerLocation() {
    if (!map || refreshing) return;
    refreshing = true;
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.classList.add("is-busy");
    }
    try {
      const pos = await getGeoPosition({ maximumAge: 0 });
      syncPlayerMarker({ lat: pos.lat, lng: pos.lng });
    } catch {
      if (playerMarker) {
        playerMarker.remove();
        playerMarker = null;
      }
    } finally {
      refreshing = false;
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.classList.remove("is-busy");
      }
    }
  }

  map.whenReady(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!map) return;
        fitHuntFrame();
        void refreshPlayerLocation();
      });
    });
  });

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => void refreshPlayerLocation());
  }

  challengeMapCleanup = () => {
    if (map) {
      map.remove();
      map = null;
    }
    playerMarker = null;
  };
}

export async function render(id) {
  destroyChallengeMap();
  renderShell('<p class="loading">Loading hunt…</p>', "hunts");

  try {
    const c = await getChallenge(id);
    if (!c) {
      renderShell(
        '<div class="page-narrow"><div class="status-banner error">This hunt was not found.</div><p><a href="#/" class="back-link">← All hunts</a></p></div>',
        "hunts",
      );
      return;
    }

    let huntAnchor = null;
    try {
      huntAnchor = huntStartAnchorCoords(c);
    } catch {
      huntAnchor = null;
    }

    const spots = c.spots ?? [];
    const huntHintBlock = c.huntHint
      ? `<p class="card-meta hunt-challenge-hint"><strong>Hunt hint:</strong> ${escapeHtml(String(c.huntHint))}</p>`
      : "";

    const mapSection =
      huntAnchor && window.L
        ? `
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
        <p class="challenge-start-map-note card-meta">Yellow = hunt start · green = you (only if you’re inside this map view) · ring = ${START_HUNT_MAX_DISTANCE_M} m to start</p>
      </div>
    `
        : huntAnchor
          ? `<p class="card-meta challenge-start-map-fallback">Map preview unavailable.</p>`
          : `<p class="card-meta challenge-start-map-fallback">Map preview unavailable for this hunt.</p>`;

    const spotsHtml = spots
      .map(
        (s, i) => `
      <div class="spot-check">
        <img src="${escapeHtml(s.imageUrl)}" alt="Checkpoint ${i + 1}" loading="lazy" />
        <div class="body">
          <strong>Checkpoint ${i + 1}</strong>
          ${s.hint ? `<p class="card-meta">${escapeHtml(s.hint)}</p>` : ""}
        </div>
      </div>
    `,
      )
      .join("");

    let hasPriorWin = false;
    if (auth.currentUser) {
      try {
        hasPriorWin = await userHasWonChallenge(auth.currentUser.uid, id);
      } catch {
        hasPriorWin = false;
      }
    }
    const startLabel = hasPriorWin ? "Restart hunt" : "Start hunt";

    renderShell(
      `
      <a href="#/" class="back-link">← All hunts</a>
      <div class="two-col-desktop challenge-detail-layout">
        <div class="challenge-detail-main">
          <span class="badge">${spots.length} checkpoint${spots.length === 1 ? "" : "s"} · ${c.timeLimitMinutes} min</span>
          <h1 class="h1" style="margin-top:0.5rem;">${escapeHtml(c.title || "Hunt")}</h1>
          <p class="lead" style="margin-bottom:1rem;">${escapeHtml(c.areaLabel || "NYC")}</p>
          ${huntHintBlock}
          ${mapSection}
          <div class="challenge-cta-stack">
            <button type="button" class="btn btn-primary btn-block challenge-start-btn" id="start-hunt">${escapeHtml(startLabel)}</button>
            <a href="#/hunt-review/${escapeHtml(id)}" class="btn btn-secondary btn-block challenge-review-btn" aria-label="Review photos from this hunt (回顾)">Review — photos from this hunt</a>
          </div>
          <div id="challenge-status"></div>
        </div>
        <div class="card challenge-checkpoints-card">${spotsHtml}</div>
      </div>
    `,
      "hunts",
    );

    if (huntAnchor && window.L) {
      mountChallengeStartMap(huntAnchor);
    }

    document
      .getElementById("start-hunt")
      .addEventListener("click", async () => {
        const st = document.getElementById("challenge-status");
        const btn = document.getElementById("start-hunt");
        if (!auth.currentUser) {
          saveAuthReturn(`#/challenge/${id}`);
          nav("#/login");
          return;
        }
        if (hasPriorWin) {
          const ok = window.confirm(
            "You've already completed this hunt once. Do you want to complete it again?",
          );
          if (!ok) return;
        }
        btn.disabled = true;
        try {
          st.innerHTML =
            '<div class="status-banner info">Checking you are at the hunt…</div>';
          const anchor = huntStartAnchorCoords(c);
          const pos = await getGeoPosition();
          assertWithinRadius(
            pos.lat,
            pos.lng,
            anchor.lat,
            anchor.lng,
            START_HUNT_MAX_DISTANCE_M,
            "the hunt start point",
          );
          st.innerHTML = "";
          const attemptId = await createAttempt(
            id,
            c.timeLimitMinutes,
          );
          nav(`#/run/${attemptId}`);
        } catch (err) {
          st.innerHTML = `<div class="status-banner error">${escapeHtml(err.message)}</div>`;
          btn.disabled = false;
        }
      });
  } catch (err) {
    renderShell(
      `<div class="page-narrow"><div class="status-banner error">${escapeHtml(err.message)}</div><p><a href="#/" class="back-link">← All hunts</a></p></div>`,
      "hunts",
    );
  }
}

export function cleanup() {
  destroyChallengeMap();
}
