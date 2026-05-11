/**
 * Toolbar address search + geolocation for create-map.
 */
import { openAlertModal, escapeHtml, pointInManhattan } from "./create-map-utils.js";
import {
  TOOLBAR_SEARCH_DEBOUNCE_MS,
} from "./constants-theme.js";
import { MANHATTAN_ONLY_BODY, MANHATTAN_ONLY_TITLE } from "./manhattan-copy.js";
import { setStatus } from "./status.js";

/**
 * @param {{ map: object | null, searchLayer: object | null }} st
 * @param {{ resultsEl: HTMLElement, statusEl: HTMLElement }} dom
 * @param {Function} searchPlacesWithManhattanFlag
 * @param {Function} randomManhattanLandmarkSuggestions
 * @param {(lat: number, lng: number, areaHint: string | null, opts?: object) => void} setSelection
 */
export function renderToolbarSearchResults(
  st,
  dom,
  setSelection,
  places,
  options = {},
) {
  if (st.map && st.searchLayer) st.searchLayer.clearLayers();
  if (!places.length) {
    dom.resultsEl.innerHTML =
      '<p class="create-map-results-empty">No matches. Try different words or tap Search.</p>';
    dom.resultsEl.hidden = false;
    setStatus(dom.statusEl, "");
    return;
  }
  setStatus(dom.statusEl, options.statusHtml || "");
  const items = places
    .map((p, i) => {
      const outside = p.inManhattan === false;
      return `
      <button type="button" class="create-map-result-item${outside ? " is-outside" : ""}" data-i="${i}">
        <strong>${escapeHtml(p.shortLabel)}</strong>
        ${outside ? '<span class="geo-outside-badge">Outside Manhattan — cannot select</span>' : ""}
        <span class="create-map-result-sub">${escapeHtml(p.displayName)}</span>
      </button>`;
    })
    .join("");
  dom.resultsEl.innerHTML = items;
  dom.resultsEl.hidden = false;

  dom.resultsEl.querySelectorAll(".create-map-result-item").forEach((btn) => {
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

/**
 * @param {{ map: object | null, suggestLayer: object | null, toolbarSearchTimer: ReturnType<typeof setTimeout> | null }} st
 * @param {{ resultsEl: HTMLElement, statusEl: HTMLElement, searchInput: HTMLInputElement }} dom
 */
export function scheduleToolbarSearch(
  st,
  dom,
  searchPlacesWithManhattanFlag,
  renderToolbarSearchResultsBound,
) {
  if (st.toolbarSearchTimer) clearTimeout(st.toolbarSearchTimer);
  const q = dom.searchInput.value.trim();
  if (!q) {
    closeToolbarResults(st, dom);
    setStatus(dom.statusEl, "");
    return;
  }
  st.toolbarSearchTimer = window.setTimeout(async () => {
    st.toolbarSearchTimer = null;
    if (st.map && st.suggestLayer) st.suggestLayer.clearLayers();
    try {
      const flagged = await searchPlacesWithManhattanFlag(q);
      renderToolbarSearchResultsBound(flagged);
    } catch (err) {
      setStatus(
        dom.statusEl,
        `<div class="status-banner error">${escapeHtml(err.message || "Search failed.")}</div>`,
      );
      closeToolbarResults(st, dom);
    }
  }, TOOLBAR_SEARCH_DEBOUNCE_MS);
}

export function closeToolbarResults(st, dom) {
  dom.resultsEl.hidden = true;
  dom.resultsEl.innerHTML = "";
  if (st.map && st.searchLayer) st.searchLayer.clearLayers();
}

/**
 * @param {{ map: object | null, suggestLayer: object | null, toolbarSearchTimer: ReturnType<typeof setTimeout> | null }} st
 */
export async function runSearch(
  st,
  dom,
  searchPlacesWithManhattanFlag,
  randomManhattanLandmarkSuggestions,
  renderToolbarSearchResultsBound,
) {
  const q = dom.searchInput.value.trim();
  const btn = document.getElementById("create-map-search-btn");
  btn.disabled = true;
  if (st.map && st.suggestLayer) st.suggestLayer.clearLayers();
  if (st.toolbarSearchTimer) {
    clearTimeout(st.toolbarSearchTimer);
    st.toolbarSearchTimer = null;
  }
  try {
    if (!q) {
      const picks = randomManhattanLandmarkSuggestions(8);
      renderToolbarSearchResultsBound(picks, {
        statusHtml:
          '<p class="card-meta create-map-search-ideas-note">Famous Manhattan spots — tap <strong>Search</strong> again for another mix.</p>',
      });
      return;
    }
    const flagged = await searchPlacesWithManhattanFlag(q);
    renderToolbarSearchResultsBound(flagged);
  } catch (err) {
    setStatus(
      dom.statusEl,
      `<div class="status-banner error">${escapeHtml(err.message || "Search failed.")}</div>`,
    );
    closeToolbarResults(st, dom);
  } finally {
    btn.disabled = false;
  }
}

/**
 * @param {{ lastPlayerLatLng: { lat: number, lng: number } | null }} st
 */
export function bindLocateButton(st, dom, setSelection, closeResultsUiFn) {
  document.getElementById("create-map-locate-btn").addEventListener("click", () => {
    if (!navigator.geolocation) {
      setStatus(
        dom.statusEl,
        '<div class="status-banner error">This browser does not support location.</div>',
      );
      return;
    }
    setStatus(dom.statusEl, '<div class="status-banner info">Getting your location…</div>');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        closeResultsUiFn();

        if (!pointInManhattan(lat, lng)) {
          setStatus(
            dom.statusEl,
            '<div class="status-banner error">Your location is outside Manhattan. Search or pick a spot on the island.</div>',
          );
          void openAlertModal({
            title: MANHATTAN_ONLY_TITLE,
            message: MANHATTAN_ONLY_BODY,
            okText: "OK",
          });
          return;
        }

        st.lastPlayerLatLng = { lat, lng };
        setStatus(
          dom.statusEl,
          '<div class="status-banner ok">Checkpoint set to your current location. Tap a green suggestion to move it if you want.</div>',
        );
        setSelection(lat, lng, null, { source: "location" });
      },
      () => {
        setStatus(
          dom.statusEl,
          '<div class="status-banner error">Could not read location. Check browser permissions.</div>',
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  });
}
