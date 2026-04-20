/**
 * App shell: renders the page wrapper, bottom dock, and footer.
 */

import { auth } from "../firebase-init.js";
import { syncDockVisualViewport } from "../lib/dock-visual-viewport.js";
import { escapeHtml } from "../lib/utils.js";
import { refreshNetworkBanner } from "../lib/network-banner.js";
import {
  effectiveTheme,
  getThemePreference,
  setThemePreference,
  syncThemeFromStorage,
} from "../lib/state.js";
import { syncUiThemeFromStorage } from "../lib/ui-theme.js";
import { watchMeritPoints } from "../services/users.js";

/** Inline SVG for portrait gate — decorative only (dialog has text labels). */
const PORTRAIT_GATE_ILLU = `<svg class="portrait-gate__svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="41" y="27" width="18" height="46" rx="3.5" opacity="0.3"/><rect x="38.5" y="30" width="23" height="40" rx="4"/><circle cx="50" cy="62" r="1.75" fill="currentColor" stroke="none"/><path d="M14 50a34 34 0 1 1 12-24" opacity="0.9"/><polyline points="10 36 14 28 22 33" opacity="0.9"/></svg>`;

const DOCK_ICONS = {
  hunts: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  huntsFilled: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
  plusFilled: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><rect x="10.25" y="5" width="3.5" height="14" rx="1.75"/><rect x="5" y="10.25" width="14" height="3.5" rx="1.75"/></svg>`,
  profile: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>`,
  profileFilled: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><circle cx="12" cy="8" r="4"/><ellipse cx="12" cy="19" rx="6.5" ry="3.75"/></svg>`,
  signIn: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>`,
  signInFilled: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4v-2h2V5h-2V3z"/><path d="M10 17l-1.41-1.41L11.17 13H3v-2h8.17l-2.58-2.59L10 7l5 5-5 5z"/></svg>`,
  favorited: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  favoritedFilled: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  leaderboard: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="5" height="11" rx="1"/><rect x="15" y="6" width="5" height="15" rx="1"/><rect x="9.5" y="14" width="5" height="7" rx="1"/></svg>`,
  leaderboardFilled: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><rect x="4" y="10" width="5" height="11" rx="1"/><rect x="15" y="6" width="5" height="15" rx="1"/><rect x="9.5" y="14" width="5" height="7" rx="1"/></svg>`,
};

function footer() {
  return `
    <footer class="app-footer">
      <div class="footer-inner">
        <p class="footer-brand">Tourgo</p>
      </div>
    </footer>
  `;
}

function appHeader() {
  const isGuest = !auth.currentUser;
  const meritText = isGuest ? "Guest" : "0 PTS";
  return `
    <header class="app-header" role="banner">
      <div class="app-header-inner">
        <span class="brand">Tourgo</span>
        <div class="header-actions">
          <span class="merit-pill ${isGuest ? "is-guest" : ""}" data-merit-pill>${escapeHtml(meritText)}</span>
          <button type="button" class="theme-toggle" id="theme-toggle-btn" aria-label="Toggle theme" title="Toggle theme">
            <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
        </div>
      </div>
    </header>
  `;
}

