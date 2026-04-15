import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-functions.js";
import { app } from "../firebase-init.js";
import { getAdminApiPassword } from "../lib/admin-session.js";

const REGION = "us-central1";

/**
 * @param {string} action
 * @param {Record<string, unknown>} [payload]
 */
export async function adminPortalRequest(action, payload = {}) {
  const adminPassword = getAdminApiPassword();
  if (!adminPassword) {
    throw new Error("Admin session expired or missing password. Sign in again.");
  }
  const fn = httpsCallable(getFunctions(app, REGION), "adminPortal");
  const { data } = await fn({ adminPassword, action, payload });
  return data;
}
