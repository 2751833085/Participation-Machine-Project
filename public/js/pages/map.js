/**
 * Map page — Leaflet map of Manhattan hunt activity.
 */

import { renderShell } from "../components/shell.js";
import { escapeHtml } from "../lib/utils.js";
import { effectiveTheme } from "../lib/state.js";
import {
  MANHATTAN_BOUNDS,
  inferManhattanPoint,
  watchChallenges,
} from "../services/challenges.js";

let listUnsub = null;
let manhattanMap = null;
let manhattanMarkersLayer = null;

function buildMapMarkerHtml(spotsCount) {
  return `<div class="city-blip"><span>${spotsCount}</span></div>`;
}

export function render() {
  renderShell(
    `
    <section class="hero">
      <p class="hero-eyebrow">Live city map</p>
      <h1 class="hero-title">Manhattan hunt activity</h1>
      <p class="lead hero-lead">Interactive hunt map inspired by city alert apps. Scope is Manhattan only.</p>
    </section>
    <section class="section">
      <div class="map-wrap card">
        <div id="hunt-map" class="hunt-map"></div>
      </div>
      <p class="card-meta" style="margin-top:0.75rem;">Showing hunts we can locate in Manhattan from challenge area labels.</p>
    </section>
  `,
    "map",
  );

  const mapNode = document.getElementById("hunt-map");
  if (!window.L || !mapNode) {
    mapNode.innerHTML =
      '<div class="status-banner error">Map library failed to load.</div>';
    return;
  }

  const theme = effectiveTheme();
  const tileUrl =
    theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  manhattanMap = window.L.map("hunt-map", {
    zoomControl: true,
    minZoom: 11,
    maxZoom: 18,
    maxBounds: MANHATTAN_BOUNDS,
    maxBoundsViscosity: 1.0,
  }).fitBounds(MANHATTAN_BOUNDS);

  window.L.tileLayer(tileUrl, {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
    subdomains: "abcd",
  }).addTo(manhattanMap);

  listUnsub = watchChallenges(120, (snap) => {
    if (!manhattanMap) return;
    if (manhattanMarkersLayer) {
      manhattanMarkersLayer.remove();
    }
    manhattanMarkersLayer = window.L.layerGroup().addTo(manhattanMap);
    snap.docs.forEach((d) => {
      const c = d.data();
      const p = inferManhattanPoint(c);
      if (!p) return;
      const spots = c.spots?.length ?? 0;
      const icon = window.L.divIcon({
        className: "city-blip-icon",
        html: buildMapMarkerHtml(spots || 1),
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const marker = window.L.marker([p.lat, p.lng], { icon }).addTo(
        manhattanMarkersLayer,
      );
      marker.bindPopup(
        `<strong>${escapeHtml(c.title || "Untitled hunt")}</strong><br>${escapeHtml(c.areaLabel || "Manhattan")}<br><a href="#/challenge/${d.id}">Open hunt</a>`,
      );
    });
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
}
