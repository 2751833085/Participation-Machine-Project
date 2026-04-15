import { haversineMeters } from "../services/geocoding.js";
import { REQUIRE_PHOTO_GPS_PROOF } from "./geo-flags.js";
import {
  PHOTO_PROOF_MAX_AGE_MINUTES,
  PHOTO_PROOF_MAX_DISTANCE_M,
} from "./geo-hunt-rules.js";

const EXIFR_SRC = "https://esm.sh/exifr@7.1.3";

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
    if (c instanceof Date && !Number.isNaN(c.getTime())) return c;
    if (typeof c === "string" || typeof c === "number") {
      const d = new Date(c);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
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

  const expectedLat = options.expectedLat;
  const expectedLng = options.expectedLng;
  const maxDistanceM = options.maxDistanceM ?? PHOTO_PROOF_MAX_DISTANCE_M;
  const maxAgeMinutes = options.maxAgeMinutes ?? PHOTO_PROOF_MAX_AGE_MINUTES;

  if (!Number.isFinite(expectedLat) || !Number.isFinite(expectedLng)) {
    throw new Error("Missing checkpoint coordinates.");
  }

  let parseFn;
  try {
    parseFn = await getExifrParse();
  } catch {
    throw new Error(
      "Could not load photo checker. Check your network and try again.",
    );
  }

  const tags = await parseFn(file, {
    gps: true,
    exif: true,
    ifd0: true,
    translateKeys: true,
    reviveValues: true,
  });

  const lat = tags?.latitude ?? tags?.GPSLatitude;
  const lng = tags?.longitude ?? tags?.GPSLongitude;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(
      "This photo has no embedded GPS. Use the camera here (not the gallery), with Location enabled for the Camera app.",
    );
  }

  const d = pickPhotoDate(tags);
  if (!d) {
    throw new Error(
      "Could not read when this photo was taken. Take a new picture with the camera.",
    );
  }

  const ageMin = (Date.now() - d.getTime()) / 60000;
  if (ageMin > maxAgeMinutes) {
    throw new Error(
      `Photo must be taken within the last ${maxAgeMinutes} minutes.`,
    );
  }
  if (ageMin < -3) {
    throw new Error("Photo time looks invalid — check the device clock.");
  }

  const dist = haversineMeters(expectedLat, expectedLng, lat, lng);
  if (dist > maxDistanceM) {
    throw new Error(
      `This photo was taken about ${Math.round(dist)} m from this checkpoint. Stay within ${maxDistanceM} m.`,
    );
  }

  return { lat, lng, takenAt: d };
}
