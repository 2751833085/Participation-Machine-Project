/**
 * Proximity rules for starting hunts, publishing, and photo proof.
 */

import { haversineMeters } from "../services/geocoding.js";

export const START_HUNT_MAX_DISTANCE_M = 150;
export const CREATE_HUNT_MAX_DISTANCE_M = 150;
export const PHOTO_PROOF_MAX_DISTANCE_M = 200;
export const PHOTO_PROOF_MAX_AGE_MINUTES = 20;

export function assertWithinRadius(
  userLat,
  userLng,
  refLat,
  refLng,
  maxM,
  label = "the hunt area",
) {
  if (
    !Number.isFinite(userLat) ||
    !Number.isFinite(userLng) ||
    !Number.isFinite(refLat) ||
    !Number.isFinite(refLng)
  ) {
    throw new Error("Location data is incomplete. Enable GPS and try again.");
  }
  const d = haversineMeters(userLat, userLng, refLat, refLng);
  if (d > maxM) {
    throw new Error(
      `You are about ${Math.round(d)} m from ${label}. Move within ${maxM} m to continue.`,
    );
  }
  return d;
}

/**
 * @returns {Promise<{ lat: number; lng: number; accuracy?: number }>}
 */
export function getGeoPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This device does not support GPS."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        reject(
          new Error(
            err?.message ||
              "Could not read your location. Allow location access and try again.",
          ),
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: options.maximumAge ?? 0,
        timeout: options.timeout ?? 20000,
      },
    );
  });
}
