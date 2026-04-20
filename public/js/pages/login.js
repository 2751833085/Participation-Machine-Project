/**
 * Login — Google via popup (desktop) or full-page redirect (iOS / WebKit).
 * Welcome flow: 4-page carousel (features → beta notice → sign-in).
 */

import { auth } from "../firebase-init.js";
import { renderShell } from "../components/shell.js";
import { escapeHtml } from "../lib/utils.js";
import { nav } from "../lib/router.js";
import { setGuestSession } from "../lib/state.js";
import {
  afterAuthSuccess,
  consumeAuthRedirectError,
  prefersGoogleAuthRedirect,
  signInWithGoogle,
} from "../services/auth.js";

const ERR = {
  "auth/unauthorized-domain":
    "This domain is not allowed for sign-in. Add it under Firebase Authentication → Settings → Authorized domains.",
  "auth/operation-not-allowed": "Google sign-in is disabled for this project.",
  "auth/network-request-failed":
    "Network error while contacting Google. Check your connection or VPN.",
  "auth/popup-blocked":
    "The browser blocked the sign-in window. Allow pop-ups for this site and try again.",
  "auth/cancelled-popup-request":
    "Sign-in was cancelled or another sign-in is already in progress.",
  "auth/internal-error":
    "Sign-in failed (Firebase / Google Cloud setup). Try another browser; check API key restrictions and App Check if needed.",
  "auth/popup-closed-by-user":
    "The sign-in window was closed. Try again and complete the Google prompt.",
};

function signInErrorMessage(e) {
  if (e?.code === "auth/internal-error") {
    console.warn("[auth] internal-error", e);
  }
  return ERR[e?.code] || e?.message || "Sign-in failed.";
}

