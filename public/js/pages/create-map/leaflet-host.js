/**
 * Leaflet map lifecycle + placement interaction for create-map.
 * Mutates the passed `st` bag (map, layers, markers) in place.
 */
import { GEO_RESTRICT_MANHATTAN, MANHATTAN_BOUNDS } from "./create-map-utils.js";
import {
  FOLLOW_FLY_EASE,
  MAP_MAX_ZOOM,
  PIN_PAN_ABOVE_SHEET_SEC,
  PIN_SCREEN_Y_FRAC,
  PREVIEW_MAX_ZOOM,
  SELECTION_TARGET_ZOOM,
} from "./constants-theme.js";
import { tileUrlForTheme } from "./theme.js";

/** @param {"checkpoint" | "player"} kind */
export function presenceIcon(kind) {
  return window.L.divIcon({
    className: `map-presence map-presence--${kind}`,
    html: '<span class="map-presence-pulse" aria-hidden="true"></span><span class="map-presence-core" aria-hidden="true"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function afterExpandedMapLayout(callback) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.setTimeout(callback, 72);
    });
  });
}

/** @param {{ selectRadiusCircle: object | null, checkpointCenterMarker: object | null }} st */
export function clearCheckpointVisuals(st) {
  if (st.selectRadiusCircle) {
    st.selectRadiusCircle.remove();
    st.selectRadiusCircle = null;
  }
  if (st.checkpointCenterMarker) {
    st.checkpointCenterMarker.remove();
    st.checkpointCenterMarker = null;
  }
}

/** @param {{ playerMarker: object | null }} st */
export function clearPlayerVisuals(st) {
  if (st.playerMarker) {
    st.playerMarker.remove();
    st.playerMarker = null;
  }
}

/**
 * @param {{ map: object | null, selectionFlyActive: boolean }} st
 */
export function focusMapOnPin(st, lat, lng, onDone) {
  if (!st.map) return;
  st.map.stop?.();
  st.selectionFlyActive = false;
  st.map.invalidateSize({ animate: false });
  const z = Math.min(SELECTION_TARGET_ZOOM, st.map.getMaxZoom());
  st.map.setView([lat, lng], z, { animate: false });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (onDone) onDone();
    });
  });
}

/** @param {{ map: object | null, selected: { lat: number, lng: number } | null }} st */
export function lockCheckpointDetailZoom(st) {
  if (!st.map || !st.selected) return;
  st.map.invalidateSize({ animate: false });
  const z = Math.min(SELECTION_TARGET_ZOOM, st.map.getMaxZoom());
  st.map.setView([st.selected.lat, st.selected.lng], z, { animate: false });
}

/**
 * @param {{ map: object | null, selected: object | null, placementActive: boolean, selectionFlyActive: boolean }} st
 */
export function centerPinAboveSheet(st, sheet) {
  if (!shouldCenterPinAboveSheet(st, sheet)) return;
  const mapH = normalizedMapHeight(st.map);
  const panDy = pinPanDeltaY(st, mapH);
  if (Math.abs(panDy) < 3) return;
  if (typeof st.map.stop === "function") st.map.stop();
  st.map.panBy([0, panDy], {
    animate: true,
    duration: PIN_PAN_ABOVE_SHEET_SEC,
    easeLinearity: FOLLOW_FLY_EASE,
  });
}

function shouldCenterPinAboveSheet(st, sheet) {
  return Boolean(
    st.map &&
    st.selected &&
    st.placementActive &&
    sheet.classList.contains("is-open") &&
    !st.selectionFlyActive,
  );
}

function normalizedMapHeight(map) {
  const mapRect = map.getContainer().getBoundingClientRect();
  const mapH = map.getSize().y;
  if (Math.abs(mapRect.height - mapH) > 2) {
    map.invalidateSize({ animate: false });
  }
  return mapH;
}

