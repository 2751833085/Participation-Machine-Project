/**
 * Client-side admin gate (demo). Credentials are visible in bundle — use server auth in production.
 */

const SESSION_KEY = "tm-admin-session";
const PASS_KEY = "tm-admin-api-pass";

export function isAdminAuthed() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

/**
 * @param {boolean} ok
 * @param {string} [password] Same password sent to Callable adminPortal (must match Functions secret ADMIN_DASHBOARD_PASSWORD).
 */
export function setAdminAuthed(ok, password) {
  if (ok) {
    sessionStorage.setItem(SESSION_KEY, "1");
    if (typeof password === "string" && password.length > 0) {
      sessionStorage.setItem(PASS_KEY, password);
    }
  } else {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(PASS_KEY);
  }
}

export function getAdminApiPassword() {
  try {
    return sessionStorage.getItem(PASS_KEY) || "";
  } catch {
    return "";
  }
}

export function checkAdminCredentials(username, password) {
  return username === "admin" && password === "123321123";
}
