export const PREVIEW_MAX_ZOOM = 11;
/** Carto raster tiles + placement view — street-level (block / labels readable on phone). */
export const MAP_MAX_ZOOM = 20;
export const AREA_SEARCH_DEBOUNCE_MS = 420;
export const TOOLBAR_SEARCH_DEBOUNCE_MS = 450;
/** Quick-pick chips under Area / neighborhood from the checkpoint coordinates. */
export const AREA_PIN_CHIP_COUNT = 6;
/** Green map dots while a checkpoint is set (user may switch among them + “You are here”). */
export const MAP_SUGGESTION_MARKER_CAP = 8;
/** First N chip / merge slots prioritize neighborhoods nearest the last GPS fix (“Use my location”). */
export const NEAR_USER_CHIP_PRIORITY = 3;
/** Visual only (not stored) — compact checkpoint aura shown while placing a checkpoint. */
export const CHECKPOINT_RADIUS_M = 20;
/** Fixed “scale” for checkpoint preview (like pinch-zoomed in); not container height. */
export const SELECTION_TARGET_ZOOM = 17;
export const FOLLOW_FLY_EASE = 0.22;
export const PIN_PAN_ABOVE_SHEET_SEC = 0.48;
/** Keep centered horizontally; only nudge vertically above the sheet. */
export const PIN_SCREEN_Y_FRAC = 0.42;
