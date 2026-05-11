/**
 * Login — two-view flow aligned with Claude Design UI kit.
 *
 *   View 1 (welcome): hero image + serif italic title + "Begin the tour"
 *   View 2 (signin):  back button + "Welcome back." + email / password form
 *                     + Continue with Google + Continue as guest
 *
 * Registration is intentionally NOT available — accounts are provisioned by an
 * admin in the Firebase console.
 */


import { escapeHtml } from "./page-html.js";
import { renderAppShell } from "./page-shell.js";
const FIREBASE_PATH = "../firebase-init.js";
const ROUTER_PATH = "../lib/router.js";
const STATE_PATH = "../lib/state.js";
const AUTH_SERVICE_PATH = "../services/auth.js";

let auth;
let nav;
let setGuestSession;
let afterAuthSuccess;
let consumeAuthRedirectError;
let prefersGoogleAuthRedirect;
let signInWithEmail;
let signInWithGoogle;
let loginDepsPromise;

async function loadLoginDeps() {
  if (!loginDepsPromise) {
    loginDepsPromise = Promise.all([
      import(FIREBASE_PATH),
      import(ROUTER_PATH),
      import(STATE_PATH),
      import(AUTH_SERVICE_PATH),
    ]).then(([firebase, router, state, authService]) => {
      auth = firebase.auth;
      nav = router.nav;
      setGuestSession = state.setGuestSession;
      afterAuthSuccess = authService.afterAuthSuccess;
      consumeAuthRedirectError = authService.consumeAuthRedirectError;
      prefersGoogleAuthRedirect = authService.prefersGoogleAuthRedirect;
      signInWithEmail = authService.signInWithEmail;
      signInWithGoogle = authService.signInWithGoogle;
    });
  }
  return loginDepsPromise;
}

const ERR = {
  "auth/unauthorized-domain":
    "This domain is not allowed for sign-in. Add it under Firebase Authentication → Settings → Authorized domains.",
  "auth/operation-not-allowed": "This sign-in method is disabled for this project.",
  "auth/network-request-failed":
    "Network error. Check your connection or VPN and try again.",
  "auth/popup-blocked":
    "The browser blocked the sign-in window. Allow pop-ups for this site and try again.",
  "auth/cancelled-popup-request":
    "Sign-in was cancelled or another sign-in is already in progress.",
  "auth/internal-error":
    "Sign-in failed (Firebase / Google Cloud setup). Try another browser.",
  "auth/popup-closed-by-user":
    "The sign-in window was closed. Try again and complete the Google prompt.",
  "auth/invalid-credential":
    "Wrong email or password.",
  "auth/invalid-email": "That email address isn’t valid.",
  "auth/user-disabled": "This account is disabled. Contact an admin.",
  "auth/user-not-found":
    "No account found for that email. Accounts are provisioned by an admin.",
  "auth/wrong-password": "Wrong password for that account.",
  "auth/too-many-requests":
    "Too many attempts. Wait a minute before trying again.",
};

function signInErrorMessage(e) {
  if (e?.code === "auth/internal-error") {
    console.warn("[auth] internal-error", e);
  }
  return ERR[e?.code] || e?.message || "Sign-in failed.";
}

const ICON_GOOGLE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9c-.3 1.4-1 2.5-2.2 3.3v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.1z" fill="#4285F4"/><path d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.8c-1 .7-2.3 1.1-3.7 1.1-2.8 0-5.2-1.9-6-4.4H2.3v2.9C4.1 20.8 7.8 23 12 23z" fill="#34A853"/><path d="M6 14.3c-.2-.7-.4-1.4-.4-2.3s.1-1.6.4-2.3V6.8H2.3C1.5 8.4 1 10.2 1 12s.5 3.6 1.3 5.2L6 14.3z" fill="#FBBC05"/><path d="M12 5.3c1.6 0 3 .5 4.1 1.6l3.1-3.1C17.4 2 14.9 1 12 1 7.8 1 4.1 3.2 2.3 6.8L6 9.7c.8-2.5 3.2-4.4 6-4.4z" fill="#EA4335"/></svg>`;

