/**
 * Per-user favorited hunts (`users/{uid}/favoritedHunts/{challengeId}`).
 */

import { auth, db } from "../firebase-init.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

/** @param {string} uid @param {string} challengeId */
export function favoritedHuntRef(uid, challengeId) {
  return doc(db, "users", uid, "favoritedHunts", challengeId);
}

/**
 * @param {string} challengeId
 * @param {boolean} favorited
 */
export async function setHuntFavorited(challengeId, favorited) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in.");
  const id = String(challengeId || "").trim();
  if (!id) throw new Error("Missing hunt.");
  const ref = favoritedHuntRef(uid, id);
  if (favorited) {
    await setDoc(ref, { createdAt: serverTimestamp() });
  } else {
    await deleteDoc(ref);
  }
}

/** @param {string} challengeId */
export async function isHuntFavorited(challengeId) {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  const id = String(challengeId || "").trim();
  if (!id) return false;
  const snap = await getDoc(favoritedHuntRef(uid, id));
  return snap.exists();
}

/**
 * @param {string} uid
 * @param {(ids: string[]) => void} onIds — newest favorites first
 * @param {(err: Error) => void} [onError]
 */
export function watchFavoritedHuntIds(uid, onIds, onError) {
  if (!uid) {
    onIds([]);
    return () => {};
  }
  const q = query(
    collection(db, "users", uid, "favoritedHunts"),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      onIds(snap.docs.map((d) => d.id));
    },
    (err) => {
      if (onError) onError(err);
      onIds([]);
    },
  );
}
