/**
 * Map page — Leaflet map of Manhattan hunt activity.
 *
 * Rewritten in the Neo Claude Design idiom. Fullscreen Leaflet with a
 * floating chip row at the top and a nearby-hunts bottom sheet styled
 * as a Neo card (chunky radius + flat offset shadow + Barlow Condensed
 * heading). Leaflet init, tile url theming, marker rendering, and the
 * watchChallenges subscription are preserved.
 */


import { escapeHtml } from "./page-html.js";
import { renderAppShell } from "./page-shell.js";
const STATE_PATH = "../lib/state.js";
const CHALLENGES_PATH = "../services/challenges.js";

let effectiveTheme;
let MANHATTAN_BOUNDS;
let inferManhattanPoint;
let watchChallenges;
let mapDepsPromise;

async function loadMapDeps() {
  if (!mapDepsPromise) {
    mapDepsPromise = Promise.all([
      import(STATE_PATH),
      import(CHALLENGES_PATH),
    ]).then(([state, challenges]) => {
      effectiveTheme = state.effectiveTheme;
      MANHATTAN_BOUNDS = challenges.MANHATTAN_BOUNDS;
      inferManhattanPoint = challenges.inferManhattanPoint;
      watchChallenges = challenges.watchChallenges;
    });
  }
  return mapDepsPromise;
}

let listUnsub = null;
let manhattanMap = null;
let manhattanMarkersLayer = null;
let mapSheetEl = null;
let mapCountEl = null;

function buildMapMarkerHtml(spotsCount) {
  return `<div class="city-blip"><span>${spotsCount}</span></div>`;
}

function paintSheet(docs) {
  if (!mapSheetEl) return;
  if (mapCountEl) {
    mapCountEl.textContent = `${docs.length} LOCATED`;
  }
  if (!docs.length) {
    mapSheetEl.innerHTML = `<p class="map-sheet-empty">No hunts located on the map yet.</p>`;
    return;
  }
  mapSheetEl.innerHTML = docs
    .map((d) => {
      const c = d.data();
      const title = escapeHtml(c.title || "Untitled hunt");
      const area = escapeHtml(c.areaLabel || "Manhattan");
      const spots = Array.isArray(c.spots) ? c.spots.length : 0;
      const mins = c.timeLimitMinutes ?? "?";
      return `
      <a class="map-sheet-row" href="#/challenge/${encodeURIComponent(d.id)}">
        <span class="map-sheet-row-body">
          <span class="map-sheet-row-meta">${spots} checkpoints · ${escapeHtml(String(mins))} min</span>
          <span class="map-sheet-row-title">${title}</span>
          <span class="map-sheet-row-area">${area}</span>
        </span>
        <span class="map-sheet-row-chev" aria-hidden="true">›</span>
      </a>`;
    })
    .join("");
}

export async function render() {
  await loadMapDeps();
  await renderAppShell(mapPageHtml(), "map");
  captureMapDomRefs();
  const mapNode = document.getElementById("hunt-map");
  if (!ensureMapLibrary(mapNode)) return;
  manhattanMap = createManhattanMap();
  addMapTiles(manhattanMap);
  listUnsub = watchChallenges(120, paintMapChallenges);
}

function mapPageHtml() {
  return `
    <div class="map-page">
      <div class="map-surface">
        <div id="hunt-map" class="map-canvas"></div>
        ${mapTopHtml()}
        ${mapSheetHtml()}
      </div>
    </div>
  `;
}

function mapTopHtml() {
  return `
    <div class="map-top">
      <a href="#/" class="map-top-back" aria-label="Back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </a>
      <div class="map-chip-row" role="group" aria-label="Map filters">
        <span class="ds-chip map-chip is-active">Manhattan</span>
        <span class="ds-chip map-chip">Live</span>
        <span class="ds-chip map-chip">Nearby</span>
      </div>
    </div>`;
}

function mapSheetHtml() {
  return `
    <aside class="map-sheet ds-card" aria-label="Hunts on this map">
      <div class="map-sheet-grip" aria-hidden="true"></div>
      <header class="map-sheet-head">
        <div>
          <p class="ds-kicker map-sheet-kicker">Live city map</p>
          <h2 class="map-sheet-title">Manhattan<br /><span class="map-sheet-title-accent">hunts nearby.</span></h2>
        </div>
        <span class="map-sheet-count" id="map-sheet-count">— LOCATED</span>
      </header>
      <div class="map-sheet-list" id="map-sheet-list">
        <p class="map-sheet-empty">Loading hunts…</p>
      </div>
    </aside>`;
}

function captureMapDomRefs() {
  mapSheetEl = document.getElementById("map-sheet-list");
  mapCountEl = document.getElementById("map-sheet-count");
}

function ensureMapLibrary(mapNode) {
  if (window.L && mapNode) return true;
  if (mapNode) {
    mapNode.innerHTML =
      '<div class="status-banner error">Map library failed to load.</div>';
  }
  return false;
}

function tileUrlForTheme() {
  return effectiveTheme() === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
}

function createManhattanMap() {
  return window.L.map("hunt-map", {
    zoomControl: true,
    minZoom: 11,
    maxZoom: 18,
    maxBounds: MANHATTAN_BOUNDS,
    maxBoundsViscosity: 1.0,
  }).fitBounds(MANHATTAN_BOUNDS);
}

function addMapTiles(map) {
  window.L.tileLayer(tileUrlForTheme(), {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
    subdomains: "abcd",
  }).addTo(map);
}

function paintMapChallenges(snap) {
  if (!manhattanMap) return;
  resetMarkersLayer();
  const locatedDocs = [];
  snap.docs.forEach((d) => addChallengeMarker(d, locatedDocs));
  paintSheet(locatedDocs);
}

function resetMarkersLayer() {
  if (manhattanMarkersLayer) manhattanMarkersLayer.remove();
  manhattanMarkersLayer = window.L.layerGroup().addTo(manhattanMap);
}

function addChallengeMarker(d, locatedDocs) {
  const c = d.data();
  const p = inferManhattanPoint(c);
  if (!p) return;
  locatedDocs.push(d);
  const marker = window.L.marker([p.lat, p.lng], {
    icon: huntMarkerIcon(c.spots?.length ?? 0),
  }).addTo(manhattanMarkersLayer);
  marker.bindPopup(
    `<strong>${escapeHtml(c.title || "Untitled hunt")}</strong><br>${escapeHtml(c.areaLabel || "Manhattan")}<br><a href="#/challenge/${d.id}">Open hunt</a>`,
  );
}

function huntMarkerIcon(spots) {
  return window.L.divIcon({
    className: "city-blip-icon",
    html: buildMapMarkerHtml(spots || 1),
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export function cleanup() {
  if (listUnsub) {
    listUnsub();
    listUnsub = null;
  }
  if (manhattanMap) {
    manhattanMap.remove();
    manhattanMap = null;
  }
  manhattanMarkersLayer = null;
  mapSheetEl = null;
  mapCountEl = null;
}
