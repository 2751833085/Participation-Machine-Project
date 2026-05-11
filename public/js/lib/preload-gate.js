/**
 * Shared first-reveal gate for routes whose first paint depends on
 * remote data + images + custom fonts. Used by Hunts, Rank, Saved.
 *
 * Why this exists:
 *   - Without a gate, the route paints before Barlow Condensed loads,
 *     so titles flash in the system fallback first ("字体错误").
 *   - The global `motion-image` entry adds opacity:0 + scale + blur(3px)
 *     to every <img> until its `load` event fires — combined with a
 *     fade-in this produced the "虚的" hazy reveal the user reported.
 *
 * What it does:
 *   1. Adds `.neo-preload-gate.is-prepping` to a container so it's
 *      laid out (browsers fetch images in flow) but invisible.
 *   2. Promotes every `<img>` inside to `loading="eager"` and pre-marks
 *      them with `motion-image is-loaded` so the global blur/scale
 *      entry animation is skipped for the first batch.
 *   3. Awaits `img.decode()` on every image (truly ready-to-paint) +
 *      `document.fonts.ready` (so titles don't reflow into Barlow mid-anim).
 *   4. Caps the wait so a single slow CDN response can't stall the route.
 *   5. Removes `is-prepping`, adds `is-ready` → CSS handles the fade.
 *
 * Usage:
 *   import { gateRoutePreload } from "../lib/preload-gate.js";
 *
 *   // After you set the container's innerHTML for the first time:
 *   gateRoutePreload(containerEl);
 */

const DEFAULT_TIMEOUT_MS = 3500;

/**
 * Wait for an <img> to be fully decoded (not just fetched) so the next
 * paint is crisp.
 */
export function awaitImageDecoded(img) {
  if (img.complete && img.naturalWidth > 0) {
    if (typeof img.decode === "function") {
      return img.decode().catch(() => undefined);
    }
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const finish = () => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", finish);
      resolve();
    };
    const onLoad = () => {
      if (typeof img.decode === "function") {
        img.decode().catch(() => undefined).finally(finish);
      } else {
        finish();
      }
    };
    img.addEventListener("load", onLoad, { once: true });
    img.addEventListener("error", finish, { once: true });
  });
}

/**
 * Hold a container hidden until all of its `<img>` children have
 * decoded and document fonts have loaded. Resolves once the surface
 * is revealed (or the timeout fires).
 *
 * @param {HTMLElement | null | undefined} container
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<void>}
 */
export function gateRoutePreload(container, opts = {}) {
  if (!container) return Promise.resolve();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  container.classList.add("neo-preload-gate", "is-prepping");
  container.classList.remove("is-ready");

  const imgs = container.querySelectorAll("img");
  imgs.forEach((img) => {
    img.loading = "eager";
    // Skip the global blur+scale entry — the gate already reveals the
    // whole surface in one piece, and the per-image fade just creates
    // the hazy first-frame the user complained about.
    img.classList.add("motion-image", "is-loaded");
  });

  const settled = Promise.all(Array.from(imgs).map(awaitImageDecoded));
  const fonts =
    typeof document !== "undefined" && document.fonts?.ready
      ? document.fonts.ready
      : Promise.resolve();
  const ready = Promise.all([settled, fonts]);
  const timeout = new Promise((resolve) => {
    window.setTimeout(resolve, timeoutMs);
  });

  return Promise.race([ready, timeout]).then(() => {
    // Container could have been swapped/unmounted while we waited.
    if (!container.isConnected) return;
    container.classList.remove("is-prepping");
    container.classList.add("is-ready");
  });
}
