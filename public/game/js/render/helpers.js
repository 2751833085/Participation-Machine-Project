/** View helpers shared by `app.js` (orchestrator) and `render/views.js`. */
import { DEFAULT_SETTINGS, fmtClock, gameNow, state, tsMs } from "./render-room-runtime.js";

export function getMyMember() {
  if (!state.user || !state.members.length) return null;
  return state.members.find((m) => m.uid === state.user.uid) || null;
}

export function isInRoom() {
  return !!state.roomCode && !!state.room;
}

export function roomStatus() {
  return state.room?.status || "";
}

export function isInGame() {
  const s = roomStatus();
  return s === "hunt" || s === "stalemate";
}

export function isCapturedSelf() {
  const me = getMyMember();
  return !!(me && me.capturedAt);
}

export function stalemateRemainMs(room) {
  if (!room?.stalemateStartedAt) return 0;
  const lockMs = (room.lockMin || DEFAULT_SETTINGS.lockMin) * 60 * 1000;
  return Math.max(0, lockMs - (gameNow() - tsMs(room.stalemateStartedAt)));
}

export function huntRemainMs(room) {
  const huntMs = (room.huntMin || DEFAULT_SETTINGS.huntMin) * 60 * 1000;
  const huntStart = tsMs(room.huntStartedAt);
  if (!huntStart) return huntMs;
  return Math.max(0, huntMs - (gameNow() - huntStart));
}

export function needsRunnerStopAlert(me) {
  if (me.team !== "runner") return false;
  if (me.capturedAt) return false;
  if (me.positionPhotoUrl) return false;
  if (state.cameraOpen || state.photoPreview) return false;
  return true;
}

export function stripLive(html) {
  return html.replace(/(<(?:span|b|div)\b[^>]*\bdata-live=[^>]*>)[^<]*(<\/(?:span|b|div)>)/g, "$1$2");
}

export function applyLiveTimers() {
  const room = state.room;
  if (!room) return;
  const times = liveTimerState(room);
  const now = gameNow();
  const me = getMyMember();
  document.querySelectorAll("[data-live]").forEach((el) => {
    applyLiveTimerElement(el, times, now, me);
  });
}

function liveTimerState(room) {
  return {
    huntStart: tsMs(room.huntStartedAt),
    dispStart: tsMs(room.dispersalStartedAt),
    huntMs: (room.huntMin || DEFAULT_SETTINGS.huntMin) * 60 * 1000,
    dispMs: (room.dispersalMin || DEFAULT_SETTINGS.dispersalMin) * 60 * 1000,
  };
}

function applyLiveTimerElement(el, times, now, me) {
  const kind = el.dataset.live;
  const value = liveTimerValue(kind, el, times, now, me);
  if (value !== null) el.textContent = fmtClock(value);
}

function liveTimerValue(kind, el, times, now, me) {
  if (kind === "hunt-remain") return huntRemainValue(times, now);
  if (kind === "hunt-elapsed") return Math.max(0, now - times.huntStart);
  if (kind === "disp-remain") return dispersalRemainValue(times, now);
  if (kind === "lock-remain") return Math.max(0, parseInt(el.dataset.lockMs || "0", 10) - now);
  if (kind === "caught-elapsed") return Math.max(0, now - (me ? tsMs(me.capturedAt) : 0));
  return null;
}

function huntRemainValue(times, now) {
  return times.huntStart > 0
    ? Math.max(0, times.huntMs - (now - times.huntStart))
    : times.huntMs;
}

function dispersalRemainValue(times, now) {
  return times.dispStart > 0
    ? Math.max(0, Math.min(times.dispMs, times.dispMs - (now - times.dispStart)))
    : times.dispMs;
}
