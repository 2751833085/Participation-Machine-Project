/**
 * Friend — 5-second role reveal between dispersal end and in-game.
 *
 * Triggered client-side by `app.js::maybeStartRoleReveal()` when a player
 * sees the room flip from "dispersal" → "hunt" and their assigned team
 * (server-side, `phase-transitions.js::assignTeamsAndStartHunt`) becomes
 * known. Mid-joiners (huntStartedAt > 6 s ago) skip the reveal.
 *
 * The progress bar is a pure CSS animation (5 s linear forwards), not a
 * `data-live` text — keeps the helpers/liveTimer system simple and
 * avoids `stripLive` cache thrash for transient screens.
 */

import { state } from "./render-shell-runtime.js";

const HUNTER_ICON = `<svg viewBox="0 0 24 24" width="58" height="58" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/><path d="M11 7v8"/><path d="M7 11h8"/></svg>`;

const RUNNER_ICON = `<svg viewBox="0 0 24 24" width="62" height="62" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c-4 3.2-6 6.2-6 9a6 6 0 0 0 12 0c0-2.8-2-5.8-6-9Z"/><path d="M12 14v7"/><path d="M9 17h6"/></svg>`;

export function renderRoleReveal() {
  const role = state.roleRevealRole === "hunter" ? "hunter" : "runner";
  const isHunter = role === "hunter";
  const icon = isHunter ? HUNTER_ICON : RUNNER_ICON;
  const copy = isHunter
    ? "Catch runners by scanning their QR."
    : "Hide first, survive the timer, avoid scans.";
  return `
    <div class="hs-role-reveal hs-role-reveal-${role}">
      <div class="hs-role-reveal-glow" aria-hidden="true"></div>
      <div class="hs-role-reveal-stage">
        <div class="hs-role-reveal-chip">Dispersal complete · 5 sec</div>
        <div class="hs-role-reveal-card">
          <div class="hs-role-reveal-disc">${icon}</div>
          <div class="hs-role-reveal-kicker">You are a</div>
          <div class="hs-role-reveal-name">${isHunter ? "Hunter" : "Runner"}.</div>
          <p class="hs-role-reveal-copy">${copy}</p>
        </div>
        <div class="hs-role-reveal-foot">
          <div class="hs-role-reveal-bar"><div class="fill"></div></div>
          <div class="hs-role-reveal-status">Entering game phase</div>
        </div>
      </div>
    </div>
  `;
}