const ICON_MAP = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`;
const ICON_CAMERA = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
const ICON_CLOCK = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`;
const ICON_USER = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>`;
const ICON_BETA = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

const SLIDE_COUNT = 4;
const SWIPE_THRESHOLD_PX = 48;
/** Track is 400% wide; each slide is 25% of track (= one viewport). translate % is relative to the track. */
const SLIDE_SHIFT_PCT = 100 / SLIDE_COUNT;

let carouselAbort = null;

function wireWelcomeCarousel(root) {
  if (carouselAbort) carouselAbort.abort();
  carouselAbort = new AbortController();
  const { signal } = carouselAbort;

  const viewport = root.querySelector(".welcome-carousel-viewport");
  const track = root.querySelector(".welcome-carousel-track");
  const dots = root.querySelectorAll(".welcome-carousel-dot");
  const btnPrev = root.querySelector(".welcome-carousel-prev");
  const btnNext = root.querySelector(".welcome-carousel-next");
  const slides = root.querySelectorAll(".welcome-slide");

  if (!viewport || !track || !slides.length) return;

  let index = 0;
  let touchStartX = null;
  let touchStartY = null;
  let touchLastX = null;
  let touchLastY = null;

  function syncUi() {
    const pct = -index * SLIDE_SHIFT_PCT;
    track.style.transform = `translate3d(${pct}%, 0, 0)`;
    track.dataset.slide = String(index);

    slides.forEach((el, i) => {
      const on = i === index;
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-hidden", on ? "false" : "true");
      if ("inert" in el) el.inert = !on;
    });

    dots.forEach((dot, i) => {
      const on = i === index;
      dot.classList.toggle("is-active", on);
      if (on) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });

    if (btnPrev) {
      if (index <= 0) {
        btnPrev.setAttribute("hidden", "");
        btnPrev.setAttribute("aria-hidden", "true");
      } else {
        btnPrev.removeAttribute("hidden");
        btnPrev.removeAttribute("aria-hidden");
      }
    }
    if (btnNext) {
      const last = index >= SLIDE_COUNT - 1;
      if (last) {
        btnNext.setAttribute("hidden", "");
        btnNext.setAttribute("aria-hidden", "true");
      } else {
        btnNext.removeAttribute("hidden");
        btnNext.removeAttribute("aria-hidden");
      }
    }
  }

  function goTo(i) {
    index = Math.max(0, Math.min(SLIDE_COUNT - 1, i));
    syncUi();
  }

  function goNext() {
    goTo(index + 1);
  }

  function goPrev() {
    goTo(index - 1);
  }

  syncUi();

  btnNext?.addEventListener("click", () => goNext(), { signal });
  btnPrev?.addEventListener("click", () => goPrev(), { signal });

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => goTo(i), { signal });
  });

  viewport.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchLastX = touchStartX;
      touchLastY = touchStartY;
    },
    { signal, passive: true },
  );

  viewport.addEventListener(
    "touchmove",
    (e) => {
      if (touchStartX == null || e.touches.length !== 1) return;
      touchLastX = e.touches[0].clientX;
      touchLastY = e.touches[0].clientY;
    },
    { signal, passive: true },
  );

  function clearTouch() {
    touchStartX = null;
    touchStartY = null;
    touchLastX = null;
    touchLastY = null;
  }

  viewport.addEventListener(
    "touchend",
    (e) => {
      if (touchStartX == null || touchStartY == null) {
        clearTouch();
        return;
      }
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      clearTouch();
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.05) return;
      if (dx <= -SWIPE_THRESHOLD_PX) goNext();
      else if (dx >= SWIPE_THRESHOLD_PX) goPrev();
    },
    { signal, passive: true },
  );

  viewport.addEventListener("touchcancel", () => clearTouch(), {
    signal,
    passive: true,
  });

  root.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    },
    { signal },
  );
}

export function render() {
  renderShell(
    `
    <div class="page-narrow auth-page welcome-page">
      <div
        class="welcome-carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label="Welcome to Tourgo"
        tabindex="0"
      >
        <div class="welcome-carousel-viewport">
          <div class="welcome-carousel-track" data-slide="0">
            <div class="welcome-slide welcome-slide--intro" role="group" aria-roledescription="slide" aria-label="1 of 4" aria-hidden="false">
              <div class="welcome-slide-inner">
                <div class="welcome-slide-glow" aria-hidden="true"></div>
                <header class="welcome-hero">
                  <p class="welcome-kicker">Tourgo</p>
                  <h1 class="h1 welcome-title">Welcome</h1>
                  <p class="lead welcome-lead">Explore Manhattan with timed photo scavenger hunts—create routes, follow clues, and race the clock with friends.</p>
                </header>
                <ul class="welcome-features" role="list">
                  <li class="welcome-feature">
                    <span class="welcome-feature-icon">${ICON_MAP}</span>
                    <div class="welcome-feature-body">
                      <strong class="welcome-feature-title">Map-based hunts</strong>
                      <p class="welcome-feature-text">Place checkpoints on the map, add hints, and publish hunts others can discover.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div class="welcome-slide" role="group" aria-roledescription="slide" aria-label="2 of 4" aria-hidden="true">
              <div class="welcome-slide-inner">
                <h2 class="welcome-title">How it works</h2>
                <ul class="welcome-features" role="list">
                  <li class="welcome-feature">
                    <span class="welcome-feature-icon">${ICON_CAMERA}</span>
                    <div class="welcome-feature-body">
                      <strong class="welcome-feature-title">Photo proof</strong>
                      <p class="welcome-feature-text">Players capture moments at each stop—visual, playful, and easy to share.</p>
                    </div>
                  </li>
                  <li class="welcome-feature">
                    <span class="welcome-feature-icon">${ICON_CLOCK}</span>
                    <div class="welcome-feature-body">
                      <strong class="welcome-feature-title">Timed runs</strong>
                      <p class="welcome-feature-text">Set a time limit, start a run, and see how much of the city you can clear before the buzzer.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div class="welcome-slide" role="group" aria-roledescription="slide" aria-label="3 of 4" aria-hidden="true">
              <div class="welcome-slide-inner">
                <h2 class="welcome-title">Before you continue</h2>
                <ul class="welcome-features" role="list">
                  <li class="welcome-feature">
                    <span class="welcome-feature-icon" aria-hidden="true">${ICON_BETA}</span>
                    <div class="welcome-feature-body">
                      <strong class="welcome-feature-title">Early access</strong>
                      <p class="welcome-feature-text">Tourgo is still in active development. You may run into bugs, slow loads, or rough edges. If something looks wrong, try <strong>refreshing the page</strong> or signing out and back in.</p>
                      <p class="welcome-feature-text welcome-feature-text--muted">We’re improving the app often—thanks for your patience.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div class="welcome-slide welcome-slide--signin" role="group" aria-roledescription="slide" aria-label="4 of 4" aria-hidden="true">
              <div class="welcome-slide-inner">
                <section class="welcome-signin-final" aria-labelledby="welcome-signin-heading">
                  <div class="welcome-signin-final-head">
                    <div class="welcome-signin-final-badge" aria-hidden="true">
                      <span class="welcome-signin-final-badge-icon">${ICON_USER}</span>
                    </div>
                    <h2 id="welcome-signin-heading" class="welcome-signin-final-title">Sign in</h2>
                    <p class="welcome-signin-final-lead">Continue with Google to save hunts and merit points. You can stay signed in on <strong>multiple phones and browsers</strong> at the same time—everything stays linked to this Google account.</p>
                  </div>
                  <div id="login-status" class="welcome-signin-final-status"></div>
                  <div class="welcome-signin-final-panel card">
                    <button type="button" class="btn btn-primary btn-block" id="btn-google">Continue with Google</button>
                    <button type="button" class="btn btn-secondary btn-block" id="btn-guest">Continue as guest</button>
                    <p class="card-meta" style="margin-top:0.75rem;text-align:center;">Guests can browse hunts and the map. Sign in with Google to start a run, create hunts, or view the photo review feed.</p>
                    <p class="auth-legal"><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
                    · <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Terms</a></p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>

        <div class="welcome-carousel-controls">
          <div class="welcome-carousel-dots" role="group" aria-label="Slides">
            <button type="button" class="welcome-carousel-dot is-active" aria-label="Slide 1 of 4" aria-current="true"></button>
            <button type="button" class="welcome-carousel-dot" aria-label="Slide 2 of 4"></button>
            <button type="button" class="welcome-carousel-dot" aria-label="Slide 3 of 4"></button>
            <button type="button" class="welcome-carousel-dot" aria-label="Slide 4 of 4"></button>
          </div>
          <div class="welcome-carousel-nav welcome-carousel-nav--bottom">
            <button type="button" class="btn btn-ghost welcome-carousel-prev" aria-label="Previous slide" hidden>Back</button>
            <button type="button" class="btn btn-primary welcome-carousel-next" aria-label="Next slide">Next</button>
          </div>
        </div>
      </div>
    </div>
  `,
    "login",
    { stripChrome: !auth.currentUser },
  );

  const root = document.querySelector(".welcome-carousel");
  if (root) wireWelcomeCarousel(root);

  const statusEl = document.getElementById("login-status");
  const btn = document.getElementById("btn-google");
  const btnGuest = document.getElementById("btn-guest");

  const redirectErr = consumeAuthRedirectError();
  if (redirectErr && statusEl) {
    statusEl.innerHTML = `<div class="status-banner error">${escapeHtml(signInErrorMessage(redirectErr))}</div>`;
  }

  btnGuest?.addEventListener("click", () => {
    setGuestSession(true);
    nav("#/");
  });

  btn.addEventListener("click", async () => {
    statusEl.innerHTML = "";
    btn.disabled = true;
    const useRedirect = prefersGoogleAuthRedirect();
    try {
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
    } catch (e) {
      statusEl.innerHTML = `<div class="status-banner error">${escapeHtml(signInErrorMessage(e))}</div>`;
      btn.disabled = false;
    }
  });
}

export function cleanup() {
  carouselAbort?.abort();
  carouselAbort = null;
}
