/**
 * Challenge detail — Leaflet preview for hunt start zone + optional player dot.
 */
const MAP_MAX_ZOOM = 20;
/** Keep some street context around the 150 m circle. */
const CHALLENGE_MAP_MAX_ZOOM = 16;
const START_HUNT_MAX_DISTANCE_M = 150;

let challengeMapCleanup = null;

function tileUrlForTheme() {
  return effectiveTheme() === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
}

function effectiveTheme() {
  const stored = localStorage.getItem("tm-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function presenceIcon(kind) {
  return window.L.divIcon({
    className: `map-presence map-presence--${kind}`,
    html: '<span class="map-presence-pulse" aria-hidden="true"></span><span class="map-presence-core" aria-hidden="true"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function getGeoPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This device does not support GPS."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      (err) => reject(new Error(err?.message || "Could not read your location. Allow location access and try again.")),
      {
        enableHighAccuracy: true,
        maximumAge: options.maximumAge ?? 0,
        timeout: options.timeout ?? 20000,
      },
    );
  });
}

export function destroyChallengeMap() {
  if (challengeMapCleanup) {
    challengeMapCleanup();
    challengeMapCleanup = null;
  }
}

function fitHuntFrame(ctx) {
  const { anchor, huntCircle } = ctx;
  const map = ctx.map;
  if (!map?.getContainer?.()) return;
  const sz = map.getSize();
  if (!sz || sz.x < 8 || sz.y < 8) return;
  map.invalidateSize({ animate: false });
  try {
    map.fitBounds(huntCircle.getBounds(), {
      padding: [28, 28],
      maxZoom: CHALLENGE_MAP_MAX_ZOOM,
      animate: false,
    });
  } catch {
    map.setView([anchor.lat, anchor.lng], CHALLENGE_MAP_MAX_ZOOM, {
      animate: false,
    });
  }
}

function removePlayerMarker(ctx) {
  if (ctx.playerMarker) {
    ctx.playerMarker.remove();
    ctx.playerMarker = null;
  }
}

function syncPlayerMarker(ctx, pos) {
  const { L } = ctx;
  const map = ctx.map;
  if (!map || !pos) return;
  const ll = L.latLng(pos.lat, pos.lng);
  if (!validLatLng(ll)) return;
  const bounds = visibleMapBounds(map);
  if (!boundsContainsLatLng(bounds, ll)) {
    removePlayerMarker(ctx);
    return;
  }
  upsertPlayerMarker(ctx, ll);
}

function validLatLng(ll) {
  return Number.isFinite(ll.lat) && Number.isFinite(ll.lng);
}

function visibleMapBounds(map) {
  try {
    const sz = map.getSize();
    if (!sz || sz.x < 8 || sz.y < 8) return null;
    return map.getBounds();
  } catch {
    return null;
  }
}

function boundsContainsLatLng(bounds, ll) {
  return Boolean(bounds?.contains?.(ll));
}

function upsertPlayerMarker(ctx, ll) {
  if (ctx.playerMarker) {
    ctx.playerMarker.setLatLng(ll);
    return;
  }
  ctx.playerMarker = ctx.L.marker(ll, {
    icon: presenceIcon("player"),
    interactive: false,
    keyboard: false,
  }).addTo(ctx.map);
}

function setRefreshBusy(refreshBtn, busy) {
  if (!refreshBtn) return;
  refreshBtn.disabled = busy;
  refreshBtn.classList.toggle("is-busy", busy);
}

async function refreshPlayerLocation(ctx) {
  if (!ctx.map || ctx.refreshing) return;
  ctx.refreshing = true;
  setRefreshBusy(ctx.refreshBtn, true);
  try {
    const pos = await getGeoPosition({ maximumAge: 0 });
    syncPlayerMarker(ctx, { lat: pos.lat, lng: pos.lng });
  } catch {
    removePlayerMarker(ctx);
  } finally {
    ctx.refreshing = false;
    setRefreshBusy(ctx.refreshBtn, false);
  }
}

/**
 * Map is framed on the hunt anchor + 150 m circle. Player (green) is shown only if
 * the current fix lies inside the visible bounds (off-screen = hidden).
 */
export function mountChallengeStartMap(anchor) {
  const host = document.getElementById("challenge-start-map-host");
  const mapEl = document.getElementById("challenge-start-map");
  const refreshBtn = document.getElementById("challenge-map-refresh");
  if (!host || !mapEl || !window.L) return;

  const L = window.L;
  const ctx = {
    L,
    anchor,
    huntCircle: null,
    map: L.map(mapEl, {
      zoomControl: false,
      attributionControl: false,
      maxZoom: MAP_MAX_ZOOM,
    }),
    playerMarker: null,
    refreshing: false,
    refreshBtn,
  };

  const map = ctx.map;

  /* Leaflet needs a real view + non-zero container before fitBounds / getBounds
   * (otherwise layerPointToLatLng can run against an undefined map state). */
  map.setView([anchor.lat, anchor.lng], 15, { animate: false });

  L.control.zoom({ position: "topright" }).addTo(map);

  L.tileLayer(tileUrlForTheme(), {
    attribution: "",
    subdomains: "abcd",
    maxZoom: MAP_MAX_ZOOM,
    maxNativeZoom: MAP_MAX_ZOOM,
  }).addTo(map);

  const zoneAccent = "#e6b847";
  ctx.huntCircle = L.circle([anchor.lat, anchor.lng], {
    radius: START_HUNT_MAX_DISTANCE_M,
    color: zoneAccent,
    weight: 2,
    opacity: 0.85,
    fillColor: zoneAccent,
    fillOpacity: 0.12,
    interactive: false,
  }).addTo(map);

  L.marker([anchor.lat, anchor.lng], {
    icon: presenceIcon("checkpoint"),
    interactive: false,
    keyboard: false,
  }).addTo(map);

  map.whenReady(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!ctx.map) return;
        fitHuntFrame(ctx);
        void refreshPlayerLocation(ctx);
      });
    });
  });

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => void refreshPlayerLocation(ctx));
  }

  challengeMapCleanup = () => {
    if (ctx.map) {
      ctx.map.remove();
      ctx.map = null;
    }
    ctx.playerMarker = null;
  };
}
