/**
 * Firebase auth persistence + first snapshot → route scheduling.
 */

import { auth } from "./firebase.js";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";

const STATE_PATH = "./state.js";
const AUTH_SERVICE_PATH = "../services/auth.js";
const USERS_SERVICE_PATH = "../services/users.js";
let authBootstrapDeps;

async function getAuthBootstrapDeps() {
  if (!authBootstrapDeps) {
    authBootstrapDeps = Promise.all([
      import(STATE_PATH),
      import(AUTH_SERVICE_PATH),
      import(USERS_SERVICE_PATH),
    ]);
  }
  const [state, authService, usersService] = await authBootstrapDeps;
  return {
    clearGuestSession: state.clearGuestSession,
    completePendingGoogleRedirect: authService.completePendingGoogleRedirect,
    ensureDefaultDisplayNameIfNeeded: usersService.ensureDefaultDisplayNameIfNeeded,
  };
}

/**
 * @param {{ scheduleRoute: () => void }} opts
 */
export function startAuthAndRoutes({ scheduleRoute }) {
  (async () => {
    const {
      clearGuestSession,
      completePendingGoogleRedirect,
      ensureDefaultDisplayNameIfNeeded,
    } = await getAuthBootstrapDeps();
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (e) {
      console.warn("[auth] setPersistence", e);
    }
    try {
      await completePendingGoogleRedirect();
    } catch (e) {
      console.warn("[auth] completePendingGoogleRedirect", e);
    }
    try {
      await auth.authStateReady();
    } catch (e) {
      console.warn("[auth] authStateReady", e);
    }

    onAuthStateChanged(auth, (user) => {
      if (user) {
        clearGuestSession();
        void ensureDefaultDisplayNameIfNeeded().catch((err) => {
          console.warn("ensureDefaultDisplayNameIfNeeded", err);
        });
      }
      scheduleRoute();
    });
  })();
}
