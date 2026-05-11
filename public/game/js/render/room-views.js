/**
 * Friends — in-room shell markup (lobby through end screen).
 * Implementation split across `room-*-views.js`; this file re-exports for stable imports.
 */
export { renderLobby } from "./room-lobby-views.js";
export { renderDispersal, renderReadyCheck } from "./room-ready-dispersal-views.js";
export { renderInGame } from "./room-ingame-views.js";
export { renderEnd, renderSpectator } from "./room-spectator-end-views.js";
