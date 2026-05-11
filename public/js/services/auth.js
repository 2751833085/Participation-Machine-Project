/**
 * Authentication: Google sign-in (popup on desktop; full redirect on iOS / WebKit
 * where popups and third-party storage often break OAuth completion).
 */

import { auth, db } from "./firebase.js";
import { requestRoute } from "../lib/route-events.js";
import { saveAuthReturn, consumeAuthReturn, clearStoredAuthReturn, clearGuestSession, isGuestSession } from "../lib/state.js";
import { openAlertModal } from "../components/modal.js";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

const AUTH_REDIRECT_ERR_KEY = "tm-auth-redirect-error";

function routeTo(hash) {
  location.hash = hash.startsWith("#") ? hash : `#${hash}`;
  requestRoute();
}

/**
 * Hardcoded admin identity. The main login page accepts `admin` as a username
 * and routes it to this Firebase Auth account. On the very first successful
 * attempt (with the expected password) we self-bootstrap the account via
 * createUserWithEmailAndPassword so no manual Firebase-console step is needed.
 *
 * Note: the Functions callable `adminPortal` still checks the same password
 * against its `ADMIN_DASHBOARD_PASSWORD` secret — make sure the secret is
 * set to ADMIN_PASSWORD below, otherwise admin actions will be rejected
 * server-side even after a successful client sign-in.
 */
export const ADMIN_USERNAME = "admin";
export const ADMIN_EMAIL = "admin@tourgo.local";
export const ADMIN_PASSWORD = "123321123";
const ADMIN_API_PASS_KEY = "tm-admin-api-pass";

/** True when the given Firebase user is the hardcoded admin. */
export function isAdminUser(user) {
  return !!user && user.email === ADMIN_EMAIL;
}

/** True when the active Firebase user is the hardcoded admin. */
export function isAdminAuthed() {
  return isAdminUser(auth.currentUser);
}

export async function waitForAuthReady() {
  await auth.authStateReady();
}

/**
 * Password that the Functions callable `adminPortal` expects. Stashed by the
 * login flow; falls back to the well-known constant so calls still work after
 * a restored Firebase session.
 */
export function getAdminApiPassword() {
  try {
    return sessionStorage.getItem(ADMIN_API_PASS_KEY) || ADMIN_PASSWORD;
  } catch {
    return ADMIN_PASSWORD;
  }
}

