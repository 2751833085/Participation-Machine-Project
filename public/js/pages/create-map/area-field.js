/**
 * Area / neighborhood combobox, chips, and publish-time label resolution for create-map.
 */
import { openAlertModal, openConfirmModal, escapeHtml, AREA_PIN_MISMATCH_METERS, haversineMeters, nearestNeighborhoodPicks, reverseGeocodeLabel, searchPlacesWithManhattanFlag } from "./create-map-utils.js";
import {
  AREA_PIN_CHIP_COUNT,
  AREA_SEARCH_DEBOUNCE_MS,
  NEAR_USER_CHIP_PRIORITY,
} from "./constants-theme.js";
import { MANHATTAN_ONLY_BODY, MANHATTAN_ONLY_TITLE } from "./manhattan-copy.js";

/** @param {{ key?: string, lat: number, lng: number }} p */
export function centroidDedupeKey(p) {
  return p.key || `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
}

/**
 * @param {{ selected: { lat: number, lng: number } | null, lastPlayerLatLng: { lat: number, lng: number } | null }} st
 */
export function buildMergedNeighborhoodList(st, limit) {
  if (!st.selected) return [];
  const pinLat = st.selected.lat;
  const pinLng = st.selected.lng;
  if (!st.lastPlayerLatLng) {
    return nearestNeighborhoodPicks(pinLat, pinLng, limit).map((p) => ({
      pick: p,
      nearYou: false,
    }));
  }
  const userCap = Math.min(NEAR_USER_CHIP_PRIORITY, limit);
  const userTop = nearestNeighborhoodPicks(
    st.lastPlayerLatLng.lat,
    st.lastPlayerLatLng.lng,
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

/** @param {{ selected: object | null, lastPlayerLatLng: object | null }} st */
export function nearbyAreaRows(st) {
  if (!st.selected) return [];
  return buildMergedNeighborhoodList(st, 8).map(({ pick: p, nearYou }) => ({
    lat: p.lat,
    lng: p.lng,
    shortLabel: p.label,
    displayName: nearYou ? `${p.label} · near you` : `${p.label} · near checkpoint`,
    inManhattan: true,
  }));
}

/** @param {{ selected: object | null, lastPlayerLatLng: object | null }} st */
export function pinNeighborhoodChipRows(st) {
  if (!st.selected) return [];
  return buildMergedNeighborhoodList(st, AREA_PIN_CHIP_COUNT).map(({ pick: p, nearYou }) => ({
    lat: p.lat,
    lng: p.lng,
    shortLabel: `${p.label}, Manhattan`,
    displayName: nearYou ? `${p.label} · near you` : `${p.label} · near checkpoint`,
    inManhattan: true,
  }));
}

export function setAreaListOpen(areaInput, open) {
  areaInput.setAttribute("aria-expanded", open ? "true" : "false");
}

export function hideAreaSuggest(areaInput, areaSuggestList) {
  areaSuggestList.hidden = true;
  areaSuggestList.innerHTML = "";
  setAreaListOpen(areaInput, false);
}

export function showAreaFieldHint(areaFieldHint) {
  if (areaFieldHint) areaFieldHint.hidden = false;
}

export function hideAreaFieldHint(areaFieldHint) {
  if (areaFieldHint) areaFieldHint.hidden = true;
}

/**
 * @param {{ selected: object | null, lastAreaPick: object | null }} st
 * @param {{ areaPinSuggest: HTMLElement, areaPinSuggestChips: HTMLElement, areaInput: HTMLInputElement }} dom
 */
export function renderPinAreaChips(st, dom, hideAreaSuggestFn) {
  if (!dom.areaPinSuggest || !dom.areaPinSuggestChips) return;
  if (!st.selected) {
    dom.areaPinSuggest.hidden = true;
    dom.areaPinSuggestChips.innerHTML = "";
    return;
  }
  const rows = pinNeighborhoodChipRows(st);
  if (!rows.length) {
    dom.areaPinSuggest.hidden = true;
    dom.areaPinSuggestChips.innerHTML = "";
    return;
  }
  dom.areaPinSuggest.hidden = false;
  dom.areaPinSuggestChips.innerHTML = rows
    .map(
      (r, i) =>
        `<button type="button" class="area-pin-chip" data-i="${i}">${escapeHtml(r.shortLabel)}</button>`,
    )
    .join("");
  dom.areaPinSuggestChips.querySelectorAll(".area-pin-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.dataset.i, 10);
      const row = rows[i];
      if (!row) return;
      dom.areaInput.value = row.shortLabel;
      st.lastAreaPick = {
        lat: row.lat,
        lng: row.lng,
        label: row.shortLabel,
      };
      dom.areaInput.dataset.userEdited = "1";
      hideAreaSuggestFn();
    });
  });
}

/**
 * @param {{ selected: { lat: number, lng: number } | null }} st
 * @param {{ areaInput: HTMLInputElement }} dom
 */
export async function resolveAreaLabelForPublish(st, dom) {
  const trimmed = dom.areaInput.value.trim();
  if (trimmed) return trimmed;
  if (!st.selected) {
    throw new Error("Choose a checkpoint on the map first.");
  }
  const near = nearestNeighborhoodPicks(st.selected.lat, st.selected.lng, 1)[0];
  if (near) {
    const label = `${near.label}, Manhattan`;
    dom.areaInput.value = label;
    st.lastAreaPick = { lat: near.lat, lng: near.lng, label };
    return label;
  }
  const geo = await reverseGeocodeLabel(st.selected.lat, st.selected.lng);
  const g = String(geo || "").trim();
  if (g) {
    dom.areaInput.value = g;
    return g;
  }
  throw new Error("Add an area / neighborhood (or tap a suggestion under the field).");
}

export function renderAreaSuggestItems(
  dom,
  rows,
  hideAreaSuggestFn,
  selectAreaSuggestionFn,
) {
  if (!rows.length) {
    hideAreaSuggestFn();
    return;
  }
  dom.areaSuggestList.innerHTML = rows
    .map((r, i) => {
      const outside = r.inManhattan === false;
      return `
      <li role="option" tabindex="-1">
        <button type="button" class="area-suggest-item${outside ? " is-outside" : ""}" data-i="${i}">
          <span class="area-suggest-primary">${escapeHtml(r.shortLabel)}</span>
          ${outside ? '<span class="geo-outside-badge">Outside Manhattan — cannot select</span>' : ""}
          <span class="area-suggest-secondary">${escapeHtml(r.displayName)}</span>
        </button>
      </li>`;
    })
    .join("");
  dom.areaSuggestList.hidden = false;
  setAreaListOpen(dom.areaInput, true);
  dom.areaSuggestList.querySelectorAll(".area-suggest-item").forEach((btn) => {
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
      await selectAreaSuggestionFn(row);
    });
  });
}

/** @param {{ selected: object | null }} st */
export function showNearbyAreaSuggest(st, dom, hideAreaSuggestFn, selectAreaSuggestionFn) {
  if (!st.selected) return;
  renderAreaSuggestItems(dom, nearbyAreaRows(st), hideAreaSuggestFn, selectAreaSuggestionFn);
}

/**
 * @param {{ areaSearchTimer: ReturnType<typeof setTimeout> | null }} st
 */
export function scheduleAreaSearch(
  st,
  dom,
  hideAreaSuggestFn,
  selectAreaSuggestionFn,
) {
  if (st.areaSearchTimer) clearTimeout(st.areaSearchTimer);
  const query = dom.areaInput.value.trim();
  if (!query) {
    showNearbyAreaSuggest(st, dom, hideAreaSuggestFn, selectAreaSuggestionFn);
    return;
  }
  st.areaSearchTimer = window.setTimeout(async () => {
    st.areaSearchTimer = null;
    try {
      const flagged = await searchPlacesWithManhattanFlag(query);
      renderAreaSuggestItems(
        dom,
        flagged.length ? flagged : nearbyAreaRows(st),
        hideAreaSuggestFn,
        selectAreaSuggestionFn,
      );
    } catch {
      renderAreaSuggestItems(dom, nearbyAreaRows(st), hideAreaSuggestFn, selectAreaSuggestionFn);
    }
  }, AREA_SEARCH_DEBOUNCE_MS);
}

/**
 * @param {{ selected: { lat: number, lng: number } | null }} st
 * @param {{ areaInput: HTMLInputElement }} dom
 * @param {{ movePinToPlace: (place: object) => void, resetAreaFieldForEdit: () => void, hideAreaSuggestFn: () => void }} actions
 */
export async function selectAreaSuggestion(st, dom, place, actions) {
  if (!st.selected) return;
  if (place.inManhattan === false) {
    await openAlertModal({
      title: MANHATTAN_ONLY_TITLE,
      message: MANHATTAN_ONLY_BODY,
      okText: "OK",
    });
    return;
  }
  const dist = haversineMeters(
    st.selected.lat,
    st.selected.lng,
    place.lat,
    place.lng,
  );
  const label = `${place.shortLabel}, Manhattan`;

  if (dist > AREA_PIN_MISMATCH_METERS) {
    const m = Math.round(dist);
    actions.hideAreaSuggestFn();
    const ok = await openConfirmModal({
      title: "Far from your checkpoint",
      message: `This place is about ${m} m from your current checkpoint.\n\nUpdate the checkpoint to this address?`,
      confirmText: "Yes, update",
      cancelText: "No, edit address",
    });
    if (ok) {
      actions.movePinToPlace(place);
    } else {
      actions.resetAreaFieldForEdit();
    }
    return;
  }

  dom.areaInput.value = label;
  st.lastAreaPick = { lat: place.lat, lng: place.lng, label };
  dom.areaInput.dataset.userEdited = "1";
  actions.hideAreaSuggestFn();
}