const ICON_CHEVRON_LEFT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`;

function welcomeView() {
  return `
    <section class="login-view login-view--welcome" data-view="welcome" aria-labelledby="login-welcome-heading">
      <div class="login-hero-image" aria-hidden="true">
        <div class="login-hero-chip login-hero-chip--left">Est. NYC</div>
        <div class="login-hero-chip login-hero-chip--right">40.7128° N</div>
      </div>
      <div class="login-content">
        <p class="login-kicker">Tourgo · Photo hunts</p>
        <h1 id="login-welcome-heading" class="login-title">
          <span class="login-title-italic">The city,</span><br/>
          <span class="login-title-plain">on a timer.</span>
        </h1>
        <p class="login-lead">
          Timed photo scavenger hunts across Manhattan. Follow the clues, beat the clock, earn merits.
        </p>
        <div class="login-actions">
          <button type="button" class="btn btn-primary btn-block" id="btn-begin">Begin the tour</button>
          <button type="button" class="btn btn-secondary btn-block" id="btn-have-account" disabled>I already have an account</button>
        </div>
        <p class="login-signup-note">New account sign-up is currently unavailable.</p>
        <p class="login-weather">Partly cloudy · 62°F · Manhattan</p>
      </div>
    </section>
  `;
}

function signinView() {
  return `
    <section class="login-view login-view--signin" data-view="signin" aria-labelledby="login-signin-heading" hidden>
      <button type="button" class="login-back" id="btn-back" aria-label="Back">${ICON_CHEVRON_LEFT}</button>
      <div class="login-content login-content--signin">
        <p class="login-kicker login-kicker--tight">Sign in</p>
        <h1 id="login-signin-heading" class="login-title">
          <span class="login-title-italic">Welcome</span>
          <span class="login-title-plain"> back.</span>
        </h1>
        <p class="login-lead">
          Pick up a hunt where you left it. Your merits, your trail, your city.
        </p>

        <div id="login-status" class="login-status" aria-live="polite"></div>

        <form class="login-form" id="login-form" novalidate>
          <div class="login-field">
            <label class="login-field-label" for="login-email">Email/Username</label>
            <input
              class="login-field-input"
              id="login-email"
              name="email"
              type="text"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              placeholder="email or username"
              required
            />
          </div>
          <div class="login-field">
            <label class="login-field-label login-field-label--row" for="login-password">
              <span>Password</span>
            </label>
            <div class="login-field-password">
              <input
                class="login-field-input"
                id="login-password"
                name="password"
                type="password"
                autocomplete="current-password"
                placeholder="••••••••"
                required
              />
              <button type="button" class="login-show-toggle" id="btn-show-pass" aria-label="Show password">show</button>
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block login-submit" id="btn-signin">Sign in</button>
        </form>

        <div class="login-divider" role="separator"><span>or</span></div>

        <button type="button" class="btn btn-secondary btn-block login-btn-google" id="btn-google">
          <span class="login-btn-google-icon" aria-hidden="true">${ICON_GOOGLE}</span>
          <span>Continue with Google</span>
        </button>
        <button type="button" class="btn btn-ghost btn-block" id="btn-guest">Continue as guest</button>

        <p class="login-legal">
          By continuing you agree to Google’s
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
          and
          <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Terms</a>.
        </p>
      </div>
    </section>
  `;
}

function showView(name) {
  const views = document.querySelectorAll(".login-view");
  views.forEach((el) => {
    const match = el.dataset.view === name;
    if (match) {
      el.removeAttribute("hidden");
    } else {
      el.setAttribute("hidden", "");
    }
  });
}

export async function render() {
  await loadLoginDeps();
  await renderAppShell(
    `
    <div class="auth-page login-page">
      <div class="login-viewport">
        ${welcomeView()}
        ${signinView()}
      </div>
    </div>
  `,
    "login",
    { stripChrome: !auth.currentUser },
  );

  const els = collectLoginElements();
  wireLoginViewControls(els);
  wirePasswordToggle(els);
  showRedirectErrorIfAny(els.statusEl);
  wireGuestLogin(els.btnGuest);
  wireEmailLogin(els);
  wireGoogleLogin(els);
}

function collectLoginElements() {
  return {
    btnBegin: document.getElementById("btn-begin"),
    btnBack: document.getElementById("btn-back"),
    btnGoogle: document.getElementById("btn-google"),
    btnGuest: document.getElementById("btn-guest"),
    btnSignIn: document.getElementById("btn-signin"),
    btnShowPass: document.getElementById("btn-show-pass"),
    form: document.getElementById("login-form"),
    statusEl: document.getElementById("login-status"),
    emailInput: document.getElementById("login-email"),
    passwordInput: document.getElementById("login-password"),
  };
}

function wireLoginViewControls({ btnBegin, btnBack, emailInput }) {
  btnBegin?.addEventListener("click", () => {
    showView("signin");
    emailInput?.focus();
  });
  btnBack?.addEventListener("click", () => showView("welcome"));
}

function wirePasswordToggle({ btnShowPass, passwordInput }) {
  btnShowPass?.addEventListener("click", () => {
    const next = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = next;
    btnShowPass.textContent = next === "password" ? "show" : "hide";
    btnShowPass.setAttribute(
      "aria-label",
      next === "password" ? "Show password" : "Hide password",
    );
  });
}

function showRedirectErrorIfAny(statusEl) {
  const redirectErr = consumeAuthRedirectError();
  if (!redirectErr || !statusEl) return;
  statusEl.innerHTML = `<div class="status-banner error">${escapeHtml(signInErrorMessage(redirectErr))}</div>`;
  showView("signin");
}

function wireGuestLogin(btnGuest) {
  btnGuest?.addEventListener("click", () => {
    setGuestSession(true);
    nav("#/");
  });
}

function wireEmailLogin({ form, statusEl, emailInput, passwordInput, btnSignIn }) {
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.innerHTML = "";
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      statusEl.innerHTML = `<div class="status-banner error">Enter your email and password.</div>`;
      return;
    }
    btnSignIn.disabled = true;
    try {
      await completeEmailSignIn(email, password);
    } catch (err) {
      statusEl.innerHTML = `<div class="status-banner error">${escapeHtml(signInErrorMessage(err))}</div>`;
      btnSignIn.disabled = false;
    }
  });
}

async function completeEmailSignIn(email, password) {
  await signInWithEmail(email, password);
  await auth.authStateReady();
  if (!auth.currentUser) {
    throw new Error("Sign-in finished but no user session was created.");
  }
  afterAuthSuccess();
}

function wireGoogleLogin({ btnGoogle, statusEl }) {
  btnGoogle?.addEventListener("click", async () => {
    statusEl.innerHTML = "";
    btnGoogle.disabled = true;
    const useRedirect = prefersGoogleAuthRedirect();
    try {
      await completeGoogleSignIn(statusEl, useRedirect);
    } catch (e) {
      statusEl.innerHTML = `<div class="status-banner error">${escapeHtml(signInErrorMessage(e))}</div>`;
      btnGoogle.disabled = false;
    }
  });
}

async function completeGoogleSignIn(statusEl, useRedirect) {
  if (useRedirect) {
    statusEl.innerHTML =
      '<div class="status-banner">Opening Google sign-in…</div>';
  }
  await signInWithGoogle();
  if (useRedirect) return;
  await auth.authStateReady();
  if (!auth.currentUser) {
    throw new Error(
      "Sign-in finished but no user session (try a normal browser tab, not the editor preview).",
    );
  }
  afterAuthSuccess();
}

export function cleanup() {
  // no-op
}
