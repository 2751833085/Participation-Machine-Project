import { REQUIRE_PHOTO_GPS_PROOF } from "./geo-flags.js";
import { haversineMeters } from "./distance.js";

const EXIFR_SRC = "https://esm.sh/exifr@7.1.3";
const PHOTO_PROOF_MAX_DISTANCE_M = 200;
const PHOTO_PROOF_MAX_AGE_MINUTES = 20;

let exifrLoad;

async function getExifrParse() {
  if (!exifrLoad) {
    exifrLoad = import(EXIFR_SRC);
  }
  const mod = await exifrLoad;
  const ex = mod.default ?? mod;
  if (typeof ex?.parse === "function") return ex.parse.bind(ex);
  if (typeof ex === "function") return ex;
  throw new Error("Photo checker module is invalid.");
}

function pickPhotoDate(tags) {
  if (!tags || typeof tags !== "object") return null;
  const candidates = [
    tags.DateTimeOriginal,
    tags.CreateDate,
    tags.ModifyDate,
    tags.DateTimeDigitized,
  ];
  for (const c of candidates) {
    const date = validPhotoDateCandidate(c);
    if (date) return date;
  }
  return null;
}

function validPhotoDateCandidate(candidate) {
  if (candidate instanceof Date) return validDateOrNull(candidate);
  if (typeof candidate === "string" || typeof candidate === "number") {
    return validDateOrNull(new Date(candidate));
  }
  return null;
}

function validDateOrNull(date) {
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Validates EXIF GPS + capture time vs expected checkpoint (before compress strips metadata).
 * @param {File} file
 * @param {{ expectedLat: number, expectedLng: number, maxDistanceM?: number, maxAgeMinutes?: number }} options
 */
export async function validateCameraPhotoProof(file, options = {}) {
  if (!REQUIRE_PHOTO_GPS_PROOF) {
    return { lat: null, lng: null, takenAt: null };
  }

  const { expectedLat, expectedLng, maxDistanceM, maxAgeMinutes } = photoProofOptions(options);
  assertExpectedCoords(expectedLat, expectedLng);
  const parseFn = await loadPhotoProofParser();
  const tags = await parsePhotoProofTags(parseFn, file);
  const { lat, lng } = photoProofGps(tags);
  const takenAt = photoProofTakenAt(tags);
  assertPhotoAge(takenAt, maxAgeMinutes);
  assertPhotoDistance(expectedLat, expectedLng, lat, lng, maxDistanceM);

  return { lat, lng, takenAt };
}

function photoProofOptions(options) {
  return {
    expectedLat: options.expectedLat,
    expectedLng: options.expectedLng,
    maxDistanceM: options.maxDistanceM ?? PHOTO_PROOF_MAX_DISTANCE_M,
    maxAgeMinutes: options.maxAgeMinutes ?? PHOTO_PROOF_MAX_AGE_MINUTES,
  };
}

function assertExpectedCoords(expectedLat, expectedLng) {
  if (!Number.isFinite(expectedLat) || !Number.isFinite(expectedLng)) {
    throw new Error("Missing checkpoint coordinates.");
  }
}

async function loadPhotoProofParser() {
  try {
    return await getExifrParse();
  } catch {
    throw new Error(
      "Could not load photo checker. Check your network and try again.",
    );
  }
}

async function parsePhotoProofTags(parseFn, file) {
  return parseFn(file, {
    gps: true,
    exif: true,
    ifd0: true,
    translateKeys: true,
    reviveValues: true,
  });
}

function photoProofGps(tags) {
  const lat = tags?.latitude ?? tags?.GPSLatitude;
  const lng = tags?.longitude ?? tags?.GPSLongitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(
      "This photo has no embedded GPS. Use the camera here (not the gallery), with Location enabled for the Camera app.",
    );
  }
  return { lat, lng };
}

function photoProofTakenAt(tags) {
  const takenAt = pickPhotoDate(tags);
  if (!takenAt) {
    throw new Error(
      "Could not read when this photo was taken. Take a new picture with the camera.",
    );
  }
  return takenAt;
}

function assertPhotoAge(takenAt, maxAgeMinutes) {
  const ageMin = (Date.now() - takenAt.getTime()) / 60000;
  if (ageMin > maxAgeMinutes) {
    throw new Error(
      `Photo must be taken within the last ${maxAgeMinutes} minutes.`,
    );
  }
  if (ageMin < -3) {
    throw new Error("Photo time looks invalid — check the device clock.");
  }
}

function assertPhotoDistance(expectedLat, expectedLng, lat, lng, maxDistanceM) {
  const dist = haversineMeters(expectedLat, expectedLng, lat, lng);
  if (dist > maxDistanceM) {
    throw new Error(
      `This photo was taken about ${Math.round(dist)} m from this checkpoint. Stay within ${maxDistanceM} m.`,
    );
  }
}
