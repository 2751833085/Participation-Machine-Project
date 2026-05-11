/**
 * Create-map runtime (checkpoint + map + publish).
 */
import { pointInManhattan, randomManhattanLandmarkSuggestions, searchPlacesWithManhattanFlag } from "./create-map-utils.js";
import {
  MAP_SUGGESTION_MARKER_CAP,
} from "./constants-theme.js";
import { setStatus } from "./status.js";
import * as Af from "./area-field.js";
import { setCheckpointSelection } from "./checkpoint-selection.js";
import * as Lf from "./leaflet-host.js";
import * as Ps from "./placement-sheet.js";
import * as Tb from "./toolbar-search.js";
import {
  attachSessionControls,
  createSessionCleanup,
  hideAreaSuggestFromOutsidePointer,
  movePinToPlaceForSession,
  resetAreaFieldForEditSession,
  syncMinutesOutForSession,
  updateCoordsLineForSession,
  updateFsHintForSession,
} from "./session-helpers.js";

export function mountCreateMapSession() {
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
    return () => {};
  }

  const st = {
    selected: null,
    selectedSource: null,
    selectRadiusCircle: null,
    checkpointCenterMarker: null,
    playerMarker: null,
    placementActive: false,
    photoObjectUrl: null,
    lastAreaPick: null,
    areaSearchTimer: null,
    toolbarSearchTimer: null,
    areaBlurTimer: null,
    selectionFlyActive: false,
    lastPlayerLatLng: null,
    map: null,
    searchLayer: null,
    suggestLayer: null,
    playerLayer: null,
  };

  let sessionCleanup = null;

  const toolbarDom = { resultsEl, statusEl, searchInput };
  const areaSuggestDom = { areaInput, areaSuggestList };
  const areaPinDom = { areaPinSuggest, areaPinSuggestChips, areaInput };

  function onCheckpointScroll() {
    if (st.map) st.map.invalidateSize({ animate: false });
  }
  if (checkpointScroll) {
    checkpointScroll.addEventListener("scroll", onCheckpointScroll, {
      passive: true,
    });
  }

  function mapPinReadOnly() {
    return st.placementActive && st.selected;
  }

  function clearCheckpointVisuals() {
    Lf.clearCheckpointVisuals(st);
  }

  function clearPlayerVisuals() {
    Lf.clearPlayerVisuals(st);
  }

  function hideAreaSuggest() {
    Af.hideAreaSuggest(areaInput, areaSuggestList);
  }

  function showAreaFieldHint() {
    Af.showAreaFieldHint(areaFieldHint);
  }

  function hideAreaFieldHint() {
    Af.hideAreaFieldHint(areaFieldHint);
  }

  /** After the checkpoint form mounts in-flow, nudge the map (no sheet transform transition). */
  function wirePinCenterAfterSheetOpens() {
    Lf.scheduleCenterPinAboveSheet(st, sheet, 40, Lf.centerPinAboveSheet);
    window.setTimeout(() => Lf.centerPinAboveSheet(st, sheet), 200);
    window.setTimeout(() => Lf.centerPinAboveSheet(st, sheet), 480);
  }

  function syncCheckpointEntrypoints() {}

  function updateFsHint() {
    updateFsHintForSession(st, fsHint);
  }

  function syncMinutesOut() {
    syncMinutesOutForSession(minutesRange, minutesOut);
  }
  if (minutesRange) {
    minutesRange.addEventListener("input", syncMinutesOut);
    syncMinutesOut();
  }

  async function resolveAreaLabelForPublish() {
    return Af.resolveAreaLabelForPublish(st, { areaInput });
  }

  function renderPinAreaChips() {
    Af.renderPinAreaChips(st, areaPinDom, hideAreaSuggest);
  }

  async function selectAreaSuggestionRow(row) {
    await Af.selectAreaSuggestion(st, { areaInput }, row, {
      movePinToPlace,
      resetAreaFieldForEdit,
      hideAreaSuggestFn: hideAreaSuggest,
    });
  }

  function scheduleAreaSearchFromInput() {
    Af.scheduleAreaSearch(st, areaSuggestDom, hideAreaSuggest, selectAreaSuggestionRow);
  }

  function movePinToPlace(place) {
    movePinToPlaceForSession(
      {
        st,
        areaInput,
        sheet,
        mapPinReadOnly,
        updateCoordsLine,
        enterPlacementMode,
        updateFsHint,
        syncCheckpointEntrypoints,
        renderPinAreaChips,
        refreshPlacementSuggestionMarkers,
      },
      place,
    );
  }

  function resetAreaFieldForEdit() {
    resetAreaFieldForEditSession(
      st,
      areaInput,
      areaSuggestDom,
      showAreaFieldHint,
      hideAreaSuggest,
      selectAreaSuggestionRow,
    );
  }

  function onDocPointerDownCapture(e) {
    hideAreaSuggestFromOutsidePointer(e, areaComboboxWrap, hideAreaSuggest);
  }
  document.addEventListener("pointerdown", onDocPointerDownCapture, true);

  function applyPlacementMapInteraction() {
    Lf.applyPlacementMapInteraction(st, st.placementActive, mapPinReadOnly());
  }

  function fitPreviewBounds(opts = {}) {
    Lf.fitPreviewBounds(st, opts);
  }

  function ensureMap() {
    Lf.ensureMap(st, () => applyPlacementMapInteraction());
  }

  function placementCtx() {
    return {
      st,
      fsEl,
      sheet,
      sheetPanel,
      checkpointScroll,
      coordsLine,
      photoPreviewEl,
      photoEmpty,
      photoInput,
      form,
      statusEl,
      searchInput,
      ensureMap,
      applyPlacementMapInteraction,
      updateFsHint,
      syncCheckpointEntrypoints,
      updateCoordsLine,
      hideAreaSuggest,
      hideAreaFieldHint,
      wirePinCenterAfterSheetOpens,
      clearCheckpointVisuals,
      clearPlayerVisuals,
      closeResultsUi,
      renderPinAreaChips,
    };
  }

  function enterPlacementMode() {
    Ps.enterPlacementMode({
      ...placementCtx(),
      openSheet,
    });
  }

  function exitPlacementMode() {
    Ps.exitPlacementMode({
      ...placementCtx(),
      hideSheetPreserveDraft,
    });
  }

  function updateCoordsLine() {
    updateCoordsLineForSession(st, coordsLine);
  }

  function closeResultsUi() {
    Tb.closeToolbarResults(st, toolbarDom);
  }

  function openSheet() {
    Ps.openCreateMapSheet(placementCtx());
  }

  function hideSheetPreserveDraft() {
    Ps.hideSheetPreserveDraft(placementCtx());
  }

  function setSelection(lat, lng, areaHint, opts = {}) {
    setCheckpointSelection(
      {
        st,
        statusEl,
        areaInput,
        sheet,
        hideSheetPreserveDraft,
        closeResultsUi,
        enterPlacementMode,
        clearCheckpointVisuals,
        applyPlacementMapInteraction,
        openSheet,
        updateCoordsLine,
        hideAreaSuggest,
        hideAreaFieldHint,
        updateFsHint,
        syncCheckpointEntrypoints,
        renderPinAreaChips,
        refreshPlacementSuggestionMarkers,
        mapPinReadOnly,
      },
      lat,
      lng,
      areaHint,
      opts,
    );
  }

  /** While a checkpoint is set, show tappable green centroids + optional “You are here” (GPS). */
  function refreshPlacementSuggestionMarkers() {
    const merged = Af.buildMergedNeighborhoodList(st, MAP_SUGGESTION_MARKER_CAP);
    Lf.refreshPlacementSuggestionMarkers(
      st,
      merged,
      (plat, plng, lbl, o) => setSelection(plat, plng, lbl, o),
      (plat, plng) => setSelection(plat, plng, null, { source: "location" }),
      pointInManhattan,
      st.lastPlayerLatLng,
    );
  }

  function renderToolbarSearchResultsBound(places, options) {
    Tb.renderToolbarSearchResults(st, toolbarDom, setSelection, places, options);
  }

  function scheduleToolbarSearch() {
    Tb.scheduleToolbarSearch(
      st,
      toolbarDom,
      searchPlacesWithManhattanFlag,
      renderToolbarSearchResultsBound,
    );
  }

  async function runSearch() {
    await Tb.runSearch(
      st,
      toolbarDom,
      searchPlacesWithManhattanFlag,
      randomManhattanLandmarkSuggestions,
      renderToolbarSearchResultsBound,
    );
  }

  attachSessionControls({
    form,
    statusEl,
    photoInput,
    photoPreviewEl,
    photoEmpty,
    st,
    areaInput,
    searchInput,
    toolbarDom,
    showAreaFieldHint,
    hideAreaFieldHint,
    hideAreaSuggest,
    scheduleAreaSearchFromInput,
    scheduleToolbarSearch,
    runSearch,
    setSelection,
    closeResultsUi,
    exitPlacementMode,
    hideSheetPreserveDraft,
    resolveAreaLabelForPublish,
  });

  sessionCleanup = createSessionCleanup({
    st,
    checkpointScroll,
    onCheckpointScroll,
    onDocPointerDownCapture,
    clearCleanupRef: () => {
      sessionCleanup = null;
    },
  });
  return sessionCleanup;
}
