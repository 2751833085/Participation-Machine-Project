/**
 * Challenges service: CRUD, image upload, Manhattan geo-inference.
 */

import { auth, db, storage } from "../firebase-init.js";
import { GEO_RESTRICT_MANHATTAN } from "../lib/geo-flags.js";
import { compressCheckpointImage } from "../image-utils.js";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-storage.js";

export const MAX_SPOTS = 10;
export const MIN_SPOTS = 1;

/* ── Manhattan geo data ── */

/**
 * Loose bbox for Leaflet maxBounds / overview (slightly padded around the island).
 * Selection uses `pointInManhattan`, which is stricter so Queens/LIC/BK/NJ bbox hits are rejected.
 */
export const MANHATTAN_BOUNDS = [
  [40.698, -74.035],
  [40.888, -73.898],
];

/**
 * Island check: east limit tightens toward the south (excludes LIC / western Queens); west limit slopes
 * with latitude so Hudson-side New Jersey is excluded without cutting Battery / West Side.
 */
export function pointInManhattan(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (!GEO_RESTRICT_MANHATTAN) return true;

  if (lat < 40.698 || lat > 40.885) return false;

  let minLng;
  let maxLng;
  if (lat < 40.765) {
    minLng = -74.019 + (lat - 40.704) * 0.00032;
    maxLng = -73.97;
  } else if (lat < 40.805) {
    minLng = -74.016 + (lat - 40.765) * 0.00028;
    maxLng = -73.935;
  } else if (lat < 40.84) {
    minLng = -74.005 + (lat - 40.805) * 0.00022;
    maxLng = -73.93;
  } else {
    minLng = -73.965;
    maxLng = -73.905;
  }

  return lng >= minLng && lng <= maxLng;
}

export const MANHATTAN_CENTROIDS = [
  { key: "harlem", lat: 40.8116, lng: -73.9465 },
  { key: "upper west", lat: 40.787, lng: -73.9754 },
  { key: "upper east", lat: 40.7735, lng: -73.9566 },
  { key: "midtown", lat: 40.7549, lng: -73.984 },
  { key: "chelsea", lat: 40.7465, lng: -74.0014 },
  { key: "west village", lat: 40.7358, lng: -74.0036 },
  { key: "greenwich", lat: 40.7336, lng: -74.0027 },
  { key: "soho", lat: 40.7233, lng: -74.003 },
  { key: "tribeca", lat: 40.7195, lng: -74.0089 },
  { key: "chinatown", lat: 40.7158, lng: -73.997 },
  { key: "lower east", lat: 40.715, lng: -73.9843 },
  { key: "lower manhattan", lat: 40.7075, lng: -74.0113 },
  { key: "battery park", lat: 40.7041, lng: -74.0172 },
  { key: "financial district", lat: 40.7073, lng: -74.0088 },
  { key: "union square", lat: 40.7359, lng: -73.9911 },
  { key: "east village", lat: 40.7265, lng: -73.9815 },
  { key: "times square", lat: 40.758, lng: -73.9855 },
];

/* ── Queries ── */

export function watchChallenges(limitN, callback, onError) {
  const q = query(
    collection(db, "challenges"),
    orderBy("createdAt", "desc"),
    limit(limitN),
  );
  return onSnapshot(q, callback, onError);
}

export async function getChallenge(id) {
  const snap = await getDoc(doc(db, "challenges", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/* ── Create challenge with image upload ── */

export async function createChallenge({
  title,
  areaLabel,
  timeLimitMinutes,
  files,
  hints,
  huntHint,
  lat,
  lng,
  /** One { lat, lng } per file; falls back to challenge lat/lng */
  spotLatLngs,
}) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("At least one photo is required.");
  }

  const challengeRef = doc(collection(db, "challenges"));
  const challengeId = challengeRef.id;
  const spots = [];

  for (let i = 0; i < files.length; i += 1) {
    const jpegBlob = await compressCheckpointImage(files[i]);
    const path = `challenges/${challengeId}/${i}.jpg`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, jpegBlob, { contentType: "image/jpeg" });
    const imageUrl = await getDownloadURL(storageRef);
    const sl = spotLatLngs?.[i];
    const spotLat =
      typeof sl?.lat === "number" && Number.isFinite(sl.lat) ? sl.lat : lat;
    const spotLng =
      typeof sl?.lng === "number" && Number.isFinite(sl.lng) ? sl.lng : lng;
    const row = { imageUrl, hint: hints[i] || "" };
    if (
      typeof spotLat === "number" &&
      typeof spotLng === "number" &&
      Number.isFinite(spotLat) &&
      Number.isFinite(spotLng)
    ) {
      row.lat = spotLat;
      row.lng = spotLng;
    }
    spots.push(row);
  }

  const payload = {
    title,
    areaLabel,
    timeLimitMinutes,
    createdBy: auth.currentUser.uid,
    createdAt: serverTimestamp(),
    spots,
  };

  const hh = typeof huntHint === "string" ? huntHint.trim() : "";
  if (hh) payload.huntHint = hh.slice(0, 800);

  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    payload.lat = lat;
    payload.lng = lng;
  }

  await setDoc(challengeRef, payload);

  return challengeId;
}

/* ── Geo helpers ── */

/**
 * Coordinates used for EXIF distance checks at a checkpoint (new hunts store per-spot lat/lng).
 */
/**
 * Anchor for “must be within 150 m to start” — stored pin first, else inferred from area label.
 */
export function huntStartAnchorCoords(challenge) {
  if (
    typeof challenge?.lat === "number" &&
    typeof challenge?.lng === "number" &&
    Number.isFinite(challenge.lat) &&
    Number.isFinite(challenge.lng)
  ) {
    return { lat: challenge.lat, lng: challenge.lng };
  }
  const inf = inferManhattanPoint(challenge);
  if (inf) return inf;
  throw new Error(
    "This hunt has no map location. The host must publish with a Manhattan area or map pin.",
  );
}

export function checkpointProofCoords(challenge, spotIndex) {
  const spots = challenge?.spots || [];
  const spot = spots[spotIndex];
  if (
    typeof spot?.lat === "number" &&
    typeof spot?.lng === "number" &&
    Number.isFinite(spot.lat) &&
    Number.isFinite(spot.lng)
  ) {
    return { lat: spot.lat, lng: spot.lng };
  }
  if (
    typeof challenge?.lat === "number" &&
    typeof challenge?.lng === "number" &&
    Number.isFinite(challenge.lat) &&
    Number.isFinite(challenge.lng)
  ) {
    return { lat: challenge.lat, lng: challenge.lng };
  }
  const inf = inferManhattanPoint(challenge);
  if (inf) return inf;
  throw new Error(
    "This hunt has no stored map position for photo checks. Ask the host to republish from the map.",
  );
}

export function inferManhattanPoint(challenge) {
  if (
    typeof challenge?.lat === "number" &&
    typeof challenge?.lng === "number" &&
    pointInManhattan(challenge.lat, challenge.lng)
  ) {
    return { lat: challenge.lat, lng: challenge.lng };
  }

  const area = String(challenge?.areaLabel || "").toLowerCase();
  for (const p of MANHATTAN_CENTROIDS) {
    if (area.includes(p.key)) return { lat: p.lat, lng: p.lng };
  }
  if (area.includes("manhattan")) return { lat: 40.7589, lng: -73.9851 };
  return null;
}
