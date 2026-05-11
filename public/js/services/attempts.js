/**
 * Attempts service: create, watch, update hunt attempts.
 */

import { auth, db } from "./firebase.js";
import { requestRoute } from "../lib/route-events.js";
import { escapeHtml } from "./service-utils.js";
import { promptGuestNeedsSignIn } from "./auth.js";
import { huntStartAnchorCoords } from "./challenges.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

const STATE_PATH = "../lib/state.js";
const GEO_RULES_PATH = "../lib/geo-hunt-rules.js";
let stateModule;
let geoRulesModule;

async function getStateModule() {
  if (!stateModule) stateModule = import(STATE_PATH);
  return stateModule;
}

async function getGeoRulesModule() {
  if (!geoRulesModule) geoRulesModule = import(GEO_RULES_PATH);
  return geoRulesModule;
}

function routeTo(hash) {
  location.hash = hash.startsWith("#") ? hash : `#${hash}`;
  requestRoute();
}

export async function createAttempt(challengeId, timeLimitMinutes) {
  const now = Timestamp.now();
  const ms = (timeLimitMinutes || 30) * 60 * 1000;
  const deadline = Timestamp.fromMillis(now.toMillis() + ms);
  const attemptRef = await addDoc(collection(db, "attempts"), {
    challengeId,
    userId: auth.currentUser.uid,
    startedAt: now,
    deadlineAt: deadline,
    foundSpotIndices: [],
    status: "active",
  });
  return attemptRef.id;
}

export async function getAttempt(id) {
  const snap = await getDoc(doc(db, "attempts", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function watchAttempt(id, callback) {
  return onSnapshot(doc(db, "attempts", id), (snap) => {
    if (snap.exists()) callback(snap.data());
  });
}

export async function updateFoundSpots(id, foundIndices) {
  await updateDoc(doc(db, "attempts", id), {
    foundSpotIndices: foundIndices,
  });
}

export async function completeAttemptWin(id, foundIndices) {
  await updateDoc(doc(db, "attempts", id), {
    foundSpotIndices: foundIndices,
    status: "won",
    completedAt: Timestamp.now(),
  });
}

export async function markLost(id) {
  const snap = await getDoc(doc(db, "attempts", id));
  if (snap.exists() && snap.data().status === "active") {
    await updateDoc(doc(db, "attempts", id), {
      status: "lost",
      completedAt: Timestamp.now(),
    });
  }
}

/** True if this user has finished this hunt successfully at least once (enables “Restart hunt”). */
export async function userHasWonChallenge(uid, challengeId) {
  const q = query(
    collection(db, "attempts"),
    where("userId", "==", uid),
    where("challengeId", "==", challengeId),
    where("status", "==", "won"),
    limit(1),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Shared “start a run” flow: sign-in gate, optional repeat-win confirm,
 * geo check, then attempt creation.
 */
export async function startHuntWithGeoCheck({
  challenge,
  challengeId,
  statusEl,
  buttonEl,
  loginReturnHash,
  confirmRepeatWin,
}) {
  if (!(await ensureCanStartHunt(loginReturnHash))) return;
  if (!confirmRepeatWinStart(confirmRepeatWin)) return;
  buttonEl.disabled = true;
  try {
    await assertAtHuntStart(challenge, statusEl);
    if (statusEl) statusEl.innerHTML = "";
    const attemptId = await createAttempt(
      challengeId,
      challenge.timeLimitMinutes,
    );
    routeTo(`#/run/${attemptId}`);
  } catch (err) {
    if (statusEl) {
      statusEl.innerHTML = `<div class="status-banner error">${escapeHtml(err.message)}</div>`;
    }
    buttonEl.disabled = false;
  }
}

async function ensureCanStartHunt(loginReturnHash) {
  if (auth.currentUser) return true;
  if (await promptGuestNeedsSignIn("Starting a hunt needs a Google account.")) {
    routeTo("#/");
    return false;
  }
  const { saveAuthReturn } = await getStateModule();
  saveAuthReturn(loginReturnHash);
  routeTo("#/login");
  return false;
}

function confirmRepeatWinStart(confirmRepeatWin) {
  if (!confirmRepeatWin) return true;
  return window.confirm(
    "You've already completed this hunt once. Do you want to complete it again?",
  );
}

async function assertAtHuntStart(challenge, statusEl) {
  if (statusEl) {
    statusEl.innerHTML =
      '<div class="status-banner info">Checking you are at the hunt…</div>';
  }
  const anchor = huntStartAnchorCoords(challenge);
  const {
    assertWithinRadius,
    getGeoPosition,
    START_HUNT_MAX_DISTANCE_M,
  } = await getGeoRulesModule();
  const pos = await getGeoPosition();
  assertWithinRadius(
    pos.lat,
    pos.lng,
    anchor.lat,
    anchor.lng,
    START_HUNT_MAX_DISTANCE_M,
    "the hunt start point",
  );
}