function pinPanDeltaY(st, mapH) {
  const visibleH = Math.max(96, mapH);
  const targetY = visibleH * 0.48;
  const pinPt = st.map.latLngToContainerPoint([st.selected.lat, st.selected.lng]);
  return pinPt.y - targetY;
}

export function scheduleCenterPinAboveSheet(st, sheet, delayMs, centerFn) {
  const d = delayMs != null ? delayMs : 120;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.setTimeout(() => centerFn(st, sheet), d);
    });
  });
}

/** @param {{ map: object | null }} st */
export function visibleStripHeightPx(st) {
  if (!st.map) return 0;
  return Math.max(96, st.map.getSize().y);
}

/**
 * @param {{ map: object | null, selected: object | null }} st
 * @param {(s: typeof st) => boolean} mapPinReadOnly
 */
export function snapPinToReferenceFrame(st, sheet, mapPinReadOnly, centerFn) {
  if (!st.map || !st.selected || !mapPinReadOnly(st)) return;
  centerFn(st, sheet);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!st.map || !st.selected || !mapPinReadOnly(st)) return;
      const visibleH = visibleStripHeightPx(st);
      const desiredY = visibleH * PIN_SCREEN_Y_FRAC;
      const pt = st.map.latLngToContainerPoint([st.selected.lat, st.selected.lng]);
      const dy = pt.y - desiredY;
      if (Math.abs(dy) > 1.5) {
        st.map.panBy([0, dy], { animate: false });
      }
    });
  });
}

/**
 * @param {{ map: object | null, selected: object | null, selectRadiusCircle: object | null }} st
 */
export function fitPreviewBounds(st, opts = {}) {
  if (!st.map) return;
  const focusPin = opts.focusPin === true && st.selected;
  if (focusPin) {
    if (st.selectRadiusCircle) {
      st.map.fitBounds(st.selectRadiusCircle.getBounds(), {
        padding: [22, 22],
        maxZoom: PREVIEW_MAX_ZOOM,
        animate: false,
      });
      return;
    }
    const d = 0.032;
    const sw = [st.selected.lat - d, st.selected.lng - d * 1.2];
    const ne = [st.selected.lat + d, st.selected.lng + d * 1.2];
    st.map.fitBounds(window.L.latLngBounds(sw, ne), {
      padding: [18, 18],
      maxZoom: PREVIEW_MAX_ZOOM,
      animate: false,
    });
    return;
  }
  st.map.fitBounds(MANHATTAN_BOUNDS, { padding: [10, 10], maxZoom: PREVIEW_MAX_ZOOM });
}

/**
 * @param {{
 *   map: object | null,
 *   searchLayer: object | null,
 *   suggestLayer: object | null,
 *   playerLayer: object | null,
 *   selectRadiusCircle: object | null,
 *   checkpointCenterMarker: object | null,
 * }} st
 * @param {() => void} applyPlacementMapInteraction
 */
export function ensureMap(st, applyPlacementMapInteraction) {
  if (st.map) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!st.map) return;
        st.map.invalidateSize({ animate: false });
        if (st.selectRadiusCircle && typeof st.selectRadiusCircle.redraw === "function") {
          st.selectRadiusCircle.redraw();
        }
        if (
          st.checkpointCenterMarker &&
          typeof st.checkpointCenterMarker.redraw === "function"
        ) {
          st.checkpointCenterMarker.redraw();
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
  st.map = window.L.map("create-hunt-map", mapOpts);

  window.L.control.zoom({ position: "topright" }).addTo(st.map);

  window.L.tileLayer(tileUrlForTheme(), {
    attribution: "",
    subdomains: "abcd",
    maxZoom: MAP_MAX_ZOOM,
    maxNativeZoom: MAP_MAX_ZOOM,
  }).addTo(st.map);

  st.searchLayer = window.L.layerGroup().addTo(st.map);
  st.suggestLayer = window.L.layerGroup().addTo(st.map);
  st.playerLayer = window.L.layerGroup().addTo(st.map);

  const mapContainer = st.map.getContainer();
  mapContainer.style.touchAction = "none";
  applyPlacementMapInteraction();
  fitPreviewBounds(st, {});
}

