/**
 * Fullscreen map host + bottom sheet open/close for create-map.
 */
import { setStatus } from "./status.js";
import * as Lf from "./leaflet-host.js";

/**
 * @param {object} ctx
 * @param {HTMLElement} ctx.fsEl
 */
export function mountFsOnBody(ctx) {
  /* Keep fullscreen UI under `body`, not inside `.page-transition-root` (animated transform
   * creates a containing block for `position: fixed` and breaks scroll height on mobile). */
  if (ctx.fsEl && ctx.fsEl.parentElement !== document.body) {
    document.body.appendChild(ctx.fsEl);
  }
}

/**
 * @param {object} ctx
 * @param {{ placementActive: boolean }} ctx.st
 * @param {HTMLElement} ctx.fsEl
 * @param {HTMLElement} ctx.sheet
 * @param {() => void} ctx.ensureMap
 * @param {() => void} ctx.applyPlacementMapInteraction
 * @param {() => void} ctx.updateFsHint
 * @param {() => void} ctx.syncCheckpointEntrypoints
 * @param {() => void} ctx.openSheet
 */
export function enterPlacementMode(ctx) {
  mountFsOnBody(ctx);
  /* Show the map host before L.map() runs — Leaflet in a display:none subtree often keeps
   * raster tiles broken and skips or never repaints SVG/canvas vector overlays (checkpoint zone). */
  if (!ctx.st.placementActive) {
    ctx.st.placementActive = true;
    ctx.fsEl.hidden = false;
    document.body.classList.add("create-map-fs-open");
    document.body.style.overflow = "hidden";
  }
  ctx.ensureMap();
  if (!ctx.st.map) return;
  ctx.applyPlacementMapInteraction();
  ctx.updateFsHint();
  ctx.syncCheckpointEntrypoints();
  /* Keep sheet in DOM flow + aria-visible whenever the fullscreen map is shown (including
     browse-before-pin). CSS no longer hides .create-map-sheet--before-pin. */
  ctx.openSheet();
  ctx.st.map.invalidateSize({ animate: false });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!ctx.st.placementActive || !ctx.st.map) return;
      ctx.st.map.invalidateSize({ animate: false });
      /* Browsing before a checkpoint: nudge zoom up. After a place is set, focusMapOnPin owns zoom. */
      if (!ctx.st.selected) {
        const z = Math.max(ctx.st.map.getZoom(), 13);
        ctx.st.map.setZoom(z);
      }
      if (ctx.sheet.classList.contains("is-open")) {
        Lf.scheduleCenterPinAboveSheet(ctx.st, ctx.sheet, 160, Lf.centerPinAboveSheet);
      }
    });
  });
}

/**
 * @param {object} ctx
 * @param {{ placementActive: boolean, selected: object | null, selectedSource: string | null, lastAreaPick: object | null, lastPlayerLatLng: object | null, photoObjectUrl: string | null, map: object | null, searchLayer: object | null, suggestLayer: object | null, playerLayer: object | null }} ctx.st
 * @param {HTMLElement} ctx.coordsLine
 * @param {HTMLElement} ctx.photoPreviewEl
 * @param {HTMLElement} ctx.photoEmpty
 * @param {HTMLInputElement} ctx.photoInput
 * @param {HTMLFormElement} ctx.form
 * @param {HTMLElement} ctx.statusEl
 * @param {HTMLElement} ctx.sheet
 * @param {HTMLElement} ctx.fsEl
 * @param {HTMLInputElement | null} ctx.searchInput
 * @param {() => void} ctx.hideSheetPreserveDraft
 * @param {() => void} ctx.clearCheckpointVisuals
 * @param {() => void} ctx.clearPlayerVisuals
 * @param {() => void} ctx.closeResultsUi
 * @param {() => void} ctx.renderPinAreaChips
 * @param {() => void} ctx.applyPlacementMapInteraction
 * @param {() => void} ctx.syncCheckpointEntrypoints
 */
