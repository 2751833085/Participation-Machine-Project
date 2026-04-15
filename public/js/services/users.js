/**
 * User service: merit points, public profile (unique display name, avatar preset).
 */

import { auth, db } from "../firebase-init.js";
import {
  doc,
  getDoc,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

export const MERIT_PER_WIN = 25;

export class DuplicateUsernameError extends Error {
  constructor() {
    super("That name is already taken. Try another.");
    this.code = "DUPLICATE_USERNAME";
  }
}

/** Preset avatars (copied to public/img/avatars). id "" = blank placeholder. */
export const AVATAR_PRESETS = [
  { id: "", file: null, label: "Blank" },
  { id: "anonymous", file: "Avatar_Default_Anonymous.webp", label: "Anonymous" },
  { id: "boy", file: "Avatar_Default_Boy.webp", label: "Boy" },
  { id: "girl", file: "Avatar_Default_Girl.webp", label: "Girl" },
  { id: "cat", file: "Avatar_Default_Cat.webp", label: "Cat" },
  { id: "dog", file: "Avatar_Default_Dog.webp", label: "Dog" },
  { id: "mouse", file: "Avatar_Default_Mouse.webp", label: "Mouse" },
  { id: "pig", file: "Avatar_Default_Pig.webp", label: "Pig" },
  { id: "lizard", file: "Avatar_Default_Lizard.webp", label: "Lizard" },
  { id: "ghoul", file: "Avatar_Default_Ghoul.webp", label: "Ghoul" },
  { id: "vampire", file: "Avatar_Default_Vampire.webp", label: "Vampire" },
  { id: "male1", file: "Avatar_Default_Male_1.webp", label: "Male 1" },
  { id: "male2", file: "Avatar_Default_Male_2.webp", label: "Male 2" },
  { id: "female1", file: "Avatar_Default_Female_1.webp", label: "Female 1" },
  { id: "female2", file: "Avatar_Default_Female_2.webp", label: "Female 2" },
  { id: "thiren1", file: "Avatar_Default_Thiren_1.webp", label: "Character 1" },
  { id: "thiren2", file: "Avatar_Default_Thiren_2.webp", label: "Character 2" },
];

export function avatarSrcForId(avatarId) {
  if (!avatarId) return null;
  const p = AVATAR_PRESETS.find((x) => x.id === avatarId);
  if (!p?.file) return null;
  return `img/avatars/${p.file}`;
}

/**
 * Lowercase single-spaced handle for uniqueness. Empty string if input empty.
 * Returns null if non-empty but invalid characters / length.
 * Allows auto-style names: "Explorer #xxxxxx" (6 letters/digits after #).
 */
export function normalizeUsername(trimmedDisplay) {
  const raw = String(trimmedDisplay || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase().replace(/\s+/g, " ");
  if (lower.length < 2 || lower.length > 24) return null;
  if (/^explorer #[a-z0-9]{6}$/.test(lower)) return lower;
  if (/^[a-z0-9]+(?: [a-z0-9]+)*$/.test(lower)) return lower;
  return null;
}

const EXPLORER_CODE_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function randomExplorerCode(length) {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < length; i += 1) {
    s += EXPLORER_CODE_CHARS[buf[i] % EXPLORER_CODE_CHARS.length];
  }
  return s;
}

/**
 * New sign-ins with no display name get "Explorer #" + 6 random alphanumerics (unique handle).
 */
export async function ensureDefaultDisplayNameIfNeeded() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const d = snap.data() || {};
  if (String(d.displayName || "").trim() || String(d.usernameNorm || "").trim()) {
    return;
  }

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const code = randomExplorerCode(6);
    const displayName = `Explorer #${code}`;
    try {
      await saveUserProfile({ displayName, avatarId: "" });
      return;
    } catch (e) {
      if (e instanceof DuplicateUsernameError || e?.code === "DUPLICATE_USERNAME") {
        continue;
      }
      throw e;
    }
  }
  console.warn("ensureDefaultDisplayNameIfNeeded: exhausted retries");
}

let userUnsub = null;

