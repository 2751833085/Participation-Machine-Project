/**
 * Firebase auth persistence + first snapshot → route scheduling.
 */

import { auth } from "../firebase-init.js";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { clearGuestSession } from "./state.js";
import { completePendingGoogleRedirect } from "../services/auth.js";
import { ensureDefaultDisplayNameIfNeeded } from "../services/users.js";

/**
 * @param {{ scheduleRoute: () => void }} opts
 */
export function startAuthAndRoutes({ scheduleRoute }) {
  (async () => {
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
