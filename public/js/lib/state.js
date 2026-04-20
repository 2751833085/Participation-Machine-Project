/**
 * Shared app-level state: color-scheme preference + auth-return navigation.
 */

const THEME_STORAGE_KEY = "tm-theme";
const AUTH_RETURN_KEY = "tm-auth-return";
/** Session-only: browse without Google sign-in (testing / preview). Cleared on real sign-in. */
const GUEST_SESSION_KEY = "tm-guest-session";

export function isGuestSession() {
  try {
    return sessionStorage.getItem(GUEST_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setGuestSession(on) {
  try {
    if (on) sessionStorage.setItem(GUEST_SESSION_KEY, "1");
    else sessionStorage.removeItem(GUEST_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function clearGuestSession() {
  setGuestSession(false);
}

/** Resolved color scheme for tokens/CSS (always "light" or "dark"). */
export function effectiveTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** User choice: light, dark, or follow system. */
export function getThemePreference() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export function setThemePreference(mode) {
  if (mode !== "light" && mode !== "dark" && mode !== "system") return;
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  syncThemeFromStorage();
}

export function syncThemeFromStorage() {
  document.documentElement.dataset.theme = effectiveTheme();
}

let systemThemeListenerBound = false;

/** When preference is "system", react to OS light/dark changes. */
export function bindSystemThemeListener() {
  if (systemThemeListenerBound) return;
  systemThemeListenerBound = true;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (getThemePreference() === "system") syncThemeFromStorage();
  };
  mq.addEventListener("change", onChange);
}

export function saveAuthReturn(hash) {
  if (hash && hash !== "#/login") {
    sessionStorage.setItem(AUTH_RETURN_KEY, hash);
  }
}

export function consumeAuthReturn() {
  let ret = sessionStorage.getItem(AUTH_RETURN_KEY) || "#/";
  sessionStorage.removeItem(AUTH_RETURN_KEY);
  if (ret === "#/login" || !ret.startsWith("#")) ret = "#/";
  return ret;
}

/** Call on sign-out so the next login does not jump to a stale return hash. */
export function clearStoredAuthReturn() {
  try {
    sessionStorage.removeItem(AUTH_RETURN_KEY);
  } catch {
    /* ignore */
  }
}
