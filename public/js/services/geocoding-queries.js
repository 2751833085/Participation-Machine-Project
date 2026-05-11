/**
 * Manhattan geocode / reverse lookups (Nominatim + landmark merge).
 */

import { pointInManhattan } from "./challenges.js";
import {
  landmarkHitsForQuery,
  localCentroidSearchFlagged,
  mergeLandmarksFirst,
  nearAnyLandmark,
} from "./geocoding-geo.js";
import { nominatimFetch } from "./geocoding-nominatim.js";

/**
 * Forward geocode (NYC-biased). Every row includes inManhattan from coordinates.
 */
export async function searchPlacesWithManhattanFlag(query) {
  const q = String(query || "").trim();
  if (!q) return [];

  const landmarkRows = landmarkHitsForQuery(q);
  const fallbackRows = () => mergeLandmarksFirst(landmarkRows, localCentroidSearchFlagged(q));
  const rows = await fetchSearchRows(q);
  if (!Array.isArray(rows)) return fallbackRows();
  const out = seededLandmarkRows(landmarkRows);
  if (out.length >= 10) return out;
  appendNominatimPlaces(out, rows, q, landmarkRows);
  if (out.length) return out;
  return fallbackRows();
}

async function fetchSearchRows(q) {
  try {
    return await nominatimFetch(`/search?${searchParamsForQuery(q)}`);
  } catch {
    return null;
  }
}

function appendNominatimPlaces(out, rows, q, landmarkRows) {
  const seen = new Set();
  out.forEach((p) => seen.add(placeKey(p.lat, p.lng)));
  for (const r of rows) {
    const place = placeRowFromNominatim(r, q, landmarkRows, seen);
    if (!place) continue;
    out.push(place);
    if (out.length >= 10) break;
  }
}

function searchParamsForQuery(q) {
  return new URLSearchParams({
    format: "json",
    q: `${q}, New York City, USA`,
    limit: "14",
    addressdetails: "1",
    namedetails: "1",
    countrycodes: "us",
  });
}

function placeKey(lat, lng) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function seededLandmarkRows(landmarkRows) {
  const out = [];
  const seen = new Set();
  for (const p of landmarkRows) {
    const key = placeKey(p.lat, p.lng);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= 10) break;
  }
  return out;
}

function placeRowFromNominatim(r, q, landmarkRows, seen) {
  const lat = parseFloat(r.lat);
  const lng = parseFloat(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (nearAnyLandmark(lat, lng, landmarkRows, 110)) return null;
  const key = placeKey(lat, lng);
  if (seen.has(key)) return null;
  seen.add(key);
  return {
    lat,
    lng,
    displayName: r.display_name || q,
    shortLabel: pickShortLabel(r),
    inManhattan: pointInManhattan(lat, lng),
  };
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
  const addressLabel = shortLabelFromAddress(a, r.display_name);
  if (addressLabel) return addressLabel;
  const name = r.namedetails?.name;
  if (name) return name;
  return shortLabelFromDisplayName(r.display_name);
}

function shortLabelFromAddress(address, displayName) {
  if (!address) return "";
  const road = address.road || address.pedestrian || address.path;
  if (road) return streetAddressLabel(address.house_number, road, displayName);
  return neighborhoodAddressLabel(address);
}

function streetAddressLabel(houseNumber, road, displayName) {
  return [houseNumber, road].filter(Boolean).join(" ") || displayName;
}

function neighborhoodAddressLabel(address) {
  return address.neighbourhood || address.suburb || "";
}

function shortLabelFromDisplayName(displayName) {
  return (displayName || "").split(",").slice(0, 2).join(",").trim() || "Location";
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
    return pickShortLabel(r) || shortLabelFromDisplayName(r.display_name) || "Manhattan";
  } catch {
    return "Manhattan";
  }
}
