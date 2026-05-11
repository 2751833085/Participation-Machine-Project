/**
 * Full-screen stalemate / runner-stop markup (used by shell + overlay layers).
 */
import { DEFAULT_SETTINGS, escapeHtml, fmtClock, gameNow, state, tsMs } from "./render-room-runtime.js";

export function renderRelocateScreen(me) {
  const room = state.room;
  const windowMs = (room.lockMin || DEFAULT_SETTINGS.lockMin) * 60 * 1000;
  const startedAt = tsMs(room.stalemateStartedAt);
  const elapsed = startedAt ? Math.max(0, gameNow() - startedAt) : 0;
  const remain = Math.max(0, Math.min(windowMs, windowMs - elapsed));
  const role = me.team === "hunter" ? "hunter" : (me.team === "runner" ? "runner" : "spectator");
  let kicker, h, p;
  if (role === "hunter") {
    kicker = "Hunters · frozen";
    h = "Hold position";
    p = "15 minutes passed without a capture. Don't move until the timer hits 0 — Runners are repositioning.";
  } else if (role === "runner") {
    kicker = "Runners · move now";
    h = "Relocate, then re-photo";
    p = "Walk to a new spot. When the timer hits 0 you'll be told to freeze and take a fresh position photo.";
  } else {
    kicker = "Stalemate";
    h = "Runners are repositioning";
    p = "Hunters are frozen for now. The hunt resumes when the timer hits 0.";
  }
  return `
    <div class="hs-relocate">
      <div class="hs-relocate-top">
        <div class="kicker">${escapeHtml(kicker)}</div>
        <h2>${escapeHtml(h)}</h2>
      </div>
      <div class="hs-relocate-clock">
        <div class="ring">
          <div style="display:flex;flex-direction:column;align-items:center">
            <div class="num">${escapeHtml(fmtClock(remain))}</div>
            <div class="unit">remaining</div>
          </div>
        </div>
      </div>
      <div class="hs-relocate-instr">
        <p>${escapeHtml(p)}</p>
      </div>
    </div>
  `;
}

export function renderRunnerStopAlert(me) {
  const room = state.room;
  const lockMin = room.lockMin || DEFAULT_SETTINGS.lockMin;
  return `
    <div class="hs-alert runner-stop">
      <div class="icon-big">
        <svg viewBox="0 0 24 24" fill="none" stroke="#ffe066" stroke-width="2.5"><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/><circle cx="12" cy="12" r="3"/></svg>
      </div>
      <div class="kicker">You are a Runner</div>
      <h2>Freeze in place</h2>
      <p>Take a photo of where you're standing now. You'll be locked for ${lockMin} minutes — Hunters use this photo to find you.</p>
      <div class="meta-row">
        <div class="pill"><span class="lbl">Lock</span><span class="val">${lockMin}m</span></div>
        <div class="pill"><span class="lbl">Hunters</span><span class="val">${state.members.filter((m) => m.team === "hunter").length}</span></div>
      </div>
      <button type="button" class="cta" data-action="take-position-photo">📷 Take position photo</button>
    </div>
  `;
}

export function renderStalemateOverlay() {
  return "";
}
