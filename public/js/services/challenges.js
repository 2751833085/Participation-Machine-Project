/**
 * Challenges service: CRUD, image upload, Manhattan geo-inference.
 */

import { auth, db, storage } from "./firebase.js";
import { GEO_RESTRICT_MANHATTAN } from "../lib/geo-flags.js";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-storage.js";

export const MAX_SPOTS = 10;
export const MIN_SPOTS = 1;
const IMAGE_UTILS_PATH = "../image-utils.js";
let imageUtilsModule;

async function compressChallengeImage(file) {
  if (!imageUtilsModule) imageUtilsModule = import(IMAGE_UTILS_PATH);
  const { compressCheckpointImage } = await imageUtilsModule;
  return compressCheckpointImage(file);
}

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
  const { minLng, maxLng } = manhattanLngRange(lat);
  return lng >= minLng && lng <= maxLng;
}

function manhattanLngRange(lat) {
  if (lat < 40.765) {
    return { minLng: -74.019 + (lat - 40.704) * 0.00032, maxLng: -73.97 };
  }
  if (lat < 40.805) {
    return { minLng: -74.016 + (lat - 40.765) * 0.00028, maxLng: -73.935 };
  }
  if (lat < 40.84) {
    return { minLng: -74.005 + (lat - 40.805) * 0.00022, maxLng: -73.93 };
  }
  return { minLng: -73.965, maxLng: -73.905 };
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
  return snap.exists() ? { ...snap.data(), id: snap.id } : null;
}

