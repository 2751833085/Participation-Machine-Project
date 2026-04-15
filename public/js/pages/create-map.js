/**
 * Create hunt — search first; picking a result opens map + form together.
 * Checkpoint is a read-only ~48 m zone on the map (no tap / drag / zoom); change via search or area field.
 */

import { auth } from "../firebase-init.js";
import { renderShell } from "../components/shell.js";
import {
  openAlertModal,
  openConfirmModal,
  showPublishSuccessOverlay,
} from "../components/modal.js";
import { escapeHtml } from "../lib/utils.js";
import { nav } from "../lib/router.js";
import { effectiveTheme, saveAuthReturn } from "../lib/state.js";
import {
  GEO_RESTRICT_MANHATTAN,
  REQUIRE_PHOTO_GPS_PROOF,
} from "../lib/geo-flags.js";
import { ensureUser } from "../services/auth.js";
import {
  MANHATTAN_BOUNDS,
  createChallenge,
  pointInManhattan,
} from "../services/challenges.js";
import {
  AREA_PIN_MISMATCH_METERS,
  haversineMeters,
  nearestNeighborhoodPicks,
  reverseGeocodeLabel,
  randomManhattanLandmarkSuggestions,
  searchPlacesWithManhattanFlag,
} from "../services/geocoding.js";
import * as loginPage from "./login.js";

let mapCleanup = null;

const PREVIEW_MAX_ZOOM = 11;
/** Carto raster tiles + placement view — street-level (block / labels readable on phone). */
const MAP_MAX_ZOOM = 20;
const AREA_SEARCH_DEBOUNCE_MS = 420;
const TOOLBAR_SEARCH_DEBOUNCE_MS = 450;
/** Quick-pick chips under Area / neighborhood from the checkpoint coordinates. */
const AREA_PIN_CHIP_COUNT = 6;
/** Green map dots while a checkpoint is set (user may switch among them + “You are here”). */
const MAP_SUGGESTION_MARKER_CAP = 8;
/** First N chip / merge slots prioritize neighborhoods nearest the last GPS fix (“Use my location”). */
const NEAR_USER_CHIP_PRIORITY = 3;
/** Visual only (not stored) — compact checkpoint aura shown while placing a checkpoint. */
const CHECKPOINT_RADIUS_M = 20;
/** Fixed “scale” for checkpoint preview (like pinch-zoomed in); not container height. */
const SELECTION_TARGET_ZOOM = 17;
const FOLLOW_FLY_EASE = 0.22;
const PIN_PAN_ABOVE_SHEET_SEC = 0.48;
/** Keep centered horizontally; only nudge vertically above the sheet. */
const PIN_SCREEN_Y_FRAC = 0.42;

const MANHATTAN_ONLY_TITLE = "Manhattan only";
const MANHATTAN_ONLY_BODY =
  "This app only supports hunts on the island of Manhattan. Pick a Manhattan search result or a green suggestion near your location.";

function tileUrlForTheme() {
  const theme = effectiveTheme();
  return theme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
}

function themeAccentColor() {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();
  return v || "#c4a574";
}

function setStatus(el, html) {
  if (el) el.innerHTML = html;
}

function isCoarsePointer() {
  return window.matchMedia("(pointer: coarse)").matches;
}

