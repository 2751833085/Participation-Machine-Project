import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-storage.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-analytics.js";

/**
 * authDomain must match an OAuth redirect URI in Google Cloud:
 *   https://<authDomain>/__/auth/handler
 * Use the **same host the user opened** for web.app vs firebaseapp.com so the
 * handler that Google redirects to is the one your OAuth client lists.
 * Add BOTH handlers in GCP if users may use either URL:
 *   https://tourgo-a8ca9.firebaseapp.com/__/auth/handler
 *   https://tourgo-a8ca9.web.app/__/auth/handler
 * Preview channels (*.web.app) use firebaseapp.com.
 * @see https://firebase.google.com/docs/auth/web/redirect-best-practices
 */
const PROJECT_DEFAULT_AUTH_HOST = "tourgo-a8ca9.firebaseapp.com";
const PROJECT_PRIMARY_WEB_HOST = "tourgo-a8ca9.web.app";

function authDomainForPage() {
  try {
    const h = window.location.hostname.toLowerCase();
    if (h === PROJECT_PRIMARY_WEB_HOST) return PROJECT_PRIMARY_WEB_HOST;
    if (h === PROJECT_DEFAULT_AUTH_HOST) return PROJECT_DEFAULT_AUTH_HOST;
    if (h === "localhost" || h === "127.0.0.1") return PROJECT_DEFAULT_AUTH_HOST;
    if (h.endsWith(".web.app")) return PROJECT_DEFAULT_AUTH_HOST;
    return PROJECT_DEFAULT_AUTH_HOST;
  } catch {
    return PROJECT_DEFAULT_AUTH_HOST;
  }
}

const firebaseConfig = {
  apiKey: "AIzaSyATg_w5VJIKnwI_Br_1k86jdwoFcq6EHxY",
  authDomain: authDomainForPage(),
  projectId: "tourgo-a8ca9",
  storageBucket: "tourgo-a8ca9.firebasestorage.app",
  messagingSenderId: "797991116667",
  appId: "1:797991116667:web:d64ba93a4dfdddfe41e7de",
  measurementId: "G-KW6KJCMEN4",
};

const app = initializeApp(firebaseConfig);
export { app };
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

isSupported().then((ok) => {
  if (ok) getAnalytics(app);
});