export function exitPlacementMode(ctx) {
  if (!ctx.st.placementActive) return;
  ctx.hideSheetPreserveDraft();
  ctx.st.selected = null;
  ctx.st.selectedSource = null;
  ctx.st.lastAreaPick = null;
  ctx.clearCheckpointVisuals();
  ctx.clearPlayerVisuals();
  ctx.coordsLine.textContent = "";
  if (ctx.st.photoObjectUrl) {
    URL.revokeObjectURL(ctx.st.photoObjectUrl);
    ctx.st.photoObjectUrl = null;
  }
  ctx.photoPreviewEl.hidden = true;
  ctx.photoPreviewEl.innerHTML = "";
  ctx.photoEmpty.hidden = false;
  ctx.photoInput.value = "";
  ctx.form.reset();
  ctx.st.lastPlayerLatLng = null;
  if (ctx.st.searchLayer) ctx.st.searchLayer.clearLayers();
  if (ctx.st.suggestLayer) ctx.st.suggestLayer.clearLayers();
  if (ctx.st.playerLayer) ctx.st.playerLayer.clearLayers();
  ctx.closeResultsUi();
  setStatus(ctx.statusEl, "");
  ctx.st.placementActive = false;
  ctx.renderPinAreaChips();
  ctx.sheet.classList.add("create-map-sheet--before-pin");
  ctx.fsEl.hidden = true;
  document.body.classList.remove("create-map-fs-open");
  document.body.style.overflow = "";
  ctx.applyPlacementMapInteraction();
  ctx.syncCheckpointEntrypoints();
  if (ctx.st.map) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (ctx.st.map) ctx.st.map.invalidateSize({ animate: false });
      });
    });
  }
  ctx.searchInput?.focus({ preventScroll: true });
}

/**
 * @param {object} ctx
 * @param {{ selected: object | null }} ctx.st
 * @param {HTMLElement} ctx.sheet
 * @param {HTMLElement | null} ctx.sheetPanel
 * @param {HTMLElement | null} ctx.checkpointScroll
 * @param {() => void} ctx.applyPlacementMapInteraction
 * @param {() => void} ctx.updateFsHint
 * @param {() => void} ctx.updateCoordsLine
 * @param {() => void} ctx.syncCheckpointEntrypoints
 * @param {() => void} ctx.wirePinCenterAfterSheetOpens
 */
export function openCreateMapSheet(ctx) {
  ctx.sheet.classList.remove("create-map-sheet--before-pin");
  ctx.sheet.classList.add("is-open");
  ctx.sheet.setAttribute("aria-hidden", "false");
  /* Height cap comes from CSS (dvh/svh); avoid inline max-height here so the panel stays hug-bottom, not a floating tall box. */
  if (ctx.sheetPanel) {
    ctx.sheetPanel.style.maxHeight = "";
    ctx.sheetPanel.style.transition = "";
  }
  ctx.applyPlacementMapInteraction();
  ctx.updateFsHint();
  ctx.updateCoordsLine();
  ctx.syncCheckpointEntrypoints();
  ctx.wirePinCenterAfterSheetOpens();
  requestAnimationFrame(() => {
    if (ctx.checkpointScroll) ctx.checkpointScroll.scrollTop = 0;
  });
}

/**
 * Slide the hunt details sheet away without clearing the checkpoint or form fields.
 * @param {object} ctx
 * @param {{ selected: object | null }} ctx.st
 * @param {HTMLElement} ctx.sheet
 * @param {HTMLElement | null} ctx.sheetPanel
 * @param {() => void} ctx.applyPlacementMapInteraction
 * @param {() => void} ctx.updateFsHint
 * @param {() => void} ctx.updateCoordsLine
 * @param {() => void} ctx.hideAreaSuggest
 * @param {() => void} ctx.hideAreaFieldHint
 */
export function hideSheetPreserveDraft(ctx) {
  const ae = document.activeElement;
  if (ae && ctx.sheet.contains(ae) && typeof ae.blur === "function") {
    ae.blur();
  }
  ctx.sheet.classList.remove("is-open");
  if (!ctx.st.selected) {
    ctx.sheet.classList.add("create-map-sheet--before-pin");
  }
  ctx.sheet.setAttribute("aria-hidden", "true");
  ctx.applyPlacementMapInteraction();
  ctx.updateFsHint();
  if (ctx.st.selected) ctx.updateCoordsLine();
  ctx.hideAreaSuggest();
  ctx.hideAreaFieldHint();
  if (ctx.sheetPanel) {
    ctx.sheetPanel.style.maxHeight = "";
    ctx.sheetPanel.style.transition = "";
  }
}
