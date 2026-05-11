/**
 * Profile page — edit avatar & unique display name, merits, theme, sign-out.
 * Visual structure matches _design-v2 ClassicalProfile / NeoProfile.
 */


import { escapeHtml } from "./page-html.js";
import { renderAppShell } from "./page-shell.js";
const FIREBASE_PATH = "../firebase-init.js";
const STATE_PATH = "../lib/state.js";
const UI_THEME_PATH = "../lib/ui-theme.js";
const MODAL_PATH = "../components/modal.js";
const AUTH_SERVICE_PATH = "../services/auth.js";
const USERS_PATH = "../services/users.js";
const PROFILE_MODALS_PATH = "./profile/modals.js";
const PROFILE_IDENTITY_PATH = "./profile/identity.js";
const PROFILE_PUBLISHED_PATH = "./profile/published.js";

let auth;
let getThemePreference;
let isGuestSession;
let setThemePreference;
let UI_THEME_NEO_DESIGN;
let openAlertModal;
let openConfirmModal;
let signOutUser;
let MERIT_PER_WIN;
let openEditUsernameModal;
let cleanupProfileIdentity;
let initProfileIdentity;
let clearPublishedListBindings;
let closePublishedSheet;
let initPublishedHuntsWatch;
let profileDepsPromise;

async function loadProfileDeps() {
  if (!profileDepsPromise) {
    profileDepsPromise = Promise.all([
      import(FIREBASE_PATH),
      import(STATE_PATH),
      import(UI_THEME_PATH),
      import(MODAL_PATH),
      import(AUTH_SERVICE_PATH),
      import(USERS_PATH),
      import(PROFILE_MODALS_PATH),
      import(PROFILE_IDENTITY_PATH),
      import(PROFILE_PUBLISHED_PATH),
    ]).then(([firebase, state, uiTheme, modal, authService, users, profileModals, identity, published]) => {
      auth = firebase.auth;
      getThemePreference = state.getThemePreference;
      isGuestSession = state.isGuestSession;
      setThemePreference = state.setThemePreference;
      UI_THEME_NEO_DESIGN = uiTheme.UI_THEME_NEO_DESIGN;
      openAlertModal = modal.openAlertModal;
      openConfirmModal = modal.openConfirmModal;
      signOutUser = authService.signOutUser;
      MERIT_PER_WIN = users.MERIT_PER_WIN;
      openEditUsernameModal = profileModals.openEditUsernameModal;
      cleanupProfileIdentity = identity.cleanupProfileIdentity;
      initProfileIdentity = identity.initProfileIdentity;
      clearPublishedListBindings = published.clearPublishedListBindings;
      closePublishedSheet = published.closePublishedSheet;
      initPublishedHuntsWatch = published.initPublishedHuntsWatch;
    });
  }
  return profileDepsPromise;
}

let publishedSheetUiAbort = null;

