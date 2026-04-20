/**
 * Short-lived message bar at the top of the viewport (below offline banner).
 */

import { escapeHtml } from "./utils.js";

/**
 * @param {string} message — shown as plain text (escaped)
 * @param {{ durationMs?: number }} [opts]
 */
export function showAppToast(message, opts = {}) {
  const durationMs = opts.durationMs ?? 3800;
  const wrap = document.createElement("div");
  wrap.className = "app-toast-host";
  wrap.innerHTML = `<div class="app-toast" role="status">${escapeHtml(message)}</div>`;
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
