/**
 * Friends — captured acknowledgement overlay.
 */
import { escapeHtml, fmtClock, state, tsMs } from "./render-room-runtime.js";

export function renderCapturedOverlay(me) {
  const captor = state.captures.find((c) => c.targetUid === me.uid);
  const survived = tsMs(me.capturedAt) - tsMs(state.room?.huntStartedAt);
  return `
    <div class="hs-alert captured">
      <div class="icon-big">
        <span class="letter">!</span>
      </div>
      <div class="kicker">You were caught</div>
      <h2>You're spectating now</h2>
      <p>Caught by <b>${escapeHtml(captor?.captorName || "a Hunter")}</b>. You held out for ${escapeHtml(fmtClock(survived))}; stay to watch the rest of the hunt.</p>
      <div class="meta-row">
        <div class="pill"><span class="lbl">Survived</span><span class="val">${escapeHtml(fmtClock(survived))}</span></div>
        <div class="pill"><span class="lbl">Runners left</span><span class="val">${state.members.filter((m) => m.team === "runner" && !m.capturedAt).length}</span></div>
      </div>
      <button type="button" class="cta" data-action="acknowledge-capture">Spectate</button>
    </div>
  `;
}