export async function render() {
  await loadProfileDeps();
  const user = auth.currentUser;
  const guestBrowseOnly = !user && isGuestSession();
  const accountLabel = user
    ? user.email || user.phoneNumber || "Google account"
    : guestBrowseOnly
      ? "Guest browse"
      : "Not signed in";

  await renderAppShell(
    `
    <div class="profile-page">
      <header class="neo-page-hero" aria-labelledby="profile-page-heading">
        <p class="neo-page-hero__kicker">&#x2605; Profile</p>
        <h1 class="neo-page-hero__title" id="profile-page-heading">Your<br/><span class="neo-page-hero__accent">Profile.</span></h1>
      </header>
      <section class="profile-hero-card" aria-labelledby="profile-heading">
        <div class="profile-hero-top">
          <p class="profile-hero-kicker">Member</p>
          <button type="button" class="profile-hero-cog" id="profile-hero-cog" aria-label="Open settings" title="Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>
          </button>
        </div>
        <div class="profile-hero-body">
          ${
            user
              ? `<button type="button" class="profile-hero-avatar" id="profile-avatar-open" aria-label="Change avatar" title="Change avatar">
                   <span class="profile-hero-ring"></span>
                 </button>`
              : `<span class="profile-hero-avatar profile-hero-avatar--static" aria-hidden="true">
                   <span class="profile-hero-ring"></span>
                 </span>`
          }
          <div class="profile-hero-name-wrap">
            <h1 id="profile-heading" class="profile-hero-name" data-profile-display-name>Your account</h1>
          </div>
        </div>
      </section>

      ${
        guestBrowseOnly
          ? `
      <section class="profile-card" aria-live="polite">
        <div class="status-banner">
          Guest mode is browse-only. Sign in with Google to set your avatar and public name, publish hunts, join runs, and use comments or reactions.
        </div>
        <a href="#/login" class="btn btn-primary btn-block profile-card-cta">Sign in with Google</a>
      </section>
      `
          : ""
      }

      ${
        user
          ? `
      <div class="profile-name-editor" hidden aria-hidden="true">
        <input
          id="profile-display-name"
          type="text"
          class="input-grow"
          maxlength="24"
          autocomplete="nickname"
          placeholder="Letters and numbers"
          aria-label="Public username"
        />
        <p class="profile-save-status" id="profile-save-status" aria-live="polite"></p>
      </div>
      `
          : ""
      }

      <section class="profile-stats-card" aria-labelledby="profile-merit-heading">
        <h2 id="profile-merit-heading" class="visually-hidden">Stats</h2>
        <div class="profile-stat" data-neo-card="mint">
          <span class="profile-stat-value" id="merit-points" data-merit-points>—</span>
          <span class="profile-stat-label">Merits</span>
        </div>
        <div class="profile-stat" data-neo-card="mustard">
          <span class="profile-stat-value" data-merit-hunts>—</span>
          <span class="profile-stat-label">Hunts</span>
        </div>
        <div class="profile-stat" data-neo-card="lav">
          <span class="profile-stat-value" data-merit-badges>0</span>
          <span class="profile-stat-label">Badges</span>
        </div>
      </section>

      <section class="profile-badges" aria-labelledby="profile-badges-heading">
        <h2 id="profile-badges-heading" class="profile-section-head">Badges</h2>
        <ul class="profile-badges-row" role="list">
          <li class="profile-badge-tile" data-tint="peach">
            <span class="profile-badge-star" aria-hidden="true">&#x2605;</span>
            <span class="profile-badge-name">Founder</span>
          </li>
          <li class="profile-badge-tile" data-tint="mustard">
            <span class="profile-badge-star" aria-hidden="true">&#x2605;</span>
            <span class="profile-badge-name">Central Park</span>
          </li>
          <li class="profile-badge-tile" data-tint="mint">
            <span class="profile-badge-star" aria-hidden="true">&#x2605;</span>
            <span class="profile-badge-name">Speedrun</span>
          </li>
          <li class="profile-badge-tile" data-tint="lav">
            <span class="profile-badge-star" aria-hidden="true">&#x2605;</span>
            <span class="profile-badge-name">Night Owl</span>
          </li>
        </ul>
      </section>

      <section class="profile-card profile-merit-how" aria-labelledby="profile-merit-how-heading">
        <details class="profile-merit-details">
          <summary class="profile-merit-summary">How you earn Merits</summary>
          <h3 id="profile-merit-how-heading" class="profile-merit-how-title">How you earn Merits</h3>
          <p class="profile-merit-lead">
            Each time you <strong>win a timed run</strong> (every checkpoint submitted before the countdown ends), Tourgo adds
            <strong>+${MERIT_PER_WIN} Merits</strong> as soon as the winning photo upload completes.
          </p>
          <ol class="profile-merit-steps">
            <li><strong>Sign in with Google</strong> so points save to this profile.</li>
            <li>From Home or a hunt page, <strong>start the run</strong> and keep it <strong>active</strong> until you finish.</li>
            <li>
              For <strong>each checkpoint</strong>, take or choose a photo that passes the hunt&rsquo;s checks while time remains
              (including location proof when that hunt requires it). You cannot submit after time is up.
            </li>
            <li>
              When the <strong>last</strong> required checkpoint is accepted, the run is marked <strong>won</strong> and
              <strong>+${MERIT_PER_WIN}</strong> is added to your total here.
            </li>
            <li>
              <strong>Same hunt, new run:</strong> every separate winning run earns <strong>+${MERIT_PER_WIN}</strong> again.
              There is no daily cap in the app.
            </li>
          </ol>
          ${
            guestBrowseOnly || !user
              ? `<p class="profile-merit-foot">Guest or signed-out browsing does not earn Merits&mdash;sign in with Google before you finish a run.</p>`
              : ""
          }
        </details>
      </section>

      ${
        user
          ? `
      <section class="profile-card profile-published-gate-card" aria-labelledby="profile-published-gate-heading">
        <h2 id="profile-published-gate-heading" class="profile-section-title">Your published hunts</h2>
        <p class="profile-section-lead">
          View, edit listing text and time limits, or delete hunts you published. Checkpoint photos and map pins are not changed here.
        </p>
        <button type="button" class="btn btn-secondary btn-block" id="profile-published-open">
          View published hunts
        </button>
      </section>
      <div
        id="profile-published-sheet"
        class="profile-published-sheet"
        hidden
        aria-hidden="true"
      >
        <div class="profile-published-sheet__backdrop" aria-hidden="true"></div>
        <div
          class="profile-published-sheet__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-published-sheet-title"
        >
          <div class="profile-published-sheet__head">
            <h2 id="profile-published-sheet-title" class="profile-published-sheet__title">
              Your published hunts
            </h2>
            <button
              type="button"
              class="btn btn-primary btn-small profile-published-sheet__close"
              id="profile-published-sheet-close"
            >
              Close
            </button>
          </div>
          <p class="profile-published-sheet__lead">
            Edit listing text and time limits, or delete a hunt you created. Checkpoint photos and map pins are not changed here.
          </p>
          <div class="profile-published-sheet__body">
            <div
              id="profile-published-list"
              class="profile-published-list"
              aria-live="polite"
            >
              <p class="profile-published-empty">Loading…</p>
            </div>
          </div>
        </div>
      </div>
      `
          : ""
      }

      <section class="profile-settings-block" aria-labelledby="profile-settings-heading">
        <p class="profile-settings-kicker" id="profile-settings-heading">Settings</p>
        <div class="profile-settings-stack">
          <div class="profile-setting-tile" role="group" aria-label="Visual theme">
            <span class="profile-setting-tile__label">Theme</span>
            <span class="profile-setting-tile__value">NeoUI</span>
          </div>
          <button
            type="button"
            class="profile-setting-tile profile-setting-tile--tap"
            id="profile-appearance-cycle"
            aria-label="Cycle appearance mode"
          >
            <span class="profile-setting-tile__label">Appearance</span>
            <span class="profile-setting-tile__value" data-appearance-value>System</span>
            <span class="profile-setting-tile__chevron" aria-hidden="true">&rsaquo;</span>
          </button>
          <div class="profile-setting-tile" aria-label="Notifications">
            <span class="profile-setting-tile__label">Notifications</span>
            <span class="profile-setting-tile__value">On</span>
          </div>
          <div class="profile-setting-tile profile-setting-tile--static" aria-label="Account">
            <span class="profile-setting-tile__label">Account</span>
            <span class="profile-setting-tile__value">${escapeHtml(accountLabel)}</span>
          </div>
          ${
            user
              ? `<button type="button" class="profile-setting-tile profile-setting-tile--danger" id="profile-sign-out">
                   <span class="profile-setting-tile__label">Sign out</span>
                   <span class="profile-setting-tile__value"></span>
                 </button>`
              : `<a href="#/login" class="profile-setting-tile profile-setting-tile--cta">
                   <span class="profile-setting-tile__label">Sign in with Google</span>
                   <span class="profile-setting-tile__chevron" aria-hidden="true">&rsaquo;</span>
                 </a>`
          }
        </div>
      </section>
    </div>
  `,
    "profile",
    { hideHeader: true },
  );

  wireAppearanceCycle();
  document.documentElement.dataset.uiTheme = UI_THEME_NEO_DESIGN;
  wireProfileCog();
  wireProfileSignOut();
  if (user) initSignedInProfile(user);
}

