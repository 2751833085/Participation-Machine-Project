import { CHECKPOINT_RADIUS_M } from "./constants-theme.js";
import { isCoarsePointer } from "./theme.js";
import * as Af from "./area-field.js";
import * as Lf from "./leaflet-host.js";
import { attachCreateMapPublishHandler } from "./publish-flow.js";
import * as Tb from "./toolbar-search.js";

export function updateFsHintForSession(st, fsHint) {
  if (!fsHint || !st.placementActive) return;
  if (st.selected) {
    fsHint.textContent = st.lastPlayerLatLng
      ? `The shaded circle is your ~${CHECKPOINT_RADIUS_M} m checkpoint zone. Tap a green dot or “You are here” on the map to move it, or adjust the area field.`
      : `The shaded circle is your ~${CHECKPOINT_RADIUS_M} m checkpoint zone (from search). Adjust the area field or pick another result — map is preview-only.`;
    return;
  }
  fsHint.textContent = isCoarsePointer()
    ? "Drag or pinch the map · tap a green suggestion or You are here to set the checkpoint."
    : "Drag or scroll the map · tap a green suggestion or You are here to set the checkpoint.";
}

export function syncMinutesOutForSession(minutesRange, minutesOut) {
  if (!minutesRange || !minutesOut) return;
  const v = parseInt(minutesRange.value, 10) || 30;
  minutesOut.textContent = `${v} min`;
}

export function movePinToPlaceForSession(ctx, place) {
  const { st, areaInput, sheet } = ctx;
  const label = `${place.shortLabel}, Manhattan`;
  st.selected = { lat: place.lat, lng: place.lng };
  st.selectedSource = "search";
  areaInput.value = label;
  st.lastAreaPick = { lat: place.lat, lng: place.lng, label };
  areaInput.dataset.userEdited = "1";
  st.selectRadiusCircle?.setLatLng([place.lat, place.lng]);
  st.checkpointCenterMarker?.setLatLng([place.lat, place.lng]);
  ctx.updateCoordsLine();
  ctx.enterPlacementMode();
  ctx.updateFsHint();
  ctx.syncCheckpointEntrypoints();
  ctx.renderPinAreaChips();
  Lf.afterExpandedMapLayout(() => {
    Lf.focusMapOnPin(st, place.lat, place.lng, () => {
      settleMovedPinFocus(ctx, sheet);
    });
  });
}

function settleMovedPinFocus(ctx, sheet) {
  if (sheet.classList.contains("is-open")) {
    Lf.lockCheckpointDetailZoom(ctx.st);
    Lf.snapPinToReferenceFrame(ctx.st, sheet, ctx.mapPinReadOnly, Lf.centerPinAboveSheet);
  }
  ctx.refreshPlacementSuggestionMarkers();
}

export function resetAreaFieldForEditSession(
  st,
  areaInput,
  areaSuggestDom,
  showAreaFieldHint,
  hideAreaSuggest,
  selectAreaSuggestionRow,
) {
  if (st.areaBlurTimer) {
    clearTimeout(st.areaBlurTimer);
    st.areaBlurTimer = null;
  }
  areaInput.value = "";
  st.lastAreaPick = null;
  delete areaInput.dataset.userEdited;
  areaInput.focus();
  showAreaFieldHint();
  Af.showNearbyAreaSuggest(st, areaSuggestDom, hideAreaSuggest, selectAreaSuggestionRow);
}

export function hideAreaSuggestFromOutsidePointer(e, areaComboboxWrap, hideAreaSuggest) {
  if (!areaComboboxWrap.contains(e.target)) hideAreaSuggest();
}

export function updateCoordsLineForSession(st, coordsLine) {
  if (!st.selected) return;
  const sourceText = st.selectedSource === "location" ? "from my location" : "from search";
  coordsLine.textContent = `Checkpoint zone · ~${CHECKPOINT_RADIUS_M} m radius · ${st.selected.lat.toFixed(5)}, ${st.selected.lng.toFixed(5)} · ${sourceText}`;
}

export function attachSessionControls(ctx) {
  const {
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
  } = ctx;

  document.getElementById("create-map-shrink").addEventListener("click", () => {
    exitPlacementMode();
  });

  areaInput.addEventListener("focus", () => {
    if (st.areaBlurTimer) {
      clearTimeout(st.areaBlurTimer);
      st.areaBlurTimer = null;
    }
    showAreaFieldHint();
    scheduleAreaSearchFromInput();
  });

  areaInput.addEventListener("blur", () => {
    st.areaBlurTimer = window.setTimeout(() => {
      hideAreaFieldHint();
      hideAreaSuggest();
      st.areaBlurTimer = null;
    }, 220);
  });

  areaInput.addEventListener("input", () => {
    areaInput.dataset.userEdited = "1";
    st.lastAreaPick = null;
    scheduleAreaSearchFromInput();
  });

  photoInput.addEventListener("change", () => {
    updatePhotoPreview(st, photoInput, photoPreviewEl, photoEmpty);
  });

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

  Tb.bindLocateButton(st, toolbarDom, setSelection, closeResultsUi);

  attachCreateMapPublishHandler({
    form,
    statusEl,
    photoInput,
    st,
    resolveAreaLabelForPublish,
  });

  hideSheetPreserveDraft();
}

function updatePhotoPreview(st, photoInput, photoPreviewEl, photoEmpty) {
  const f = photoInput.files?.[0];
  if (st.photoObjectUrl) {
    URL.revokeObjectURL(st.photoObjectUrl);
    st.photoObjectUrl = null;
  }
  if (!f) {
    photoPreviewEl.hidden = true;
    photoPreviewEl.innerHTML = "";
    photoEmpty.hidden = false;
    return;
  }
  st.photoObjectUrl = URL.createObjectURL(f);
  photoPreviewEl.innerHTML = `<img src="${st.photoObjectUrl}" alt="" class="photo-drop-img" />`;
  photoPreviewEl.hidden = false;
  photoEmpty.hidden = true;
}

export function createSessionCleanup(ctx) {
  const {
    st,
    checkpointScroll,
    onCheckpointScroll,
    onDocPointerDownCapture,
    clearCleanupRef,
  } = ctx;

  return () => {
    if (st.areaSearchTimer) clearTimeout(st.areaSearchTimer);
    if (st.toolbarSearchTimer) clearTimeout(st.toolbarSearchTimer);
    if (st.areaBlurTimer) clearTimeout(st.areaBlurTimer);
    document.body.classList.remove("sheet-is-dragging");
    document.removeEventListener("pointerdown", onDocPointerDownCapture, true);
    checkpointScroll?.removeEventListener("scroll", onCheckpointScroll);
    if (st.map) {
      st.map.remove();
    }
    st.map = null;
    st.searchLayer = null;
    st.suggestLayer = null;
    st.playerLayer = null;
    st.playerMarker = null;
    st.checkpointCenterMarker = null;
    st.selectRadiusCircle = null;
    if (st.photoObjectUrl) URL.revokeObjectURL(st.photoObjectUrl);
    document.body.classList.remove("create-map-fs-open");
    document.body.style.overflow = "";
    clearCleanupRef();
  };
}
