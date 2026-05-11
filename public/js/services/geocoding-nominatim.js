/**
 * Nominatim (OSM) fetch with polite rate limiting.
 * @see geocoding.js
 */

const NOMINATIM = "https://nominatim.openstreetmap.org";

const UA =
  "TouristManhunt/1.0 (participation scavenger hunt app; educational use)";

let lastNominatimAt = 0;
const NOMINATIM_MIN_GAP_MS = 1100;

/** @param {string} pathWithQuery Path + query string beginning with '/' */
export async function nominatimFetch(pathWithQuery) {
  const now = Date.now();
  const wait = Math.max(0, NOMINATIM_MIN_GAP_MS - (now - lastNominatimAt));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimAt = Date.now();

  const res = await fetch(`${NOMINATIM}${pathWithQuery}`, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
      "User-Agent": UA,
    },
  });
  if (!res.ok) throw new Error("Address lookup failed. Try again in a moment.");
  return res.json();
}