/**
 * @param {{ map: object | null }} st
 * @param {boolean} placementActive
 * @param {boolean} mapPinReadOnly
 */
export function applyPlacementMapInteraction(st, placementActive, mapPinReadOnly) {
  if (!st.map) return;
  const m = st.map;
  const zc = m.getContainer().querySelector(".leaflet-control-zoom");
  const ro = mapPinReadOnly;
  if (zc) zc.style.display = placementActive ? "" : "none";

  if (!placementActive) {
    setMapInteractionEnabled(m, false);
    return;
  }

  m.getContainer().classList.toggle("create-hunt-map--pin-readonly", Boolean(ro));
  setMapInteractionEnabled(m, !ro);
}

function setMapInteractionEnabled(map, enabled) {
  const method = enabled ? "enable" : "disable";
  [
    map.dragging,
    map.touchZoom,
    map.doubleClickZoom,
    map.scrollWheelZoom,
    map.boxZoom,
    map.keyboard,
  ].forEach((handler) => {
    if (handler) handler[method]();
  });
}

/**
 * @param {object} st state bag (same shape as session uses)
 * @param {Array<{ pick: { lat: number, lng: number, label: string } }>} merged
 * @param {(lat: number, lng: number, label: string, opts: object) => void} onPickSuggest
 * @param {(lat: number, lng: number) => void} onPickPlayerHere
 * @param {(lat: number, lng: number) => boolean} pointInManhattan
 * @param {{ lat: number, lng: number } | null} lastPlayerLatLng
 */
export function refreshPlacementSuggestionMarkers(
  st,
  merged,
  onPickSuggest,
  onPickPlayerHere,
  pointInManhattan,
  lastPlayerLatLng,
) {
  if (!st.map || !st.suggestLayer || !st.playerLayer || !st.placementActive || !st.selected) return;
  st.suggestLayer.clearLayers();
  st.playerLayer.clearLayers();
  st.playerMarker = null;
  addSuggestionMarkers(st, merged, onPickSuggest);
  addPlayerHereMarker(st, lastPlayerLatLng, pointInManhattan, onPickPlayerHere);
}

function addSuggestionMarkers(st, merged, onPickSuggest) {
  for (const { pick: p } of merged) {
    const m = window.L.circleMarker([p.lat, p.lng], {
      radius: 7,
      color: "#5f6f52",
      weight: 2,
      fillColor: "#5f6f52",
      fillOpacity: 0.15,
    }).addTo(st.suggestLayer);
    m.bindTooltip(`Suggested: ${p.label}`, { permanent: false });
    m.on("click", (ev) => {
      window.L.DomEvent.stopPropagation(ev);
      onPickSuggest(p.lat, p.lng, `${p.label}, Manhattan`, { source: "search" });
    });
  }
}

function addPlayerHereMarker(st, lastPlayerLatLng, pointInManhattan, onPickPlayerHere) {
  if (!validPlayerHere(lastPlayerLatLng, pointInManhattan)) return;
  const { lat: plat, lng: plng } = lastPlayerLatLng;
  st.playerMarker = window.L.marker([plat, plng], {
    icon: presenceIcon("player"),
    interactive: true,
    keyboard: false,
  }).addTo(st.playerLayer);
  st.playerMarker.bindTooltip("You are here — tap to use this spot", {
    permanent: false,
  });
  st.playerMarker.on("click", (ev) => {
    window.L.DomEvent.stopPropagation(ev);
    onPickPlayerHere(plat, plng);
  });
  if (typeof st.playerMarker.bringToFront === "function") {
    st.playerMarker.bringToFront();
  }
}

function validPlayerHere(lastPlayerLatLng, pointInManhattan) {
  return Boolean(
    lastPlayerLatLng &&
    pointInManhattan(lastPlayerLatLng.lat, lastPlayerLatLng.lng),
  );
}
