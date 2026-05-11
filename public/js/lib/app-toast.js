/**
 * Short-lived message bar at the top of the viewport (below offline banner).
 */

import { escapeHtml } from "./html.js";

/**
 * @param {string} message — shown as plain text (escaped)
 * @param {{ durationMs?: number }} [opts]
 */
export function showAppToast(message, opts = {}) {
  const durationMs = opts.durationMs ?? 3800;
  const wrap = document.createElement("div");
  wrap.className = "app-toast-host ds-banner-host";
  wrap.innerHTML = `<div class="app-toast ds-banner ds-banner--toast" role="status"><span class="ds-banner__icon" aria-hidden="true">✓</span><span class="ds-banner__text">${escapeHtml(message)}</span></div>`;
  const bar = wrap.firstElementChild;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => {
    bar?.classList.add("app-toast--in");
  });
  const hide = () => {
    bar?.classList.remove("app-toast--in");
    bar?.classList.add("app-toast--out");
    setTimeout(() => wrap.remove(), 320);
  };
  const t = window.setTimeout(hide, durationMs);
  wrap.addEventListener(
    "click",
    () => {
      window.clearTimeout(t);
      hide();
    },
    { once: true },
  );
}
