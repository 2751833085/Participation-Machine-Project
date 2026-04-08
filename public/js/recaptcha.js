/**
 * reCAPTCHA v3 — loaded only when app.js decides verification is needed (lazy).
 * Site key is public. Domains: https://www.google.com/recaptcha/admin
 * On failure returns null (caller may block or retry).
 */
export const RECAPTCHA_SITE_KEY =
  "6Lfv9qksAAAAAO2c658vEflUBj_6OIrd5OCg9c-p";

const SCRIPT_URLS = [
  `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`,
  `https://www.recaptcha.net/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`,
];

let ensurePromise = null;

function existingRecaptchaScript() {
  return document.querySelector('script[src*="recaptcha/api.js"]');
}

function injectScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      s.remove();
      reject(new Error("script error"));
    };
    document.head.appendChild(s);
  });
}

function waitForReady(timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (typeof window.grecaptcha?.ready === "function") {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error("reCAPTCHA API timeout"));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

async function ensureRecaptchaLoaded() {
  if (typeof window.grecaptcha?.execute === "function") return;

  if (!existingRecaptchaScript()) {
    let lastErr;
    for (const url of SCRIPT_URLS) {
      try {
        await injectScript(url);
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!existingRecaptchaScript() && lastErr) throw lastErr;
  }

  await waitForReady(10000);
}

function ensureRecaptcha() {
  if (ensurePromise) return ensurePromise;
  ensurePromise = ensureRecaptchaLoaded().catch((e) => {
    ensurePromise = null;
    throw e;
  });
  return ensurePromise;
}

/**
 * @param {string} action e.g. "google_signin"
 * @returns {Promise<string|null>} token or null if unavailable / wrong key type / blocked
 */
export async function runRecaptcha(action = "login") {
  try {
    await ensureRecaptcha();
  } catch (e) {
    console.warn("[reCAPTCHA] Load skipped:", e?.message || e);
    return null;
  }

  if (typeof window.grecaptcha?.execute !== "function") {
    console.warn(
      "[reCAPTCHA] grecaptcha.execute missing — use a v3 key, or check domain allowlist.",
    );
    return null;
  }

  return new Promise((resolve) => {
    window.grecaptcha.ready(async () => {
      try {
        const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, {
          action,
        });
        resolve(token || null);
      } catch (e) {
        console.warn("[reCAPTCHA] Execute failed:", e?.message || e);
        resolve(null);
      }
    });
  });
}
