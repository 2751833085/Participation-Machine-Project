/**
 * Friends — in-game shell (status / team / QR / about tabs).
 */
import { DEFAULT_SETTINGS, escapeHtml, fmtClock, gameNow, state, tsMs } from "./render-room-runtime.js";
import {
  getMyMember,
  needsRunnerStopAlert,
} from "./helpers.js";
import {
  renderRunnerStopAlert,
  renderStalemateOverlay,
} from "./hunt-interruption-views.js";
import { renderLoading } from "./loading-view.js";
import { renderGameStatus } from "./room-ingame-status-views.js";
import { renderGameTabBody, renderInGameDock } from "./room-ingame-tabs-views.js";

export function renderInGame() {
  const me = getMyMember();
  const room = state.room;
  if (!me) return renderLoading();
  const role = me.team === "hunter" ? "Hunter" : (me.team === "runner" ? "Runner" : "Player");
  const roleClass = me.team === "hunter" ? "hunter" : (me.team === "runner" ? "runner" : "");

  // Hunt timer (decreases over hunt duration). Clamped so a drifted
  // local clock can't display values larger than the configured cap.
  const huntMs = (room.huntMin || DEFAULT_SETTINGS.huntMin) * 60 * 1000;
  const huntStart = tsMs(room.huntStartedAt);
  const huntElapsed = huntStart ? Math.max(0, gameNow() - huntStart) : 0;
  const huntRemain = Math.max(0, Math.min(huntMs, huntMs - huntElapsed));
  const timerClass = huntRemain < 5 * 60 * 1000 ? "danger" : (huntRemain < 15 * 60 * 1000 ? "warn" : "");

  const body = state.gameTab === "status" ? renderGameStatus(me) : renderGameTabBody(me);

  return `
    <div class="hs-shell has-dock">
      <div class="hs-game">
        <div class="hs-game-top">
          <div class="hs-role-pill ${roleClass}">
            <span class="lbl">YOUR ROLE</span>
            <span class="val">${escapeHtml(role)}</span>
          </div>
          <div class="hs-timer ${timerClass}">
            <span class="lbl">Hunt</span>
            <span class="val" data-live="hunt-remain">${escapeHtml(fmtClock(huntRemain))}</span>
          </div>
          <div class="hs-meta-tag">
            ${me.team === "hunter" ? "Captures" : "Hunters"}<b>${me.team === "hunter" ? state.captures.filter((c) => c.captorUid === me.uid).length : state.members.filter((m) => m.team === "hunter").length}</b>
          </div>
        </div>
        ${body}
        ${renderInGameDock(me)}
      </div>
      ${room.status === "stalemate" ? renderStalemateOverlay() : ""}
      ${needsRunnerStopAlert(me) ? renderRunnerStopAlert(me) : ""}
    </div>
  `;
}
