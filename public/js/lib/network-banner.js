/**
 * Top offline banner: navigator onLine/offline + fetch probe + Reconnect.
 */

const PROBE_MS = 8000;

let listenersInstalled = false;
let reconnectBusy = false;

function bannerEl() {
  return document.getElementById("network-offline-banner");
}

function reconnectBtn() {
  return document.getElementById("network-reconnect-btn");
}

export function setOfflineBannerVisible(visible) {
  const el = bannerEl();
  if (!el) return;
  el.classList.toggle("network-offline-banner--visible", Boolean(visible));
  el.setAttribute("aria-hidden", visible ? "false" : "true");
  document.body.classList.toggle("network-offline-active", Boolean(visible));
}

/**
 * True if we can reach the app origin (same host as the SPA).
 */
export async function probeConnectivity() {
  const probeUrl = `${location.origin}/?nc=${Date.now()}`;

  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), PROBE_MS);
  try {
    const res = await fetch(probeUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(t);
  }
}

async function onBrowserOnline() {
  const ok = await probeConnectivity();
  setOfflineBannerVisible(!ok);
}

function onBrowserOffline() {
  setOfflineBannerVisible(true);
}

async function onReconnectClick() {
  if (reconnectBusy) return;
  const btn = reconnectBtn();
  reconnectBusy = true;
  if (btn) btn.disabled = true;
  try {
    const ok = await probeConnectivity();
    setOfflineBannerVisible(!ok);
  } finally {
    reconnectBusy = false;
    if (btn) btn.disabled = false;
  }
}

function installListenersOnce() {
  if (listenersInstalled) return;
  listenersInstalled = true;
  window.addEventListener("online", () => void onBrowserOnline());
  window.addEventListener("offline", () => onBrowserOffline());
  document.addEventListener(
    "click",
    (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const btn = e.target.closest("#network-reconnect-btn");
      if (!btn) return;
      e.preventDefault();
      void onReconnectClick();
    },
    false,
  );
}

/**
 * Call after each `renderShell` (banner node is recreated). Wires window listeners once.
 * Uses `navigator.onLine` only here so navigation stays cheap; `online` / Reconnect run a real fetch probe.
 */
export function refreshNetworkBanner() {
  installListenersOnce();
  if (!navigator.onLine) {
    requestAnimationFrame(() => setOfflineBannerVisible(true));
    return;
  }
  setOfflineBannerVisible(false);
}
