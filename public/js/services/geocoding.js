/**
 * Manhattan-focused geocoding via Nominatim (OSM) + local neighborhood picks.
 * https://operations.osmfoundation.org/policies/nominatim/
 */

import {
  MANHATTAN_CENTROIDS,
  pointInManhattan,
} from "./challenges.js";

const NOMINATIM = "https://nominatim.openstreetmap.org";

const UA =
  "TouristManhunt/1.0 (participation scavenger hunt app; educational use)";

let lastNominatimAt = 0;
const NOMINATIM_MIN_GAP_MS = 1100;

async function nominatimFetch(pathWithQuery) {
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

function dist2(latA, lngA, latB, lngB) {
  const dLat = latA - latB;
  const dLng = lngA - lngB;
  return dLat * dLat + dLng * dLng;
}

/** If chosen address and map pin differ by more than this, ask to move pin. */
export const AREA_PIN_MISMATCH_METERS = 380;

export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Curated Manhattan landmarks (aliases + coords) so short queries like "wtc" or
 * "帝国大厦" still get stable suggestions when Nominatim is sparse.
 */
const MANHATTAN_LANDMARKS = [
  {
    shortLabel: "Empire State Building",
    displayName: "Empire State Building, Midtown Manhattan",
    lat: 40.748817,
    lng: -73.985428,
    aliases: ["empire state", "empire state building", "帝国大厦", "esb"],
  },
  {
    shortLabel: "World Trade Center",
    displayName: "World Trade Center, Financial District, Manhattan",
    lat: 40.712742,
    lng: -74.013382,
    aliases: [
      "wtc",
      "world trade",
      "world trade center",
      "freedom tower",
      "one world trade",
      "oculus",
      "世贸",
      "世贸中心",
      "世界贸易中心",
    ],
  },
  {
    shortLabel: "Chrysler Building",
    displayName: "Chrysler Building, Midtown Manhattan",
    lat: 40.751613,
    lng: -73.975554,
    aliases: ["chrysler", "chrysler building"],
  },
  {
    shortLabel: "Grand Central Terminal",
    displayName: "Grand Central Terminal, Midtown Manhattan",
    lat: 40.752726,
    lng: -73.977229,
    aliases: ["grand central", "grand central terminal"],
  },
  {
    shortLabel: "Times Square",
    displayName: "Times Square, Midtown Manhattan",
    lat: 40.758896,
    lng: -73.98513,
    aliases: ["times square", "时代广场"],
  },
  {
    shortLabel: "Flatiron Building",
    displayName: "Flatiron Building, Flatiron District, Manhattan",
    lat: 40.741061,
    lng: -73.989699,
    aliases: ["flatiron", "flatiron building"],
  },
  {
    shortLabel: "Rockefeller Center",
    displayName: "Rockefeller Center, Midtown Manhattan",
    lat: 40.75874,
    lng: -73.978674,
    aliases: ["rockefeller", "rockefeller center", "top of the rock"],
  },
  {
    shortLabel: "The Metropolitan Museum of Art",
    displayName: "The Met, Upper East Side, Manhattan",
    lat: 40.779437,
    lng: -73.963244,
    aliases: ["met museum", "the met", "metropolitan museum"],
  },
  {
    shortLabel: "Central Park (Bethesda Terrace)",
    displayName: "Central Park, Manhattan",
    lat: 40.775921,
    lng: -73.971248,
    aliases: ["central park"],
  },
  {
    shortLabel: "Lincoln Center",
    displayName: "Lincoln Center, Upper West Side, Manhattan",
    lat: 40.772292,
    lng: -73.984852,
    aliases: ["lincoln center"],
  },
  {
    shortLabel: "Carnegie Hall",
    displayName: "Carnegie Hall, Midtown Manhattan",
    lat: 40.765125,
    lng: -73.979886,
    aliases: ["carnegie hall", "carnegie"],
  },
  {
    shortLabel: "Washington Square Park",
    displayName: "Washington Square Park, Greenwich Village, Manhattan",
    lat: 40.730823,
    lng: -73.997332,
    aliases: ["washington square", "washington square park"],
  },
  {
    shortLabel: "Union Square",
    displayName: "Union Square, Manhattan",
    lat: 40.735863,
    lng: -73.991084,
    aliases: ["union square"],
  },
  {
    shortLabel: "Bryant Park",
    displayName: "Bryant Park, Midtown Manhattan",
    lat: 40.753597,
    lng: -73.983233,
    aliases: ["bryant park", "bryant"],
  },
  {
    shortLabel: "St. Patrick's Cathedral",
    displayName: "St. Patrick's Cathedral, Midtown Manhattan",
    lat: 40.758529,
    lng: -73.975478,
    aliases: ["st patrick", "st. patrick", "st patricks cathedral"],
  },
  {
    shortLabel: "MoMA",
    displayName: "Museum of Modern Art, Midtown Manhattan",
    lat: 40.761432,
    lng: -73.977621,
    aliases: ["moma", "museum of modern art"],
  },
  {
    shortLabel: "The High Line",
    displayName: "The High Line, Chelsea, Manhattan",
    lat: 40.747993,
    lng: -74.004765,
    aliases: ["high line", "the high line"],
  },
  {
    shortLabel: "Battery Park",
    displayName: "The Battery, Lower Manhattan",
    lat: 40.702901,
    lng: -74.015351,
    aliases: ["battery park", "the battery"],
  },
  {
    shortLabel: "New York City Hall",
    displayName: "City Hall Park, Civic Center, Manhattan",
    lat: 40.712654,
    lng: -74.006734,
    aliases: ["city hall", "nyc city hall", "new york city hall"],
  },
  {
    shortLabel: "Brooklyn Bridge (Manhattan)",
    displayName: "Brooklyn Bridge, Manhattan approach",
    lat: 40.706086,
    lng: -73.996864,
    aliases: ["brooklyn bridge"],
  },
  {
    shortLabel: "Hudson Yards",
    displayName: "Hudson Yards, Manhattan",
    lat: 40.753742,
    lng: -74.002746,
    aliases: ["hudson yards", "the vessel", "vessel"],
  },
];

function nearAnyLandmark(lat, lng, landmarks, minM) {
  if (!landmarks?.length) return false;
  return landmarks.some(
    (p) => haversineMeters(p.lat, p.lng, lat, lng) < minM,
  );
}

function landmarkHitsForQuery(rawQuery) {
  const ql = String(rawQuery || "").trim().toLowerCase();
  if (ql.length < 2) return [];
  const hits = [];
  for (const L of MANHATTAN_LANDMARKS) {
    const matched = L.aliases.some((alias) => {
      const al = alias.toLowerCase();
      if (al.length < 2) return false;
      return ql.includes(al) || al.includes(ql);
    });
    if (matched) {
      hits.push({
        lat: L.lat,
        lng: L.lng,
        displayName: L.displayName,
        shortLabel: L.shortLabel,
        inManhattan: true,
      });
    }
  }
  return hits;
}

function mergeLandmarksFirst(landmarkRows, fallbackRows) {
  const out = [];
  const seen = new Set();
  const add = (p) => {
    const k = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(p);
  };
  for (const p of landmarkRows) add(p);
  for (const p of fallbackRows || []) {
    if (nearAnyLandmark(p.lat, p.lng, landmarkRows, 110)) continue;
    add(p);
  }
  return out.slice(0, 10);
}

function shuffleArrayCopy(items) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Curated famous Manhattan locations (no network). Call again for a new random subset.
 */
export function randomManhattanLandmarkSuggestions(count = 8) {
  const cap = Math.min(Math.max(4, count), MANHATTAN_LANDMARKS.length);
  return shuffleArrayCopy(MANHATTAN_LANDMARKS)
    .slice(0, cap)
    .map((L) => ({
      lat: L.lat,
      lng: L.lng,
      displayName: L.displayName,
      shortLabel: L.shortLabel,
      inManhattan: true,
    }));
}

/**
 * Nearby named neighborhoods (centroids) for map recommendations.
 */
export function nearestNeighborhoodPicks(lat, lng, limit = 6) {
  return [...MANHATTAN_CENTROIDS]
    .map((p) => ({
      key: p.key,
      label: p.key.replace(/\b\w/g, (c) => c.toUpperCase()),
      lat: p.lat,
      lng: p.lng,
      dist2: dist2(lat, lng, p.lat, p.lng),
    }))
    .sort((a, b) => a.dist2 - b.dist2)
    .slice(0, limit);
}

/**
 * Forward geocode (NYC-biased). Every row includes inManhattan from coordinates.
 */
export async function searchPlacesWithManhattanFlag(query) {
  const q = String(query || "").trim();
  if (!q) return [];

  const landmarkRows = landmarkHitsForQuery(q);

  const params = new URLSearchParams({
    format: "json",
    q: `${q}, New York City, USA`,
    limit: "14",
    addressdetails: "1",
    namedetails: "1",
    countrycodes: "us",
  });

  let rows;
  try {
    rows = await nominatimFetch(`/search?${params}`);
  } catch {
    return mergeLandmarksFirst(landmarkRows, localCentroidSearchFlagged(q));
  }

  if (!Array.isArray(rows)) {
    return mergeLandmarksFirst(landmarkRows, localCentroidSearchFlagged(q));
  }

  const out = [];
  const seen = new Set();
  for (const p of landmarkRows) {
    const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= 10) return out;
  }

  for (const r of rows) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (nearAnyLandmark(lat, lng, landmarkRows, 110)) continue;
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      lat,
      lng,
      displayName: r.display_name || q,
      shortLabel: pickShortLabel(r),
      inManhattan: pointInManhattan(lat, lng),
    });
    if (out.length >= 10) break;
  }

  if (out.length) return out;
  return mergeLandmarksFirst(landmarkRows, localCentroidSearchFlagged(q));
}