function wireAppearanceCycle() {
  paintAppearanceValue(getThemePreference());
  document
    .getElementById("profile-appearance-cycle")
    ?.addEventListener("click", () => {
      const next = nextAppearancePreference(getThemePreference());
      setThemePreference(next);
      paintAppearanceValue(next);
    });
}

function paintAppearanceValue(pref) {
  const el = document.querySelector("[data-appearance-value]");
  if (el) el.textContent = { light: "Light", dark: "Dark", system: "System" }[pref] || "System";
}

function nextAppearancePreference(current) {
  const cycle = ["light", "dark", "system"];
  const idx = cycle.indexOf(current);
  return cycle[(idx + 1) % cycle.length];
}

function wireProfileCog() {
  document.getElementById("profile-hero-cog")?.addEventListener("click", () => {
    if (auth.currentUser) openEditUsernameModal();
  });
}

function wireProfileSignOut() {
  document.getElementById("profile-sign-out")?.addEventListener("click", signOutFromProfile);
}

async function signOutFromProfile() {
  const ok = await openConfirmModal({
    title: "Sign out?",
    message: "You will need to sign in again to create hunts or play.",
    confirmText: "Sign out",
  });
  if (!ok) return;
  try {
    await signOutUser();
    location.hash = "#/login";
    window.location.reload();
  } catch (e) {
    alert(e.message || "Could not sign out.");
  }
}

function initSignedInProfile(user) {
  clearPublishedListBindings();
  const publishedSheetRoot = document.getElementById("profile-published-sheet");
  if (publishedSheetRoot) {
    document.body.appendChild(publishedSheetRoot);
  }

  publishedSheetUiAbort?.abort();
  publishedSheetUiAbort = new AbortController();
  const sheetUiSignal = publishedSheetUiAbort.signal;
  initPublishedHuntsWatch(user, { signal: sheetUiSignal });
  initProfileIdentity(user);
}

export function cleanup() {
  if (!profileDepsPromise) return;
  closePublishedSheet();
  publishedSheetUiAbort?.abort();
  publishedSheetUiAbort = null;
  cleanupProfileIdentity();
  clearPublishedListBindings();
}
