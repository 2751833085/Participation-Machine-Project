/** Friends app — shared constants (no Firebase, no DOM). */

export const ROOM_TTL_MS = 1000 * 60 * 60 * 2; // 2h
export const NAME_KEY = "tourgo-friends.name";
export const FRIEND_CODE_KEY = "tourgo-friends.code";
export const STATS_KEY = "tourgo-friends.stats";
export const SETTINGS_KEY = "tourgo-friends.settings";
export const SESSION_KEY = "tourgo-friends.session"; // last room (refresh resume)
export const READY_COUNTDOWN_MS = 10000; // server-synced lead-in when everyone ready

export const DEFAULT_SETTINGS = {
  dispersalMin: 2,
  huntMin: 40,
  lockMin: 5,
  stalemateMin: 15,
};