function localCentroidSearchFlagged(query) {
  const ql = query.toLowerCase();
  return MANHATTAN_CENTROIDS.filter(
    (p) => p.key.includes(ql) || ql.includes(p.key),
  )
    .slice(0, 8)
    .map((p) => ({
      lat: p.lat,
      lng: p.lng,
      displayName: `${p.key}, Manhattan`,
      shortLabel: p.key.replace(/\b\w/g, (c) => c.toUpperCase()),
      inManhattan: true,
    }));
}

/**
 * Forward geocode; returns only points inside Manhattan bounds (legacy shape).
 */
export async function searchManhattan(query) {
  const flagged = await searchPlacesWithManhattanFlag(query);
  return flagged
    .filter((p) => p.inManhattan)
    .map(({ inManhattan: _i, ...rest }) => rest);
}

function pickShortLabel(r) {
  const a = r.address;
  if (a) {
    const road = a.road || a.pedestrian || a.path;
    const house = a.house_number;
    if (road) {
      return [house, road].filter(Boolean).join(" ") || r.display_name;
    }
    if (a.neighbourhood || a.suburb) return a.neighbourhood || a.suburb;
  }
  const name = r.namedetails?.name;
  if (name) return name;
  return (r.display_name || "").split(",").slice(0, 2).join(",").trim() || "Location";
}

export async function reverseGeocodeLabel(lat, lng) {
  if (!pointInManhattan(lat, lng)) return "Manhattan";

  const params = new URLSearchParams({
    format: "json",
    lat: String(lat),
    lon: String(lng),
  });

  try {
    const r = await nominatimFetch(`/reverse?${params}`);
    if (!r || r.error) return "Manhattan";
    return pickShortLabel(r) || r.display_name?.split(",").slice(0, 2).join(",") || "Manhattan";
  } catch {
    return "Manhattan";
  }
}
