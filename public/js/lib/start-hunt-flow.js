/**
 * Shared “start a run” flow: sign-in gate, optional repeat-win confirm, geo check, createAttempt.
 */

import { auth } from "../firebase-init.js";
import { nav } from "./router.js";
import { saveAuthReturn } from "./state.js";
import { promptGuestNeedsSignIn } from "../services/auth.js";
import { createAttempt } from "../services/attempts.js";
import { huntStartAnchorCoords } from "../services/challenges.js";
import {
  assertWithinRadius,
  getGeoPosition,
  START_HUNT_MAX_DISTANCE_M,
} from "./geo-hunt-rules.js";
import { escapeHtml } from "./utils.js";

/**
 * @param {{
 *   challenge: object,
 *   challengeId: string,
 *   statusEl: HTMLElement | null,
 *   buttonEl: HTMLButtonElement,
 *   loginReturnHash: string,
 *   confirmRepeatWin: boolean,
 * }} opts
 */
export async function startHuntWithGeoCheck({
  challenge,
  challengeId,
  statusEl,
  buttonEl,
  loginReturnHash,
  confirmRepeatWin,
}) {
  if (!auth.currentUser) {
    if (await promptGuestNeedsSignIn("Starting a hunt needs a Google account.")) {
      nav("#/");
      return;
    }
    saveAuthReturn(loginReturnHash);
    nav("#/login");
    return;
  }
  if (confirmRepeatWin) {
    const ok = window.confirm(
      "You've already completed this hunt once. Do you want to complete it again?",
    );
    if (!ok) return;
  }
  buttonEl.disabled = true;
  try {
    if (statusEl) {
      statusEl.innerHTML =
        '<div class="status-banner info">Checking you are at the hunt…</div>';
    }
    const anchor = huntStartAnchorCoords(challenge);
    const pos = await getGeoPosition();
    assertWithinRadius(
      pos.lat,
      pos.lng,
      anchor.lat,
      anchor.lng,
      START_HUNT_MAX_DISTANCE_M,
      "the hunt start point",
    );
    if (statusEl) statusEl.innerHTML = "";
    const attemptId = await createAttempt(
      challengeId,
      challenge.timeLimitMinutes,
    );
    nav(`#/run/${attemptId}`);
  } catch (err) {
    if (statusEl) {
      statusEl.innerHTML = `<div class="status-banner error">${escapeHtml(err.message)}</div>`;
    }
    buttonEl.disabled = false;
  }
}
