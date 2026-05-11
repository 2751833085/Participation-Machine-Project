export { applyAppImageLoadMotion, renderAppShell } from "./app-shell-loader.js";
export { formatCountdown } from "./countdown.js";
export { haversineMeters } from "./distance.js";
export { escapeHtml } from "./html.js";
export { allSpotsFound } from "./hunt-progress.js";

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
