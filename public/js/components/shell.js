/**
 * App shell: renders the page wrapper, bottom dock, and footer.
 */

import { auth } from "../firebase-init.js";
import { refreshNetworkBanner } from "../lib/network-banner.js";
import { syncThemeFromStorage } from "../lib/state.js";
import { watchMeritPoints } from "../services/users.js";

/** Inline SVG for portrait gate — decorative only (dialog has text labels). */
const PORTRAIT_GATE_ILLU = `<svg class="portrait-gate__svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="41" y="27" width="18" height="46" rx="3.5" opacity="0.3"/><rect x="38.5" y="30" width="23" height="40" rx="4"/><circle cx="50" cy="62" r="1.75" fill="currentColor" stroke="none"/><path d="M14 50a34 34 0 1 1 12-24" opacity="0.9"/><polyline points="10 36 14 28 22 33" opacity="0.9"/></svg>`;

const DOCK_ICONS = {
  hunts: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
  profile: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>`,
  signIn: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>`,
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

function mobileDock(activePage) {
  const user = auth.currentUser;
  const profileHref = user ? "#/profile" : "#/login";
  const dockItem = (href, pageKey, label, iconHtml) =>
    `<a class="mobile-tab ${activePage === pageKey ? "is-active" : ""}" href="${href}">
      <span class="mobile-tab-icon">${iconHtml}</span>
      <span class="mobile-tab-label">${label}</span>
    </a>`;
  const profileIcon = user ? DOCK_ICONS.profile : DOCK_ICONS.signIn;
  const profileLabel = user ? "Profile" : "Sign in";
  const profileKey = user ? "profile" : "login";
  return `
    <nav class="app-dock" aria-label="App navigation">
      <div class="app-dock-inner">
        ${dockItem("#/", "hunts", "Hunts", DOCK_ICONS.hunts)}
        <a class="mobile-tab mobile-tab-plus ${activePage === "create" ? "is-active" : ""}" href="#/create" aria-label="Create hunt">
          <span class="mobile-tab-plus-circle">${DOCK_ICONS.plus}</span>
          <span class="mobile-tab-label">Create</span>
        </a>
        ${dockItem(profileHref, profileKey, profileLabel, profileIcon)}
      </div>
    </nav>
  `;
}

function wireHeaderMerit() {
  const el = () => document.getElementById("merit-points");
  watchMeritPoints((text) => {
    if (el()) el().textContent = text;
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
  document.body.innerHTML = `
    <div id="network-offline-banner" class="network-offline-banner" role="alert" aria-live="assertive" aria-hidden="true">
      <div class="network-offline-banner__inner">
        <p class="network-offline-banner__text"><span aria-hidden="true">⚠️</span> Unable to connect to the internet. Please check your connection and try again.</p>
        <button type="button" class="btn btn-secondary btn-small network-offline-banner__reconnect" id="network-reconnect-btn">Reconnect</button>
      </div>
    </div>
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
  wireHeaderMerit();
  refreshNetworkBanner();
}
