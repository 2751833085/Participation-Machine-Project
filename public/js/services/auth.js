/**
 * Authentication: Google sign-in (popup on desktop; full redirect on iOS / WebKit
 * where popups and third-party storage often break OAuth completion).
 */

import { auth } from "../firebase-init.js";
import { nav } from "../lib/router.js";
import {
  saveAuthReturn,
  consumeAuthReturn,
  clearStoredAuthReturn,
  clearGuestSession,
  isGuestSession,
} from "../lib/state.js";
import { openAlertModal } from "../components/modal.js";
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";

const AUTH_REDIRECT_ERR_KEY = "tm-auth-redirect-error";

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
  if (
    (navigator.vendor || "").includes("Apple") &&
    /Mobile|Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS/i.test(ua)
  ) {
    return true;
  }
  return false;
}

/**
 * Call once on app load after authStateReady(). Finishes signInWithRedirect round-trip;
 * without this, iOS users can land back on the app still “signed out”.
 */
export async function completePendingGoogleRedirect() {
  try {
    const cred = await getRedirectResult(auth);
    if (cred?.user) {
      try {
        sessionStorage.removeItem(AUTH_REDIRECT_ERR_KEY);
      } catch {
        /* ignore */
      }
    }
    if (cred?.user && typeof window !== "undefined" && window.history?.replaceState) {
      const { pathname, hash } = window.location;
      if (window.location.search) {
        const h = (hash || "#/").split("?")[0] || "#/";
        window.history.replaceState(null, "", `${pathname}${h}`);
      }
    }
    return cred;
  } catch (e) {
    console.warn("[auth] getRedirectResult", e);
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
    return null;
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
  nav("#/login");
}

export function afterAuthSuccess() {
  nav(consumeAuthReturn());
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

export async function signOutUser() {
  clearStoredAuthReturn();
  clearGuestSession();
  try {
    sessionStorage.removeItem(AUTH_REDIRECT_ERR_KEY);
  } catch {
    /* ignore */
  }
  return fbSignOut(auth);
}