function mobileDock(activePage) {
  const user = auth.currentUser;
  const profileHref = user ? "#/profile" : "#/login";
  const dockItem = (href, pageKey, caption, iconIdle, iconActive) => {
    const active = activePage === pageKey;
    const icon = active ? iconActive : iconIdle;
    return `<a class="mobile-tab ${active ? "is-active" : ""}" href="${href}">
      <span class="mobile-tab-icon">${icon}</span>
      <span class="mobile-tab-caption">${escapeHtml(caption)}</span>
    </a>`;
  };
  const profileIdle = user ? DOCK_ICONS.profile : DOCK_ICONS.signIn;
  const profileActive = user ? DOCK_ICONS.profileFilled : DOCK_ICONS.signInFilled;
  const profileKey = user ? "profile" : "login";
  const createIcon = activePage === "create" ? DOCK_ICONS.plusFilled : DOCK_ICONS.plus;
  const createCaption = "Create";
  return `
    <nav class="app-dock app-dock--five" aria-label="App navigation">
      <div class="app-dock-inner app-dock-inner--five">
        ${dockItem("#/", "hunts", "Hunts", DOCK_ICONS.hunts, DOCK_ICONS.huntsFilled)}
        ${dockItem("#/favorited", "favorited", "Saved", DOCK_ICONS.favorited, DOCK_ICONS.favoritedFilled)}
        <a class="mobile-tab mobile-tab-plus ${activePage === "create" ? "is-active" : ""}" href="#/create">
          <span class="mobile-tab-plus-circle">${createIcon}</span>
          <span class="mobile-tab-caption">${escapeHtml(createCaption)}</span>
        </a>
        ${dockItem("#/leaderboard", "leaderboard", "Rank", DOCK_ICONS.leaderboard, DOCK_ICONS.leaderboardFilled)}
        ${dockItem(profileHref, profileKey, "Profile", profileIdle, profileActive)}
      </div>
    </nav>
  `;
}

function wireHeaderMerit() {
  const pointsEls = () => document.querySelectorAll("[data-merit-points]");
  const pillEls = () => document.querySelectorAll("[data-merit-pill]");
  watchMeritPoints((text) => {
    const pointText = String(text || "0");
    const pillText = pointText === "Guest" ? "Guest" : `${pointText} PTS`;
    pointsEls().forEach((el) => {
      el.textContent = pointText;
    });
    pillEls().forEach((el) => {
      el.textContent = pillText;
      el.classList.toggle("is-guest", pointText === "Guest");
    });
  });
}

function wireHeaderThemeToggle() {
  const btn = document.getElementById("theme-toggle-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const pref = getThemePreference();
    const resolved = effectiveTheme();
    if (pref === "light") setThemePreference("dark");
    else if (pref === "dark") setThemePreference("light");
    else setThemePreference(resolved === "dark" ? "light" : "dark");
  });
}

/**
 * @param {{ stripChrome?: boolean }} [options] — hide dock + footer (e.g. guest must use Sign in only).
 */
export function renderShell(inner, activePage = "home", options = {}) {
  const stripChrome = options.stripChrome === true;
  const mainClass = stripChrome ? "main-wrap main-wrap--solo" : "main-wrap";
  const footerHtml = stripChrome ? "" : footer();
  const dockHtml = stripChrome ? "" : mobileDock(activePage);
  const headerHtml = stripChrome ? "" : appHeader();
  document.body.innerHTML = `
    <div id="network-offline-banner" class="network-offline-banner" role="alert" aria-live="assertive" aria-hidden="true">
      <div class="network-offline-banner__inner">
        <p class="network-offline-banner__text"><span aria-hidden="true">\u26A0\uFE0E</span> Unable to connect to the internet. When your connection is back, tap <strong>Reconnect</strong> to reload this page.</p>
        <button type="button" class="btn btn-secondary btn-small network-offline-banner__reconnect" id="network-reconnect-btn">Reconnect</button>
      </div>
    </div>
    ${headerHtml}
    <main id="app-main" class="${mainClass}"><div class="page-transition-root">${inner}</div></main>
    ${footerHtml}
    ${dockHtml}
    <div class="portrait-gate" role="alertdialog" aria-modal="true" aria-live="polite" aria-labelledby="portrait-gate-heading" aria-describedby="portrait-gate-desc">
      <div class="portrait-gate__panel">
        <div class="portrait-gate__visual-wrap" aria-hidden="true">${PORTRAIT_GATE_ILLU}</div>
        <p class="portrait-gate__kicker">Tourgo</p>
        <h2 id="portrait-gate-heading" class="portrait-gate__title">Turn to portrait</h2>
        <p id="portrait-gate-desc" class="portrait-gate__text">
          This experience is built for <strong>narrow phone screens</strong> in portrait. Use a mobile device or rotate your display to continue.
        </p>
      </div>
    </div>
  `;
  syncThemeFromStorage();
  syncUiThemeFromStorage();
  wireHeaderMerit();
  wireHeaderThemeToggle();
  refreshNetworkBanner();
  syncDockVisualViewport();
}
