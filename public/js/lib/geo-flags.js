/**
 * Product geo policy (flip for staging / QA).
 *
 * When false: checkpoints and search picks may be outside Manhattan; map is not clamped to the island.
 * Turn back to true before a Manhattan-only production launch.
 */
export const GEO_RESTRICT_MANHATTAN = false;

/**
 * When true: run checkpoint uploads require EXIF GPS, recent capture time, and distance to spot.
 * Set to false to allow gallery picks / photos without location metadata (temporary).
 */
export const REQUIRE_PHOTO_GPS_PROOF = false;
