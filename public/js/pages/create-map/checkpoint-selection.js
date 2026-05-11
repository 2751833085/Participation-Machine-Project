/**
 * Checkpoint pick from search / map (create-map).
 */
import { openAlertModal, pointInManhattan, haversineMeters, reverseGeocodeLabel } from "./create-map-utils.js";
import {
  CHECKPOINT_RADIUS_M,
} from "./constants-theme.js";
import { MANHATTAN_ONLY_BODY, MANHATTAN_ONLY_TITLE } from "./manhattan-copy.js";
import { setStatus } from "./status.js";
import * as Lf from "./leaflet-host.js";

/**
 * @param {object} ctx
 * @param {{ selected: object | null }} ctx.st
 * @param {HTMLElement} ctx.statusEl
 * @param {HTMLInputElement} ctx.areaInput
 * @param {HTMLElement} ctx.sheet
 * @param {() => void} ctx.hideSheetPreserveDraft
 * @param {() => void} ctx.closeResultsUi
 * @param {() => void} ctx.enterPlacementMode
 * @param {() => void} ctx.clearCheckpointVisuals
 * @param {() => void} ctx.applyPlacementMapInteraction
 * @param {() => void} ctx.openSheet
 * @param {() => void} ctx.updateCoordsLine
 * @param {() => void} ctx.hideAreaSuggest
 * @param {() => void} ctx.hideAreaFieldHint
 * @param {() => void} ctx.updateFsHint
 * @param {() => void} ctx.syncCheckpointEntrypoints
 * @param {() => void} ctx.renderPinAreaChips
 * @param {() => void} ctx.refreshPlacementSuggestionMarkers
 * @param {() => boolean} ctx.mapPinReadOnly
 */
export function setCheckpointSelection(ctx, lat, lng, areaHint, opts = {}) {
  const { st } = ctx;
  if (!ensureManhattanCheckpoint(ctx, lat, lng)) return;
  if (isDuplicateCheckpoint(st, lat, lng)) return;
  ctx.hideSheetPreserveDraft();
  setStatus(ctx.statusEl, "");
  ctx.closeResultsUi();
  ctx.enterPlacementMode();
  if (!st.map || !st.searchLayer || !st.suggestLayer) return;
  clearPlacementLayers(st);
  updateSelectedCheckpoint(ctx, lat, lng, opts);
  paintCheckpointSelection(ctx, lat, lng);
  ctx.applyPlacementMapInteraction();
  updateAreaInput(ctx, lat, lng, areaHint);
  syncCheckpointUi(ctx);

  Lf.afterExpandedMapLayout(() => {
    Lf.focusMapOnPin(st, lat, lng, () => settleCheckpointFocus(ctx));
  });
}

function ensureManhattanCheckpoint(ctx, lat, lng) {
  if (pointInManhattan(lat, lng)) return true;
  setStatus(
    ctx.statusEl,
    '<div class="status-banner error">Outside Manhattan — choose a location on the island or a red-tagged search result.</div>',
  );
  void openAlertModal({
    title: MANHATTAN_ONLY_TITLE,
    message: MANHATTAN_ONLY_BODY,
    okText: "OK",
  });
  return false;
}

function isDuplicateCheckpoint(st, lat, lng) {
  return st.selected && haversineMeters(st.selected.lat, st.selected.lng, lat, lng) < 5;
}

function clearPlacementLayers(st) {
  st.searchLayer.clearLayers();
  st.suggestLayer.clearLayers();
  if (st.playerLayer) st.playerLayer.clearLayers();
  st.playerMarker = null;
}

function updateSelectedCheckpoint(ctx, lat, lng, opts) {
  ctx.st.selected = { lat, lng };
  ctx.st.selectedSource = opts.source === "location" ? "location" : "search";
  ctx.st.lastAreaPick = null;
  delete ctx.areaInput.dataset.userEdited;
}

function paintCheckpointSelection(ctx, lat, lng) {
  const { st } = ctx;
  ctx.clearCheckpointVisuals();
  st.selectRadiusCircle = window.L.circleMarker([lat, lng], {
    radius: CHECKPOINT_RADIUS_M,
    color: "#f3c76b",
    weight: 2.2,
    opacity: 0.8,
    fillColor: "#f3c76b",
    fillOpacity: 0.14,
    interactive: false,
  }).addTo(st.map);
  bringLayerToFront(st.selectRadiusCircle);
  st.checkpointCenterMarker = window.L.marker([lat, lng], {
    icon: Lf.presenceIcon("checkpoint"),
    interactive: false,
    keyboard: false,
  }).addTo(st.map);
  bringLayerToFront(st.checkpointCenterMarker);
}

function bringLayerToFront(layer) {
  if (typeof layer?.bringToFront === "function") layer.bringToFront();
}

function updateAreaInput(ctx, lat, lng, areaHint) {
  if (areaHint) {
    ctx.areaInput.value = areaHint;
    return;
  }
  ctx.areaInput.value = "";
  reverseGeocodeLabel(lat, lng).then((lbl) => {
    if (!ctx.areaInput.dataset.userEdited) ctx.areaInput.value = lbl;
  });
}

function syncCheckpointUi(ctx) {
  ctx.updateCoordsLine();
  ctx.hideAreaSuggest();
  ctx.hideAreaFieldHint();
  ctx.updateFsHint();
  ctx.syncCheckpointEntrypoints();
  ctx.renderPinAreaChips();
}

function settleCheckpointFocus(ctx) {
  const { st } = ctx;
  ctx.openSheet();
  Lf.lockCheckpointDetailZoom(st);
  Lf.snapPinToReferenceFrame(st, ctx.sheet, ctx.mapPinReadOnly, Lf.centerPinAboveSheet);
  redrawLayer(st.selectRadiusCircle);
  redrawLayer(st.checkpointCenterMarker);
  ctx.renderPinAreaChips();
  ctx.refreshPlacementSuggestionMarkers();
}

function redrawLayer(layer) {
  if (layer && typeof layer.redraw === "function") layer.redraw();
}