function sortChallengeDocsNewestFirst(docs) {
  return [...docs].sort((a, b) => {
    const ta = a.data().createdAt?.toMillis?.() ?? 0;
    const tb = b.data().createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

/**
 * Signed-in creator’s hunts (newest first).
 * Uses createdBy + createdAt index when available; falls back to equality-only query + client sort if the index is missing.
 */
export function watchUserPublishedChallenges(uid, onNext, onError) {
  if (!uid) return () => {};

  const orderedQ = query(
    collection(db, "challenges"),
    where("createdBy", "==", uid),
    orderBy("createdAt", "desc"),
    limit(50),
  );

  const fallbackQ = query(
    collection(db, "challenges"),
    where("createdBy", "==", uid),
    limit(50),
  );

  return attachUserPublishedWatch(orderedQ, fallbackQ, onNext, onError);
}

function attachUserPublishedWatch(orderedQ, fallbackQ, onNext, onError) {
  const state = { unsub: null, cancelled: false };
  state.unsub = onSnapshot(
    orderedQ,
    (snap) => {
      if (state.cancelled) return;
      onNext(snap);
    },
    (err) => {
      handleUserPublishedWatchError(state, fallbackQ, onNext, onError, err);
    },
  );
  return () => stopUserPublishedWatch(state);
}

function handleUserPublishedWatchError(state, fallbackQ, onNext, onError, err) {
  console.warn("[challenges] watchUserPublishedChallenges ordered query", err);
  if (state.cancelled) return;
  if (!isMissingIndexError(err)) {
    onError(err);
    return;
  }
  stopActiveUserPublishedWatch(state);
  state.unsub = attachUserPublishedFallback(fallbackQ, state, onNext, onError);
}

function isMissingIndexError(err) {
  const code = err?.code || "";
  const msg = String(err?.message || "");
  return code === "failed-precondition" ||
    msg.includes("index") ||
    msg.includes("requires an index");
}

function attachUserPublishedFallback(fallbackQ, state, onNext, onError) {
  return onSnapshot(
    fallbackQ,
    (snap) => {
      if (state.cancelled) return;
      const sorted = sortChallengeDocsNewestFirst(snap.docs).slice(0, 50);
      onNext({ docs: sorted });
    },
    (err) => onError(err),
  );
}

function stopActiveUserPublishedWatch(state) {
  if (!state.unsub) return;
  state.unsub();
  state.unsub = null;
}

function stopUserPublishedWatch(state) {
  state.cancelled = true;
  stopActiveUserPublishedWatch(state);
}

export async function deleteUserChallenge(challengeId) {
  if (!auth.currentUser) throw new Error("Sign in to manage hunts.");
  const challengeRef = doc(db, "challenges", challengeId);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) throw new Error("Hunt not found.");
  const data = snap.data();
  if (data.createdBy !== auth.currentUser.uid) {
    throw new Error("You can only delete your own hunts.");
  }
  const spots = Array.isArray(data.spots) ? data.spots : [];
  for (let i = 0; i < spots.length; i += 1) {
    try {
      await deleteObject(ref(storage, `challenges/${challengeId}/${i}.jpg`));
    } catch {
      /* missing or already removed */
    }
  }
  await deleteDoc(challengeRef);
}

/**
 * Update text / timing fields only (checkpoints and map pin unchanged).
 * @param {string} challengeId
 * @param {{ title: string, areaLabel: string, timeLimitMinutes: number, huntHint?: string }} patch
 */
export async function updateUserChallengeDetails(challengeId, patch) {
  if (!auth.currentUser) throw new Error("Sign in to manage hunts.");
  const challengeRef = doc(db, "challenges", challengeId);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) throw new Error("Hunt not found.");
  const data = snap.data();
  if (data.createdBy !== auth.currentUser.uid) {
    throw new Error("You can only edit your own hunts.");
  }
  await updateDoc(challengeRef, challengeDetailsUpdatePayload(patch));
}

function challengeDetailsUpdatePayload(patch) {
  const title = requiredTrimmedField(patch.title, "Title is required.");
  const areaLabel = requiredTrimmedField(
    patch.areaLabel,
    "Area / neighborhood is required.",
  );
  const updates = {
    title,
    areaLabel,
    timeLimitMinutes: validTimeLimitMinutes(patch.timeLimitMinutes),
  };
  applyHuntHintUpdate(updates, patch.huntHint);
  return updates;
}

function requiredTrimmedField(value, message) {
  const out = typeof value === "string" ? value.trim() : "";
  if (!out) throw new Error(message);
  return out;
}

function validTimeLimitMinutes(value) {
  const minutes = Number(value);
  if (
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes > 24 * 60
  ) {
    throw new Error("Time limit must be between 1 and 1440 minutes.");
  }
  return minutes;
}

function applyHuntHintUpdate(updates, huntHint) {
  const rawHint = typeof huntHint === "string" ? huntHint.trim() : "";
  updates.huntHint = rawHint ? rawHint.slice(0, 800) : deleteField();
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
  const spots = await uploadChallengeSpots(challengeId, files, hints, spotLatLngs, lat, lng);
  const payload = challengePayload({ title, areaLabel, timeLimitMinutes, huntHint, lat, lng, spots });

  await setDoc(challengeRef, payload);

  return challengeId;
}

async function uploadChallengeSpots(challengeId, files, hints, spotLatLngs, lat, lng) {
  const spots = [];
  for (let i = 0; i < files.length; i += 1) {
    const imageUrl = await uploadChallengeSpotImage(challengeId, files[i], i);
    spots.push(challengeSpotRow(imageUrl, hints[i] || "", spotLatLngs?.[i], lat, lng));
  }
  return spots;
}

async function uploadChallengeSpotImage(challengeId, file, index) {
  const jpegBlob = await compressChallengeImage(file);
  const path = `challenges/${challengeId}/${index}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, jpegBlob, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}

function validCoordPair(lat, lng) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

function challengeSpotRow(imageUrl, hint, spotLatLng, lat, lng) {
  const spotLat =
    typeof spotLatLng?.lat === "number" && Number.isFinite(spotLatLng.lat) ? spotLatLng.lat : lat;
  const spotLng =
    typeof spotLatLng?.lng === "number" && Number.isFinite(spotLatLng.lng) ? spotLatLng.lng : lng;
  const row = { imageUrl, hint };
  if (validCoordPair(spotLat, spotLng)) {
    row.lat = spotLat;
    row.lng = spotLng;
  }
  return row;
}

function challengePayload({ title, areaLabel, timeLimitMinutes, huntHint, lat, lng, spots }) {
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
  if (validCoordPair(lat, lng)) {
    payload.lat = lat;
    payload.lng = lng;
  }
  return payload;
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
  const spotCoords = coordsFromEntity(spots[spotIndex]);
  if (spotCoords) return spotCoords;
  const challengeCoords = coordsFromEntity(challenge);
  if (challengeCoords) return challengeCoords;
  const inf = inferManhattanPoint(challenge);
  if (inf) return inf;
  throw new Error(
    "This hunt has no stored map position for photo checks. Ask the host to republish from the map.",
  );
}

function coordsFromEntity(entity) {
  return validCoordPair(entity?.lat, entity?.lng)
    ? { lat: entity.lat, lng: entity.lng }
    : null;
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
