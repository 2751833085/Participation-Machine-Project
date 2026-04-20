/**
 * Top offline banner: navigator onLine/offline + fetch probe.
 * Reconnect reloads the page so the SPA and Firestore listeners cold-start cleanly.
 */

const PROBE_MS = 8000;

let windowListenersInstalled = false;

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

function installWindowListenersOnce() {
  if (windowListenersInstalled) return;
  windowListenersInstalled = true;
  window.addEventListener("online", () => void onBrowserOnline());
  window.addEventListener("offline", () => onBrowserOffline());
}

/**
 * Call after each `renderShell` (banner node is recreated). Wires window listeners once.
 * Reconnect is bound on the fresh button each time — avoids relying on a single document delegate.
 * Uses `navigator.onLine` only here so navigation stays cheap; `online` runs a fetch probe.
 */
export function refreshNetworkBanner() {
  installWindowListenersOnce();

  const btn = reconnectBtn();
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      btn.disabled = true;
      window.location.reload();
    });
  }

  if (!navigator.onLine) {
    requestAnimationFrame(() => setOfflineBannerVisible(true));
    return;
  }
  setOfflineBannerVisible(false);
}
