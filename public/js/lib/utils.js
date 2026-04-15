/**
 * Pure utility functions shared across the app.
 */

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatCountdown(msLeft) {
  if (msLeft <= 0) return "0:00";
  const s = Math.floor(msLeft / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function allSpotsFound(found, total) {
  if (found.length !== total) return false;
  const set = new Set(found);
  for (let i = 0; i < total; i += 1) {
    if (!set.has(i)) return false;
  }
  return true;
}

/**
 * Reject if promise does not settle within ms (avoids infinite "Checking security…").
 */
export function promiseWithTimeout(promise, ms, timeoutMessage = "Request timed out.") {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    Promise.resolve(promise).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}
