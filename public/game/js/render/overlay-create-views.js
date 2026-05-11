/**
 * Friends — room creation progress screens.
 */
import { escapeHtml, state } from "./render-overlay-runtime.js";

export function renderCreatingScreen() {
  return `
    <div class="hs-shell">
      <div class="hs-create-stage">
        <div class="orb">
          <div class="ring r1"></div>
          <div class="ring r2"></div>
          <div class="ring r3"></div>
          <div class="core"></div>
        </div>
        <div class="kicker">Setting up</div>
        <h2>Creating room…</h2>
        <p>Reserving a code, opening the lobby, getting your spot ready.</p>
        <div class="line">
          <span>${escapeHtml(state.createdName || "Untitled room")}</span>
        </div>
      </div>
    </div>
  `;
}

export function renderCreatedSuccessScreen() {
  return `
    <div class="hs-shell">
      <div class="hs-create-stage success">
        <div class="check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg>
        </div>
        <div class="kicker">Room created</div>
        <h2>You're <em>the host</em></h2>
        <div class="big-code">
          <span class="lbl">Invite code</span>
          <span class="val">${escapeHtml(state.createdCode || "")}</span>
        </div>
        <p>Share this code so friends can join. Opening the lobby…</p>
      </div>
    </div>
  `;
}
