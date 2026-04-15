/**
 * Attempts service: create, watch, update hunt attempts.
 */

import { auth, db } from "../firebase-init.js";
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