function normalizeUsername(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

async function signInOrBootstrapAdmin(password) {
  try {
    return await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
  } catch (e) {
    // Self-bootstrap the admin account on first use.
    //
    // Modern Firebase Auth obfuscates missing-account errors to prevent email
    // enumeration, so an "account doesn't exist" situation can surface as
    // `auth/user-not-found` (older SDKs) OR `auth/invalid-credential` /
    // `auth/invalid-login-credentials` (current SDKs). We only try to create
    // if the caller supplied the well-known admin password — otherwise a
    // stranger could claim the admin username with their own password.
    if (canBootstrapAdmin(e, password)) return bootstrapAdminUser(password, e);
    throw e;
  }
}

function canBootstrapAdmin(e, password) {
  return isMissingAdminAccountError(e) && password === ADMIN_PASSWORD;
}

function isMissingAdminAccountError(e) {
  const code = e?.code || "";
  return code === "auth/user-not-found" ||
    code === "auth/invalid-credential" ||
    code === "auth/invalid-login-credentials";
}

async function bootstrapAdminUser(password, originalErr) {
  try {
    return await createUserWithEmailAndPassword(
      auth,
      ADMIN_EMAIL,
      password,
    );
  } catch (createErr) {
    handleAdminBootstrapError(createErr, originalErr);
  }
}

function handleAdminBootstrapError(createErr, originalErr) {
  // Account already exists (almost certainly with a different password) —
  // surface the ORIGINAL sign-in error so the user sees the familiar
  // "wrong password" message.
  if (createErr?.code === "auth/email-already-in-use") throw originalErr;
  // Email/password provider disabled in Firebase Console — useful to
  // flag distinctly so the maintainer knows what to fix.
  if (createErr?.code === "auth/operation-not-allowed") {
    const err = new Error(
      "Email/password sign-in is disabled in this Firebase project. Enable it under Authentication → Sign-in method.",
    );
    err.code = "auth/operation-not-allowed";
    throw err;
  }
  throw createErr;
}

/** Guest session: browse only — needs Google sign-in for writes, runs, comments, create, profile edits. */
const GUEST_SIGNIN_MESSAGE =
  "You’re browsing as a guest. Sign in with Google to create hunts, join runs, upload checkpoint photos, comment or react on photos, and edit your profile.";

export function isGuestBrowsing() {
  return isGuestSession() && !auth.currentUser;
}

/**
 * If the user is in guest browse mode, shows a single alert and returns true (caller should stop).
 */
export async function promptGuestNeedsSignIn(detail) {
  if (!isGuestBrowsing()) return false;
  const message = detail ? `${detail} ${GUEST_SIGNIN_MESSAGE}` : GUEST_SIGNIN_MESSAGE;
  await openAlertModal({
    title: "Sign in with Google",
    message,
    okText: "OK",
  });
  return true;
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/**
 * Redirect on mobile / WebKit (popups and third-party storage are flaky).
 * Popup on desktop avoids full-page redirect races and “back to login” loops
 * when the return URL / hash is wrong after OAuth.
 */
export function prefersGoogleAuthRedirect() {
  if (typeof navigator === "undefined") return true;
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return true;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return isAppleMobileSafari(ua);
}

function isAppleMobileSafari(ua) {
  return (navigator.vendor || "").includes("Apple") &&
    /Mobile|Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

/**
 * Call once on app load after authStateReady(). Finishes signInWithRedirect round-trip;
 * without this, iOS users can land back on the app still “signed out”.
 */
export async function completePendingGoogleRedirect() {
  try {
    const cred = await getRedirectResult(auth);
    if (cred?.user) {
      clearAuthRedirectError();
      removeAuthRedirectQuery();
    }
    return cred;
  } catch (e) {
    console.warn("[auth] getRedirectResult", e);
    rememberAuthRedirectError(e);
    return null;
  }
}

function clearAuthRedirectError() {
  try {
    sessionStorage.removeItem(AUTH_REDIRECT_ERR_KEY);
  } catch {
    /* ignore */
  }
}

function removeAuthRedirectQuery() {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  const { pathname, hash, search } = window.location;
  if (!search) return;
  const cleanHash = (hash || "#/").split("?")[0] || "#/";
  window.history.replaceState(null, "", `${pathname}${cleanHash}`);
}

function rememberAuthRedirectError(e) {
  try {
    sessionStorage.setItem(
      AUTH_REDIRECT_ERR_KEY,
      JSON.stringify({
        code: e?.code || "",
        message: e?.message || String(e),
      }),
    );
  } catch {
    /* ignore */
  }
}

/** One-shot error from a failed redirect sign-in (shown on login page). */
export function consumeAuthRedirectError() {
  try {
    const raw = sessionStorage.getItem(AUTH_REDIRECT_ERR_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(AUTH_REDIRECT_ERR_KEY);
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : null;
  } catch {
    return null;
  }
}

export function redirectToLogin() {
  saveAuthReturn(location.hash || "#/");
  routeTo("#/login");
}

export function afterAuthSuccess() {
  routeTo(consumeAuthReturn());
}

export async function ensureUser() {
  if (auth.currentUser) return;
  if (await promptGuestNeedsSignIn("This action needs a Google account.")) {
    throw new Error("Sign in required");
  }
  redirectToLogin();
  throw new Error("Please sign in to continue.");
}

export async function signInWithGoogle() {
  if (prefersGoogleAuthRedirect()) {
    return signInWithRedirect(auth, googleProvider);
  }
  return signInWithPopup(auth, googleProvider);
}

/**
 * Resolve a username (lowercase, single-spaced `usernameNorm` per users.js) to
 * the owner's email by querying the `users` collection. Returns null if no
 * matching user or the match has no email on the profile doc.
 *
 * Public reads of `users` are allowed by firestore.rules, so this works while
 * signed-out (which is the case during login).
 */
async function lookupEmailByUsername(identifier) {
  const norm = String(identifier || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!norm) return null;
  const q = query(
    collection(db, "users"),
    where("usernameNorm", "==", norm),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data() || {};
  const email = typeof data.email === "string" ? data.email.trim() : "";
  return email || null;
}

/**
 * Email/username + password sign-in. If `identifier` contains "@" it's used
 * as-is; otherwise it's treated as a username and resolved to the owner's
 * email via the `users.usernameNorm` index.
 *
 * Registration is intentionally NOT exposed — new accounts must be
 * provisioned by an admin in the Firebase console.
 */
export async function signInWithEmail(identifier, password) {
  const raw = String(identifier || "").trim();

  // Hardcoded admin shortcut: `admin` (case-insensitive) always routes to
  // ADMIN_EMAIL, bypassing the Firestore username lookup so admin can sign in
  // even before any user documents exist.
  if (normalizeUsername(raw) === ADMIN_USERNAME) {
    const cred = await signInOrBootstrapAdmin(password);
    // Stash the password so admin-portal callable can forward it to the
    // Functions secret check. Cleared on signOutUser.
    try {
      sessionStorage.setItem(ADMIN_API_PASS_KEY, password);
    } catch {
      /* ignore */
    }
    return cred;
  }

  let email = raw;
  if (!raw.includes("@")) {
    const resolved = await lookupEmailByUsername(raw);
    if (!resolved) {
      const err = new Error("No account found for that username.");
      err.code = "auth/user-not-found";
      throw err;
    }
    email = resolved;
  }
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred;
}

export async function signOutUser() {
  clearStoredAuthReturn();
  clearGuestSession();
  try {
    sessionStorage.removeItem(AUTH_REDIRECT_ERR_KEY);
    sessionStorage.removeItem(ADMIN_API_PASS_KEY);
  } catch {
    /* ignore */
  }
  return fbSignOut(auth);
}