export function render() {
  if (!auth.currentUser) {
    saveAuthReturn("#/create/classic");
    loginPage.render();
    return;
  }

  const listingRunProofNote = REQUIRE_PHOTO_GPS_PROOF
    ? "live-hunt proof is enforced when players run the hunt"
    : "checkpoint GPS proof is temporarily off during runs";

  renderShell(
    `
    <div class="page-narrow create-map-page">
      <section class="hero" aria-labelledby="create-map-hero-title">
        <p class="hero-eyebrow">Photo scavenger hunts</p>
        <h1 class="hero-title" id="create-map-hero-title">Create a hunt</h1>
        <p class="lead hero-lead">
          Pick a <strong>Manhattan</strong> address or landmark — or leave the field empty and tap <strong>Search</strong> for curated spots (tap again to shuffle). Choose a result to open the map and checkpoint details.
        </p>
      </section>
      <section class="section create-map-search-section" aria-labelledby="create-map-search-heading">
        <h2 id="create-map-search-heading" class="section-title">Search Manhattan</h2>
        <div id="create-map-status"></div>
        <div class="card create-map-toolbar">
        <div class="create-map-toolbar-row">
          <input type="search" id="create-map-search-q" class="input-grow" placeholder="Place name, or leave blank + Search" autocomplete="street-address" aria-label="Search Manhattan address" />
          <button type="button" class="btn btn-primary" id="create-map-search-btn">Search</button>
        </div>
        <div class="create-map-toolbar-row create-map-toolbar-row--full">
          <button type="button" class="btn btn-ghost create-map-locate-full" id="create-map-locate-btn">Use my location</button>
        </div>
        <div id="create-map-results" class="create-map-results" hidden></div>
      </div>
      </section>
    </div>
    <div id="create-map-fs" class="create-map-fs" hidden>
      <div id="create-map-checkpoint-scroll" class="create-map-checkpoint-scroll">
      <header class="create-map-fs-top">
        <button type="button" class="btn btn-ghost create-map-shrink-btn" id="create-map-shrink">Back</button>
        <span class="create-map-fs-title">Map &amp; checkpoint</span>
        <span class="create-map-fs-spacer" aria-hidden="true"></span>
      </header>
      <p class="create-map-fs-hint" id="create-map-fs-hint"></p>
      <div id="create-map-fs-map-host" class="create-map-fs-map-host">
        <div id="create-hunt-map" class="create-hunt-map" role="application" aria-label="Manhattan map"></div>
      </div>
    <div id="create-map-sheet" class="create-map-sheet create-map-sheet--before-pin" aria-hidden="true">
      <div class="create-map-sheet-inner create-map-sheet-panel" id="create-map-sheet-panel">
        <header class="sheet-head">
          <div class="sheet-head-main">
            <div class="sheet-head-text">
              <p class="sheet-kicker">Checkpoint</p>
              <h2 class="sheet-title">Photo &amp; hunt details</h2>
            </div>
          </div>
        </header>
        <p class="sheet-coords" id="create-map-coords-line"></p>

        <label class="photo-drop">
          <span class="photo-drop-preview" id="create-map-photo-preview" hidden></span>
          <span class="photo-drop-empty" id="create-map-photo-empty">
            <span class="photo-drop-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </span>
            <strong class="photo-drop-title">Checkpoint photo</strong>
            <span class="photo-drop-sub">JPEG / PNG / WebP / HEIC — any photo you like for the listing (${listingRunProofNote}).</span>
          </span>
          <input type="file" id="create-map-photo" name="photo" class="photo-drop-input" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required />
        </label>

        <form id="create-map-form" class="sheet-form stack">
          <div class="form-field sheet-field">
            <label for="create-map-title">Title</label>
            <input id="create-map-title" name="title" type="text" required maxlength="80" placeholder="Union Square sprint" />
          </div>
          <div class="form-field sheet-field">
            <label for="create-map-area">Area / neighborhood</label>
            <p class="field-hint" id="area-field-hint" hidden>Type to search Manhattan, or tap a suggestion from your pin. Leave blank and we’ll pick the closest neighborhood when you publish.</p>
            <div class="area-combobox-wrap" id="area-combobox-wrap">
              <input
                type="text"
                id="create-map-area"
                name="area"
                autocomplete="off"
                maxlength="80"
                placeholder="Nearby suggestions · type to search"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded="false"
                aria-controls="area-suggest-list"
              />
              <ul class="area-suggest-list" id="area-suggest-list" role="listbox" hidden></ul>
            </div>
            <div class="area-pin-suggest" id="area-pin-suggest" hidden>
              <p class="area-pin-suggest__title">Suggested from map pin</p>
              <div class="area-pin-suggest__chips" id="area-pin-suggest-chips"></div>
              <p class="area-pin-suggest__hint">Tap one or edit the field. If you leave it empty, we use the closest match when you publish.</p>
            </div>
          </div>
          <div class="form-field sheet-field">
            <label for="create-map-challenge-hint">Whole hunt hint <span class="label-optional">(optional)</span></label>
            <input id="create-map-challenge-hint" name="challengeHint" type="text" maxlength="300" placeholder="Optional clue for the entire hunt" />
          </div>
          <div class="form-field sheet-field">
            <div class="time-slider-label-row">
              <label for="create-map-minutes">Time limit</label>
              <output class="time-slider-out" id="create-map-minutes-out" for="create-map-minutes">30 min</output>
            </div>
            <input type="range" id="create-map-minutes" name="minutes" class="time-slider" min="5" max="60" step="1" value="30" required />
            <div class="time-slider-ticks" aria-hidden="true"><span>5 min</span><span>60 min</span></div>
          </div>
          <div class="form-field sheet-field">
            <label for="create-map-hint">Hint <span class="label-optional">(optional)</span></label>
            <input id="create-map-hint" name="hint" type="text" placeholder="Street or landmark clue" />
          </div>
          <button type="submit" class="btn btn-primary btn-block sheet-submit" id="create-map-submit">Publish hunt</button>
        </form>
      </div>
    </div>
      </div>
    </div>
  `,
    "create",
  );

  const statusEl = document.getElementById("create-map-status");
  const mapEl = document.getElementById("create-hunt-map");
  const sheet = document.getElementById("create-map-sheet");
  const checkpointScroll = document.getElementById("create-map-checkpoint-scroll");
  const resultsEl = document.getElementById("create-map-results");
  const searchInput = document.getElementById("create-map-search-q");
  const coordsLine = document.getElementById("create-map-coords-line");
  const areaInput = document.getElementById("create-map-area");
  const areaSuggestList = document.getElementById("area-suggest-list");
  const areaComboboxWrap = document.getElementById("area-combobox-wrap");
  const areaPinSuggest = document.getElementById("area-pin-suggest");
  const areaPinSuggestChips = document.getElementById("area-pin-suggest-chips");
  const form = document.getElementById("create-map-form");
  const fsEl = document.getElementById("create-map-fs");
  const fsHint = document.getElementById("create-map-fs-hint");
  const photoInput = document.getElementById("create-map-photo");
  const photoEmpty = document.getElementById("create-map-photo-empty");
  const photoPreviewEl = document.getElementById("create-map-photo-preview");
  const sheetPanel = document.getElementById("create-map-sheet-panel");
  const areaFieldHint = document.getElementById("area-field-hint");
  const minutesRange = document.getElementById("create-map-minutes");
  const minutesOut = document.getElementById("create-map-minutes-out");

  if (!window.L || !mapEl) {
    setStatus(
      statusEl,
      '<div class="status-banner error">Map failed to load. Refresh the page.</div>',
    );
    return;
  }

  function onCheckpointScroll() {
    if (map) map.invalidateSize({ animate: false });
  }
  if (checkpointScroll) {
    checkpointScroll.addEventListener("scroll", onCheckpointScroll, {
      passive: true,
    });
  }

  let selected = null;
  let selectedSource = null;
  let selectRadiusCircle = null;
  let checkpointCenterMarker = null;
  let playerMarker = null;
  let placementActive = false;
  let photoObjectUrl = null;
  /** Last place chosen from area suggestions (for distance checks). */
  let lastAreaPick = null;
  let areaSearchTimer = null;
  let toolbarSearchTimer = null;
  let areaBlurTimer = null;
  /** True while flyTo selection runs — avoids centerPinAboveSheet calling map.stop() mid-flight. */
  let selectionFlyActive = false;
  /** Last Manhattan GPS from “Use my location” — drives chip order + optional “You are here” marker. */
  let lastPlayerLatLng = null;

  let map = null;
  let searchLayer = null;
  let suggestLayer = null;
  let playerLayer = null;
  function mapPinReadOnly() {
    return placementActive && selected;
  }

  function clearCheckpointVisuals() {
    if (selectRadiusCircle) {
      selectRadiusCircle.remove();
      selectRadiusCircle = null;
    }
    if (checkpointCenterMarker) {
      checkpointCenterMarker.remove();
      checkpointCenterMarker = null;
    }
  }

  function clearPlayerVisuals() {
    if (playerMarker) {
      playerMarker.remove();
      playerMarker = null;
    }
  }

  function presenceIcon(kind) {
    return window.L.divIcon({
      className: `map-presence map-presence--${kind}`,
      html: '<span class="map-presence-pulse" aria-hidden="true"></span><span class="map-presence-core" aria-hidden="true"></span>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }

  /** Wait for layout + invalidateSize before focusing the map. */
  function afterExpandedMapLayout(callback) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(callback, 72);
      });
    });
  }

  /**
   * Street-scale view on the checkpoint (fixed zoom — like user pinch-zoomed the map).
   * We use setView, not fitBounds on the 48 m circle: fitBounds often stays too wide in a short strip.
   */
  function focusMapOnPin(lat, lng, onDone) {
    if (!map) return;
    map.stop?.();
    selectionFlyActive = false;
    map.invalidateSize({ animate: false });
    const z = Math.min(SELECTION_TARGET_ZOOM, map.getMaxZoom());
    map.setView([lat, lng], z, { animate: false });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (onDone) onDone();
      });
    });
  }

  /** Re-apply detail zoom after the bottom sheet changes visible map height (invalidateSize alone keeps old zoom). */
  function lockCheckpointDetailZoom() {
    if (!map || !selected) return;
    map.invalidateSize({ animate: false });
    const z = Math.min(SELECTION_TARGET_ZOOM, map.getMaxZoom());
    map.setView([selected.lat, selected.lng], z, { animate: false });
  }

  function setAreaListOpen(open) {
    areaInput.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function hideAreaSuggest() {
    areaSuggestList.hidden = true;
    areaSuggestList.innerHTML = "";
    setAreaListOpen(false);
  }

  function showAreaFieldHint() {
    if (areaFieldHint) areaFieldHint.hidden = false;
  }

  function hideAreaFieldHint() {
    if (areaFieldHint) areaFieldHint.hidden = true;
  }

  /** Center the pin vertically in the map strip (form scrolls with the map — no overlay crop). */
  function centerPinAboveSheet() {
    if (!map) return;
    if (!selected || !placementActive || !sheet.classList.contains("is-open"))
      return;
    if (selectionFlyActive) return;
    const mapRect = map.getContainer().getBoundingClientRect();
    const mapH = map.getSize().y;
    if (Math.abs(mapRect.height - mapH) > 2) {
      map.invalidateSize({ animate: false });
    }
    const visibleH = Math.max(96, mapH);
    const targetY = visibleH * 0.48;
    const pinPt = map.latLngToContainerPoint([selected.lat, selected.lng]);
    const panDy = pinPt.y - targetY;
    if (Math.abs(panDy) < 3) return;
    if (typeof map.stop === "function") map.stop();
    map.panBy([0, panDy], {
      animate: true,
      duration: PIN_PAN_ABOVE_SHEET_SEC,
      easeLinearity: FOLLOW_FLY_EASE,
    });
  }

  function scheduleCenterPinAboveSheet(delayMs) {
    const d = delayMs != null ? delayMs : 120;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(() => centerPinAboveSheet(), d);
      });
    });
  }

  /** After the checkpoint form mounts in-flow, nudge the map (no sheet transform transition). */
  function wirePinCenterAfterSheetOpens() {
    scheduleCenterPinAboveSheet(40);
    window.setTimeout(() => centerPinAboveSheet(), 200);
    window.setTimeout(() => centerPinAboveSheet(), 480);
  }

  function syncCheckpointEntrypoints() {}

  function updateFsHint() {
    if (!fsHint) return;
    if (!placementActive) return;
    if (selected) {
      fsHint.textContent = lastPlayerLatLng
        ? `The shaded circle is your ~${CHECKPOINT_RADIUS_M} m checkpoint zone. Tap a green dot or “You are here” on the map to move it, or adjust the area field.`
        : `The shaded circle is your ~${CHECKPOINT_RADIUS_M} m checkpoint zone (from search). Adjust the area field or pick another result — map is preview-only.`;
    } else {
      fsHint.textContent = isCoarsePointer()
        ? "Drag or pinch the map · tap a green suggestion or You are here to set the checkpoint."
        : "Drag or scroll the map · tap a green suggestion or You are here to set the checkpoint.";
    }
  }

  function syncMinutesOut() {
    if (!minutesRange || !minutesOut) return;
    const v = parseInt(minutesRange.value, 10) || 30;
    minutesOut.textContent = `${v} min`;
  }
  if (minutesRange) {
    minutesRange.addEventListener("input", syncMinutesOut);
    syncMinutesOut();
  }

  function centroidDedupeKey(p) {
    return p.key || `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
  }

  /**
   * Merge neighborhood centroids: up to NEAR_USER_CHIP_PRIORITY nearest the user’s last GPS fix,
   * then fill from nearest the checkpoint (deduped). Used for chips, area dropdown, and map dots.
   */
  function buildMergedNeighborhoodList(limit) {
    if (!selected) return [];
    const pinLat = selected.lat;
    const pinLng = selected.lng;
    if (!lastPlayerLatLng) {
      return nearestNeighborhoodPicks(pinLat, pinLng, limit).map((p) => ({
        pick: p,
        nearYou: false,
      }));
    }
    const userCap = Math.min(NEAR_USER_CHIP_PRIORITY, limit);
    const userTop = nearestNeighborhoodPicks(
      lastPlayerLatLng.lat,
      lastPlayerLatLng.lng,
      userCap,
    );
    const pinPool = nearestNeighborhoodPicks(pinLat, pinLng, limit * 2);
    const seen = new Set();
    const out = [];
    for (const p of userTop) {
      const k = centroidDedupeKey(p);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ pick: p, nearYou: true });
    }
    for (const p of pinPool) {
      if (out.length >= limit) break;
      const k = centroidDedupeKey(p);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ pick: p, nearYou: false });
    }
    return out;
  }

  function nearbyAreaRows() {
    if (!selected) return [];
    return buildMergedNeighborhoodList(8).map(({ pick: p, nearYou }) => ({
      lat: p.lat,
      lng: p.lng,
      shortLabel: p.label,
      displayName: nearYou
        ? `${p.label} · near you`
        : `${p.label} · near checkpoint`,
      inManhattan: true,
    }));
  }

  /** Chip rows: full display label + coords for lastAreaPick when chosen. */
  function pinNeighborhoodChipRows() {
    if (!selected) return [];
    return buildMergedNeighborhoodList(AREA_PIN_CHIP_COUNT).map(
      ({ pick: p, nearYou }) => ({
        lat: p.lat,
        lng: p.lng,
        shortLabel: `${p.label}, Manhattan`,
        displayName: nearYou
          ? `${p.label} · near you`
          : `${p.label} · near checkpoint`,
        inManhattan: true,
      }),
    );
  }

  function renderPinAreaChips() {
    if (!areaPinSuggest || !areaPinSuggestChips) return;
    if (!selected) {
      areaPinSuggest.hidden = true;
      areaPinSuggestChips.innerHTML = "";
      return;
    }
    const rows = pinNeighborhoodChipRows();
    if (!rows.length) {
      areaPinSuggest.hidden = true;
      areaPinSuggestChips.innerHTML = "";
      return;
    }
    areaPinSuggest.hidden = false;
    areaPinSuggestChips.innerHTML = rows
      .map(
        (r, i) =>
          `<button type="button" class="area-pin-chip" data-i="${i}">${escapeHtml(r.shortLabel)}</button>`,
      )
      .join("");
    areaPinSuggestChips.querySelectorAll(".area-pin-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = parseInt(btn.dataset.i, 10);
        const row = rows[i];
        if (!row) return;
        areaInput.value = row.shortLabel;
        lastAreaPick = {
          lat: row.lat,
          lng: row.lng,
          label: row.shortLabel,
        };
        areaInput.dataset.userEdited = "1";
        hideAreaSuggest();
      });
    });
  }

  /**
   * If the area field is empty at publish time, fill from nearest named neighborhood, then reverse geocode.
   */
  async function resolveAreaLabelForPublish() {
    const trimmed = areaInput.value.trim();
    if (trimmed) return trimmed;
    if (!selected) {
      throw new Error("Choose a checkpoint on the map first.");
    }
    const near = nearestNeighborhoodPicks(selected.lat, selected.lng, 1)[0];
    if (near) {
      const label = `${near.label}, Manhattan`;
      areaInput.value = label;
      lastAreaPick = { lat: near.lat, lng: near.lng, label };
      return label;
    }
    const geo = await reverseGeocodeLabel(selected.lat, selected.lng);
    const g = String(geo || "").trim();
    if (g) {
      areaInput.value = g;
      return g;
    }
    throw new Error(
      "Add an area / neighborhood (or tap a suggestion under the field).",
    );
  }

  function renderAreaSuggestItems(rows) {
    if (!rows.length) {
      hideAreaSuggest();
      return;
    }
    areaSuggestList.innerHTML = rows
      .map(
        (r, i) => {
          const outside = r.inManhattan === false;
          return `
      <li role="option" tabindex="-1">
        <button type="button" class="area-suggest-item${outside ? " is-outside" : ""}" data-i="${i}">
          <span class="area-suggest-primary">${escapeHtml(r.shortLabel)}</span>
          ${outside ? '<span class="geo-outside-badge">Outside Manhattan — cannot select</span>' : ""}
          <span class="area-suggest-secondary">${escapeHtml(r.displayName)}</span>
        </button>
      </li>`;
        },
      )
      .join("");
    areaSuggestList.hidden = false;
    setAreaListOpen(true);
    areaSuggestList.querySelectorAll(".area-suggest-item").forEach((btn) => {
      btn.addEventListener("mousedown", (ev) => ev.preventDefault());
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const i = parseInt(btn.dataset.i, 10);
        const row = rows[i];
        if (!row) return;
        if (row.inManhattan === false) {
          await openAlertModal({
            title: MANHATTAN_ONLY_TITLE,
            message: MANHATTAN_ONLY_BODY,
            okText: "OK",
          });
          return;
        }
        await selectAreaSuggestion(row);
      });
    });
  }

  function showNearbyAreaSuggest() {
    if (!selected) return;
    renderAreaSuggestItems(nearbyAreaRows());
  }

  function scheduleAreaSearch(q) {
    if (areaSearchTimer) clearTimeout(areaSearchTimer);
    const query = q.trim();
    if (!query) {
      showNearbyAreaSuggest();
      return;
    }
    areaSearchTimer = window.setTimeout(async () => {
      areaSearchTimer = null;
      try {
        const flagged = await searchPlacesWithManhattanFlag(query);
        renderAreaSuggestItems(
          flagged.length ? flagged : nearbyAreaRows(),
        );
      } catch {
        renderAreaSuggestItems(nearbyAreaRows());
      }
    }, AREA_SEARCH_DEBOUNCE_MS);
  }

  function movePinToPlace(place) {
    const label = `${place.shortLabel}, Manhattan`;
    selected = { lat: place.lat, lng: place.lng };
    selectedSource = "search";
    areaInput.value = label;
    lastAreaPick = { lat: place.lat, lng: place.lng, label };
    areaInput.dataset.userEdited = "1";
    if (selectRadiusCircle) {
      selectRadiusCircle.setLatLng([place.lat, place.lng]);
    }
    if (checkpointCenterMarker) {
      checkpointCenterMarker.setLatLng([place.lat, place.lng]);
    }
    updateCoordsLine();
    enterPlacementMode();
    updateFsHint();
    syncCheckpointEntrypoints();
    renderPinAreaChips();
    afterExpandedMapLayout(() => {
      focusMapOnPin(place.lat, place.lng, () => {
        if (sheet.classList.contains("is-open")) {
          lockCheckpointDetailZoom();
          snapPinToReferenceFrame();
        }
        refreshPlacementSuggestionMarkers();
      });
    });
  }

  function resetAreaFieldForEdit() {
    if (areaBlurTimer) {
      clearTimeout(areaBlurTimer);
      areaBlurTimer = null;
    }
    areaInput.value = "";
    lastAreaPick = null;
    delete areaInput.dataset.userEdited;
    areaInput.focus();
    showAreaFieldHint();
    showNearbyAreaSuggest();
  }

  async function selectAreaSuggestion(place) {
    if (!selected) return;
    if (place.inManhattan === false) {
      await openAlertModal({
        title: MANHATTAN_ONLY_TITLE,
        message: MANHATTAN_ONLY_BODY,
        okText: "OK",
      });
      return;
    }
    const dist = haversineMeters(
      selected.lat,
      selected.lng,
      place.lat,
      place.lng,
    );
    const label = `${place.shortLabel}, Manhattan`;

    if (dist > AREA_PIN_MISMATCH_METERS) {
      const m = Math.round(dist);
      hideAreaSuggest();
      const ok = await openConfirmModal({
        title: "Far from your checkpoint",
        message: `This place is about ${m} m from your current checkpoint.\n\nUpdate the checkpoint to this address?`,
        confirmText: "Yes, update",
        cancelText: "No, edit address",
      });
      if (ok) {
        movePinToPlace(place);
      } else {
        resetAreaFieldForEdit();
      }
      return;
    }

    areaInput.value = label;
    lastAreaPick = { lat: place.lat, lng: place.lng, label };
    areaInput.dataset.userEdited = "1";
    hideAreaSuggest();
  }

  function onDocPointerDownCapture(e) {
    if (!areaComboboxWrap.contains(e.target)) hideAreaSuggest();
  }
  document.addEventListener("pointerdown", onDocPointerDownCapture, true);

  function applyPlacementMapInteraction() {
    if (!map) return;
    const m = map;
    const zc = m.getContainer().querySelector(".leaflet-control-zoom");
    const ro = mapPinReadOnly();
    if (zc) zc.style.display = placementActive ? "" : "none";

    if (!placementActive) {
      if (m.dragging) m.dragging.disable();
      if (m.touchZoom) m.touchZoom.disable();
      if (m.doubleClickZoom) m.doubleClickZoom.disable();
      if (m.scrollWheelZoom) m.scrollWheelZoom.disable();
      if (m.boxZoom) m.boxZoom.disable();
      if (m.keyboard) m.keyboard.disable();
      return;
    }

    m.getContainer().classList.toggle("create-hunt-map--pin-readonly", Boolean(ro));
    if (ro) {
      if (m.dragging) m.dragging.disable();
      if (m.touchZoom) m.touchZoom.disable();
      if (m.doubleClickZoom) m.doubleClickZoom.disable();
      if (m.scrollWheelZoom) m.scrollWheelZoom.disable();
      if (m.boxZoom) m.boxZoom.disable();
      if (m.keyboard) m.keyboard.disable();
    } else {
      if (m.dragging) m.dragging.enable();
      if (m.touchZoom) m.touchZoom.enable();
      if (m.doubleClickZoom) m.doubleClickZoom.enable();
      if (m.scrollWheelZoom) m.scrollWheelZoom.enable();
      if (m.boxZoom) m.boxZoom.enable();
      if (m.keyboard) m.keyboard.enable();
    }
  }

  function visibleStripHeightPx() {
    if (!map) return 0;
    return Math.max(96, map.getSize().y);
  }

  /** Keep the checkpoint pin stable: centered on X, nudged on Y above the sheet. */
  function snapPinToReferenceFrame() {
    if (!map || !selected || !mapPinReadOnly()) return;
    centerPinAboveSheet();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!map || !selected || !mapPinReadOnly()) return;
        const visibleH = visibleStripHeightPx();
        const desiredY = visibleH * PIN_SCREEN_Y_FRAC;
        const pt = map.latLngToContainerPoint([selected.lat, selected.lng]);
        const dy = pt.y - desiredY;
        if (Math.abs(dy) > 1.5) {
          map.panBy([0, dy], { animate: false });
        }
      });
    });
  }

  function fitPreviewBounds(opts = {}) {
    if (!map) return;
    const focusPin = opts.focusPin === true && selected;
    if (focusPin) {
      if (selectRadiusCircle) {
        map.fitBounds(selectRadiusCircle.getBounds(), {
          padding: [22, 22],
          maxZoom: PREVIEW_MAX_ZOOM,
          animate: false,
        });
        return;
      }
      const d = 0.032;
      const sw = [selected.lat - d, selected.lng - d * 1.2];
      const ne = [selected.lat + d, selected.lng + d * 1.2];
      map.fitBounds(window.L.latLngBounds(sw, ne), {
        padding: [18, 18],
        maxZoom: PREVIEW_MAX_ZOOM,
        animate: false,
      });
      return;
    }
    map.fitBounds(MANHATTAN_BOUNDS, { padding: [10, 10], maxZoom: PREVIEW_MAX_ZOOM });
  }

  function ensureMap() {
    if (map) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!map) return;
          map.invalidateSize({ animate: false });
          if (selectRadiusCircle && typeof selectRadiusCircle.redraw === "function") {
            selectRadiusCircle.redraw();
          }
          if (
            checkpointCenterMarker &&
            typeof checkpointCenterMarker.redraw === "function"
          ) {
            checkpointCenterMarker.redraw();
          }
        });
      });
      return;
    }
    const mapOpts = {
      minZoom: GEO_RESTRICT_MANHATTAN ? 11 : 2,
      maxZoom: MAP_MAX_ZOOM,
      zoomControl: false,
      attributionControl: false,
    };
    if (GEO_RESTRICT_MANHATTAN) {
      mapOpts.maxBounds = MANHATTAN_BOUNDS;
      mapOpts.maxBoundsViscosity = 1.0;
    }
    map = window.L.map("create-hunt-map", mapOpts);

    window.L.control.zoom({ position: "topright" }).addTo(map);

    window.L.tileLayer(tileUrlForTheme(), {
      attribution: "",
      subdomains: "abcd",
      maxZoom: MAP_MAX_ZOOM,
      maxNativeZoom: MAP_MAX_ZOOM,
    }).addTo(map);

    searchLayer = window.L.layerGroup().addTo(map);
    suggestLayer = window.L.layerGroup().addTo(map);
    playerLayer = window.L.layerGroup().addTo(map);

    const mapContainer = map.getContainer();
    mapContainer.style.touchAction = "none";
    applyPlacementMapInteraction();
    fitPreviewBounds();
  }

  function mountFsOnBody() {
    /* Keep fullscreen UI under `body`, not inside `.page-transition-root` (animated transform
     * creates a containing block for `position: fixed` and breaks scroll height on mobile). */
    if (fsEl && fsEl.parentElement !== document.body) {
      document.body.appendChild(fsEl);
    }
  }

  function enterPlacementMode() {
    mountFsOnBody();
    /* Show the map host before L.map() runs — Leaflet in a display:none subtree often keeps
     * raster tiles broken and skips or never repaints SVG/canvas vector overlays (checkpoint zone). */
    if (!placementActive) {
      placementActive = true;
      fsEl.hidden = false;
      document.body.classList.add("create-map-fs-open");
      document.body.style.overflow = "hidden";
    }
    ensureMap();
    if (!map) return;
    applyPlacementMapInteraction();
    updateFsHint();
    syncCheckpointEntrypoints();
    /* Keep sheet in DOM flow + aria-visible whenever the fullscreen map is shown (including
       browse-before-pin). CSS no longer hides .create-map-sheet--before-pin. */
    openSheet();
    map.invalidateSize({ animate: false });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!placementActive || !map) return;
        map.invalidateSize({ animate: false });
        /* Browsing before a checkpoint: nudge zoom up. After a place is set, focusMapOnPin owns zoom. */
        if (!selected) {
          const z = Math.max(map.getZoom(), 13);
          map.setZoom(z);
        }
        if (sheet.classList.contains("is-open")) {
          scheduleCenterPinAboveSheet(160);
        }
      });
    });
  }

  function exitPlacementMode() {
    if (!placementActive) return;
    hideSheetPreserveDraft();
    selected = null;
    selectedSource = null;
    lastAreaPick = null;
    clearCheckpointVisuals();
    clearPlayerVisuals();
    coordsLine.textContent = "";
    if (photoObjectUrl) {
      URL.revokeObjectURL(photoObjectUrl);
      photoObjectUrl = null;
    }
    photoPreviewEl.hidden = true;
    photoPreviewEl.innerHTML = "";
    photoEmpty.hidden = false;
    photoInput.value = "";
    form.reset();
    lastPlayerLatLng = null;
    if (searchLayer) searchLayer.clearLayers();
    if (suggestLayer) suggestLayer.clearLayers();
    if (playerLayer) playerLayer.clearLayers();
    closeResultsUi();
    setStatus(statusEl, "");
    placementActive = false;
    renderPinAreaChips();
    sheet.classList.add("create-map-sheet--before-pin");
    fsEl.hidden = true;
    document.body.classList.remove("create-map-fs-open");
    document.body.style.overflow = "";
    applyPlacementMapInteraction();
    syncCheckpointEntrypoints();
    if (map) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (map) map.invalidateSize({ animate: false });
        });
      });
    }
    searchInput?.focus({ preventScroll: true });
  }

  document.getElementById("create-map-shrink").addEventListener("click", () => {
    exitPlacementMode();
  });

  function updateCoordsLine() {
    if (!selected) return;
    const sourceText = selectedSource === "location" ? "from my location" : "from search";
    coordsLine.textContent = `Checkpoint zone · ~${CHECKPOINT_RADIUS_M} m radius · ${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)} · ${sourceText}`;
  }

  function closeResultsUi() {
    resultsEl.hidden = true;
    resultsEl.innerHTML = "";
  }

  function openSheet() {
    sheet.classList.remove("create-map-sheet--before-pin");
    sheet.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
    /* Height cap comes from CSS (dvh/svh); avoid inline max-height here so the panel stays hug-bottom, not a floating tall box. */
    if (sheetPanel) {
      sheetPanel.style.maxHeight = "";
      sheetPanel.style.transition = "";
    }
    applyPlacementMapInteraction();
    updateFsHint();
    updateCoordsLine();
    syncCheckpointEntrypoints();
    wirePinCenterAfterSheetOpens();
    requestAnimationFrame(() => {
      if (checkpointScroll) checkpointScroll.scrollTop = 0;
    });
  }

  /** Slide the hunt details sheet away without clearing the checkpoint or form fields. */
  function hideSheetPreserveDraft() {
    const ae = document.activeElement;
    if (ae && sheet.contains(ae) && typeof ae.blur === "function") {
      ae.blur();
    }
    sheet.classList.remove("is-open");
    if (!selected) {
      sheet.classList.add("create-map-sheet--before-pin");
    }
    sheet.setAttribute("aria-hidden", "true");
    applyPlacementMapInteraction();
    updateFsHint();
    if (selected) updateCoordsLine();
    hideAreaSuggest();
    hideAreaFieldHint();
    if (sheetPanel) {
      sheetPanel.style.maxHeight = "";
      sheetPanel.style.transition = "";
    }
  }

  function setSelection(lat, lng, areaHint, opts = {}) {
    if (!pointInManhattan(lat, lng)) {
      setStatus(
        statusEl,
        '<div class="status-banner error">Outside Manhattan — choose a location on the island or a red-tagged search result.</div>',
      );
      void openAlertModal({
        title: MANHATTAN_ONLY_TITLE,
        message: MANHATTAN_ONLY_BODY,
        okText: "OK",
      });
      return;
    }
    if (selected) {
      const dupM = haversineMeters(selected.lat, selected.lng, lat, lng);
      if (dupM < 5) return;
    }
    hideSheetPreserveDraft();
    setStatus(statusEl, "");
    closeResultsUi();
    enterPlacementMode();
    if (!map || !searchLayer || !suggestLayer) return;
    searchLayer.clearLayers();
    suggestLayer.clearLayers();
    if (playerLayer) playerLayer.clearLayers();
    playerMarker = null;

    selected = { lat, lng };
    selectedSource = opts.source === "location" ? "location" : "search";
    lastAreaPick = null;
    delete areaInput.dataset.userEdited;

    clearCheckpointVisuals();
    selectRadiusCircle = window.L.circleMarker([lat, lng], {
      radius: CHECKPOINT_RADIUS_M,
      color: "#f3c76b",
      weight: 2.2,
      opacity: 0.8,
      fillColor: "#f3c76b",
      fillOpacity: 0.14,
      interactive: false,
    }).addTo(map);
    if (typeof selectRadiusCircle.bringToFront === "function") {
      selectRadiusCircle.bringToFront();
    }
    checkpointCenterMarker = window.L.marker([lat, lng], {
      icon: presenceIcon("checkpoint"),
      interactive: false,
      keyboard: false,
    }).addTo(map);
    if (typeof checkpointCenterMarker.bringToFront === "function") {
      checkpointCenterMarker.bringToFront();
    }
    applyPlacementMapInteraction();

    if (areaHint) {
      areaInput.value = areaHint;
    } else {
      areaInput.value = "";
      reverseGeocodeLabel(lat, lng).then((lbl) => {
        if (!areaInput.dataset.userEdited) areaInput.value = lbl;
      });
    }

    updateCoordsLine();
    hideAreaSuggest();
    hideAreaFieldHint();

    updateFsHint();
    syncCheckpointEntrypoints();
    renderPinAreaChips();

    afterExpandedMapLayout(() => {
      focusMapOnPin(lat, lng, () => {
        openSheet();
        lockCheckpointDetailZoom();
        snapPinToReferenceFrame();
        if (selectRadiusCircle && typeof selectRadiusCircle.redraw === "function") {
          selectRadiusCircle.redraw();
        }
        if (
          checkpointCenterMarker &&
          typeof checkpointCenterMarker.redraw === "function"
        ) {
          checkpointCenterMarker.redraw();
        }
        renderPinAreaChips();
        refreshPlacementSuggestionMarkers();
      });
    });
  }

  /** While a checkpoint is set, show tappable green centroids + optional “You are here” (GPS). */
  function refreshPlacementSuggestionMarkers() {
    if (!map || !suggestLayer || !playerLayer || !placementActive || !selected) return;
    suggestLayer.clearLayers();
    playerLayer.clearLayers();
    playerMarker = null;

    const merged = buildMergedNeighborhoodList(MAP_SUGGESTION_MARKER_CAP);
    for (const { pick: p } of merged) {
      const m = window.L.circleMarker([p.lat, p.lng], {
        radius: 7,
        color: "#5f6f52",
        weight: 2,
        fillColor: "#5f6f52",
        fillOpacity: 0.15,
      }).addTo(suggestLayer);
      m.bindTooltip(`Suggested: ${p.label}`, { permanent: false });
      m.on("click", (ev) => {
        window.L.DomEvent.stopPropagation(ev);
        setSelection(p.lat, p.lng, `${p.label}, Manhattan`, { source: "search" });
      });
    }

    if (
      lastPlayerLatLng &&
      pointInManhattan(lastPlayerLatLng.lat, lastPlayerLatLng.lng)
    ) {
      const { lat: plat, lng: plng } = lastPlayerLatLng;
      playerMarker = window.L.marker([plat, plng], {
        icon: presenceIcon("player"),
        interactive: true,
        keyboard: false,
      }).addTo(playerLayer);
      playerMarker.bindTooltip("You are here — tap to use this spot", {
        permanent: false,
      });
      playerMarker.on("click", (ev) => {
        window.L.DomEvent.stopPropagation(ev);
        setSelection(plat, plng, null, { source: "location" });
      });
      if (typeof playerMarker.bringToFront === "function") {
        playerMarker.bringToFront();
      }
    }
  }

  areaInput.addEventListener("focus", () => {
    if (areaBlurTimer) {
      clearTimeout(areaBlurTimer);
      areaBlurTimer = null;
    }
    showAreaFieldHint();
    scheduleAreaSearch(areaInput.value);
  });

  areaInput.addEventListener("blur", () => {
    areaBlurTimer = window.setTimeout(() => {
      hideAreaFieldHint();
      hideAreaSuggest();
      areaBlurTimer = null;
    }, 220);
  });

  areaInput.addEventListener("input", () => {
    areaInput.dataset.userEdited = "1";
    lastAreaPick = null;
    scheduleAreaSearch(areaInput.value);
  });

  photoInput.addEventListener("change", () => {
    const f = photoInput.files?.[0];
    if (photoObjectUrl) {
      URL.revokeObjectURL(photoObjectUrl);
      photoObjectUrl = null;
    }
    if (!f) {
      photoPreviewEl.hidden = true;
      photoPreviewEl.innerHTML = "";
      photoEmpty.hidden = false;
      return;
    }
    photoObjectUrl = URL.createObjectURL(f);
    photoPreviewEl.innerHTML = `<img src="${photoObjectUrl}" alt="" class="photo-drop-img" />`;
    photoPreviewEl.hidden = false;
    photoEmpty.hidden = true;
  });

  /** Address suggestions only — map opens after the user picks one result. */
  function renderToolbarSearchResults(places, options = {}) {
    if (map && searchLayer) searchLayer.clearLayers();
    if (!places.length) {
      resultsEl.innerHTML =
        '<p class="create-map-results-empty">No matches. Try different words or tap Search.</p>';
      resultsEl.hidden = false;
      setStatus(statusEl, "");
      return;
    }
    setStatus(statusEl, options.statusHtml || "");
    const items = places
      .map(
        (p, i) => {
          const outside = p.inManhattan === false;
          return `
      <button type="button" class="create-map-result-item${outside ? " is-outside" : ""}" data-i="${i}">
        <strong>${escapeHtml(p.shortLabel)}</strong>
        ${outside ? '<span class="geo-outside-badge">Outside Manhattan — cannot select</span>' : ""}
        <span class="create-map-result-sub">${escapeHtml(p.displayName)}</span>
      </button>`;
        },
      )
      .join("");
    resultsEl.innerHTML = items;
    resultsEl.hidden = false;

    resultsEl.querySelectorAll(".create-map-result-item").forEach((btn) => {
      btn.addEventListener("mousedown", (ev) => ev.preventDefault());
      btn.addEventListener("click", async () => {
        const i = parseInt(btn.dataset.i, 10);
        const p = places[i];
        if (!p) return;
        if (p.inManhattan === false) {
          await openAlertModal({
            title: MANHATTAN_ONLY_TITLE,
            message: MANHATTAN_ONLY_BODY,
            okText: "OK",
          });
          return;
        }
        setSelection(p.lat, p.lng, `${p.shortLabel}, Manhattan`);
      });
    });
  }

  function scheduleToolbarSearch() {
    if (toolbarSearchTimer) clearTimeout(toolbarSearchTimer);
    const q = searchInput.value.trim();
    if (!q) {
      closeResultsUi();
      if (map && searchLayer) searchLayer.clearLayers();
      setStatus(statusEl, "");
      return;
    }
    toolbarSearchTimer = window.setTimeout(async () => {
      toolbarSearchTimer = null;
      if (map && suggestLayer) suggestLayer.clearLayers();
      try {
        const flagged = await searchPlacesWithManhattanFlag(q);
        renderToolbarSearchResults(flagged);
      } catch (err) {
        setStatus(
          statusEl,
          `<div class="status-banner error">${escapeHtml(err.message || "Search failed.")}</div>`,
        );
        closeResultsUi();
      }
    }, TOOLBAR_SEARCH_DEBOUNCE_MS);
  }

  async function runSearch() {
    const q = searchInput.value.trim();
    const btn = document.getElementById("create-map-search-btn");
    btn.disabled = true;
    if (map && suggestLayer) suggestLayer.clearLayers();
    if (toolbarSearchTimer) {
      clearTimeout(toolbarSearchTimer);
      toolbarSearchTimer = null;
    }
    try {
      if (!q) {
        const picks = randomManhattanLandmarkSuggestions(8);
        renderToolbarSearchResults(picks, {
          statusHtml:
            '<p class="card-meta create-map-search-ideas-note">Famous Manhattan spots — tap <strong>Search</strong> again for another mix.</p>',
        });
        return;
      }
      const flagged = await searchPlacesWithManhattanFlag(q);
      renderToolbarSearchResults(flagged);
    } catch (err) {
      setStatus(
        statusEl,
        `<div class="status-banner error">${escapeHtml(err.message || "Search failed.")}</div>`,
      );
      closeResultsUi();
    } finally {
      btn.disabled = false;
    }
  }

  document
    .getElementById("create-map-search-btn")
    .addEventListener("click", () => runSearch());
  searchInput.addEventListener("input", () => scheduleToolbarSearch());
  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim()) scheduleToolbarSearch();
  });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch();
    }
  });

  document
    .getElementById("create-map-locate-btn")
    .addEventListener("click", () => {
      if (!navigator.geolocation) {
        setStatus(
          statusEl,
          '<div class="status-banner error">This browser does not support location.</div>',
        );
        return;
      }
      setStatus(
        statusEl,
        '<div class="status-banner info">Getting your location…</div>',
      );
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          closeResultsUi();

          if (!pointInManhattan(lat, lng)) {
            setStatus(
              statusEl,
              '<div class="status-banner error">Your location is outside Manhattan. Search or pick a spot on the island.</div>',
            );
            void openAlertModal({
              title: MANHATTAN_ONLY_TITLE,
              message: MANHATTAN_ONLY_BODY,
              okText: "OK",
            });
            return;
          }

          lastPlayerLatLng = { lat, lng };
          setStatus(
            statusEl,
            '<div class="status-banner ok">Checkpoint set to your current location. Tap a green suggestion to move it if you want.</div>',
          );
          setSelection(lat, lng, null, { source: "location" });
        },
        () => {
          setStatus(
            statusEl,
            '<div class="status-banner error">Could not read location. Check browser permissions.</div>',
          );
        },
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
      );
    });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selected) {
      setStatus(
        statusEl,
        '<div class="status-banner error">Choose a place from search (or a green suggestion) first.</div>',
      );
      return;
    }

    const file = photoInput.files?.[0];
    if (!file) {
      setStatus(
        statusEl,
        '<div class="status-banner error">Add a checkpoint photo.</div>',
      );
      return;
    }

    const confirmed = await openConfirmModal({
      title: "Publish this hunt?",
      message:
        "Are you sure?\n\nOnce uploaded, your hunt cannot be undone for now.",
      confirmText: "Publish",
      cancelText: "Cancel",
      animate: true,
    });
    if (!confirmed) return;

    const btn = document.getElementById("create-map-submit");
    btn.disabled = true;
    setStatus(statusEl, "");

    try {
      await ensureUser();
      setStatus(
        statusEl,
        '<div class="status-banner info">Publishing…</div>',
      );

      const title = document.getElementById("create-map-title").value.trim();
      let areaLabel;
      try {
        areaLabel = await resolveAreaLabelForPublish();
      } catch (areaErr) {
        setStatus(
          statusEl,
          `<div class="status-banner error">${escapeHtml(areaErr.message || "Area is required.")}</div>`,
        );
        btn.disabled = false;
        return;
      }
      const timeLimitMinutes = parseInt(
        document.getElementById("create-map-minutes").value,
        10,
      );
      const hint =
        document.getElementById("create-map-hint").value.trim() || "";

      const huntHint =
        document.getElementById("create-map-challenge-hint")?.value.trim() ||
        "";

      const newChallengeId = await createChallenge({
        title,
        areaLabel,
        timeLimitMinutes,
        files: [file],
        hints: [hint],
        huntHint,
        lat: selected.lat,
        lng: selected.lng,
        spotLatLngs: [{ lat: selected.lat, lng: selected.lng }],
      });

      await showPublishSuccessOverlay({
        title: "Published!",
        message: "Opening photos & comments for your hunt…",
      });
      nav(`#/hunt-review/${newChallengeId}`);
    } catch (err) {
      setStatus(
        statusEl,
        `<div class="status-banner error">${escapeHtml(err.message || "Could not publish.")}</div>`,
      );
      btn.disabled = false;
    }
  });

  hideSheetPreserveDraft();

  mapCleanup = () => {
    if (areaSearchTimer) clearTimeout(areaSearchTimer);
    if (toolbarSearchTimer) clearTimeout(toolbarSearchTimer);
    if (areaBlurTimer) clearTimeout(areaBlurTimer);
    document.body.classList.remove("sheet-is-dragging");
    document.removeEventListener("pointerdown", onDocPointerDownCapture, true);
    checkpointScroll?.removeEventListener("scroll", onCheckpointScroll);
    if (map) {
      map.remove();
    }
    map = null;
    searchLayer = null;
    suggestLayer = null;
    playerLayer = null;
    playerMarker = null;
    checkpointCenterMarker = null;
    selectRadiusCircle = null;
    if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
    document.body.classList.remove("create-map-fs-open");
    document.body.style.overflow = "";
    mapCleanup = null;
  };
}

export function cleanup() {
  if (mapCleanup) mapCleanup();
}
