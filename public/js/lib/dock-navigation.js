/**
 * Bottom dock hash links: force SPA route flush (WebKit / in-app browsers).
 */

import { requestRoute } from "./route-events.js";

export function installDockHashNavigation() {
  document.addEventListener(
    "click",
    (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest("a[href^='#/']");
      if (!a) return;
      if (!a.closest(".app-dock")) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#/")) return;
      e.preventDefault();
      if (href === "#/create") {
        if (location.hash !== "#/create") {
          location.hash = "#/create";
        }
        requestRoute(true);
        return;
      }
      if (location.hash !== href) {
        location.hash = href;
      }
      requestRoute();
    },
    false,
  );
}
