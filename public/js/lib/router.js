/**
 * Hash-based client-side router.
 * Routes follow the pattern: #/page  or  #/page/id
 */

import { requestRoute } from "./route-events.js";

export function parseRoute() {
  const raw = (location.hash || "#/").replace(/^#/, "") || "/";
  /** Firebase redirect appends ?apiKey&mode=… to the hash; strip or page becomes "login?apiKey…" and breaks routing. */
  const pathOnly = raw.split("?")[0] || "/";
  const parts = pathOnly.split("/").filter(Boolean);
  const page = parts[0] || "home";
  return { page, id: parts[1] ?? null };
}

/**
 * Programmatic navigation. Always schedule a route flush: some browsers skip or defer
 * `hashchange`, so the URL can update while the UI stays on the old page.
 * @param {string} to
 * @param {{ force?: boolean }} [opts] — `force: true` re-renders when the hash is unchanged (same as `requestRoute(true)`).
 */
export function nav(to, opts) {
  const force = opts && opts.force === true;
  const h = to.startsWith("#") ? to : `#${to}`;
  if (location.hash !== h) {
    location.hash = h;
  }
  requestRoute(force);
}