export function watchMeritPoints(callback) {
  const uid = auth.currentUser?.uid;
  if (userUnsub) {
    userUnsub();
    userUnsub = null;
  }
  if (!uid) {
    callback("Guest");
    return;
  }

  const userRef = doc(db, "users", uid);
  userUnsub = onSnapshot(
    userRef,
    (snap) => {
      const pts = snap.exists() ? (snap.data().meritPoints ?? 0) : 0;
      callback(String(pts));
    },
    () => callback("0"),
  );
}

export function unwatchMeritPoints() {
  if (userUnsub) {
    userUnsub();
    userUnsub = null;
  }
}

export async function awardMerit() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await setDoc(
    doc(db, "users", uid),
    { meritPoints: increment(MERIT_PER_WIN) },
    { merge: true },
  );
}

/**
 * Live user document for profile UI (displayName, usernameNorm, avatarId, merits).
 */
export function watchUserProfile(uid, onData, onError) {
  if (!uid) {
    onData(null);
    return () => {};
  }
  const userRef = doc(db, "users", uid);
  return onSnapshot(
    userRef,
    (snap) => {
      if (!snap.exists()) {
        onData({
          displayName: "",
          usernameNorm: "",
          avatarId: "",
          meritPoints: 0,
        });
        return;
      }
      const d = snap.data();
      onData({
        displayName: d.displayName ?? "",
        usernameNorm: d.usernameNorm ?? "",
        avatarId: d.avatarId ?? "",
        meritPoints: d.meritPoints ?? 0,
      });
    },
    (err) => {
      if (onError) onError(err);
      onData(null);
    },
  );
}

/**
 * Saves display name + avatar. Name must normalize uniquely (userHandles).
 * Pass `avatarId` as undefined to keep previous avatar when only updating name.
 */
export async function saveUserProfile({ displayName: rawName, avatarId }) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in.");

  const nameTrim = String(rawName || "").trim();
  const normalized = normalizeUsername(nameTrim);

  if (nameTrim.length > 0 && normalized === null) {
    throw new Error(
      "Use letters, numbers, and single spaces only (2–24 characters).",
    );
  }

  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, "users", uid);
    const userSnap = await transaction.get(userRef);
    const prevNorm = userSnap.exists() ? (userSnap.data().usernameNorm ?? "") : "";
    const prevName = userSnap.exists() ? (userSnap.data().displayName ?? "") : "";
    const prevAvatar = userSnap.exists() ? (userSnap.data().avatarId ?? "") : "";
    const nextAvatar = avatarId !== undefined ? String(avatarId || "") : prevAvatar;

    const onlyAvatar =
      avatarId !== undefined &&
      nameTrim === prevName &&
      (normalized || "") === (prevNorm || "");

    if (onlyAvatar) {
      transaction.set(
        userRef,
        { avatarId: nextAvatar, updatedAt: serverTimestamp() },
        { merge: true },
      );
      return;
    }

    if (nameTrim.length === 0) {
      if (prevNorm) {
        const oldRef = doc(db, "userHandles", prevNorm);
        const oldSnap = await transaction.get(oldRef);
        if (oldSnap.exists() && oldSnap.data().uid === uid) {
          transaction.delete(oldRef);
        }
      }
      transaction.set(
        userRef,
        {
          displayName: "",
          usernameNorm: "",
          avatarId: nextAvatar,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    const handleRef = doc(db, "userHandles", normalized);
    const handleSnap = await transaction.get(handleRef);
    if (handleSnap.exists() && handleSnap.data().uid !== uid) {
      throw new DuplicateUsernameError();
    }

    if (prevNorm && prevNorm !== normalized) {
      const oldRef = doc(db, "userHandles", prevNorm);
      const oldSnap = await transaction.get(oldRef);
      if (oldSnap.exists() && oldSnap.data().uid === uid) {
        transaction.delete(oldRef);
      }
    }

    if (!handleSnap.exists()) {
      transaction.set(handleRef, { uid });
    }

    transaction.set(
      userRef,
      {
        displayName: nameTrim,
        usernameNorm: normalized,
        avatarId: nextAvatar,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}
