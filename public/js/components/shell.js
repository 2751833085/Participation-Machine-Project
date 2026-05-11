/**
 * App shell: renders the page wrapper, bottom dock, and footer.
 */

import { auth, syncDockVisualViewport, escapeHtml, refreshNetworkBanner, effectiveTheme, getThemePreference, setThemePreference, syncThemeFromStorage, watchMeritPoints, t, agentDebugLog } from "./component-utils.js";

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
  const meritText = isGuest ? t("shell.guest") : "0 PTS";
  const toggleThemeLabel = t("shell.toggleTheme");
  return `
    <header class="ds-header" role="banner">
      <div class="ds-header-inner">
        <span class="ds-header-brand">Tourgo</span>
        <div class="ds-header-actions">
          <span class="ds-merit-pill ${isGuest ? "is-guest" : ""}" data-merit-pill>${escapeHtml(meritText)}</span>
          <button type="button" class="ds-header-icon-btn" id="theme-toggle-btn" aria-label="${escapeHtml(toggleThemeLabel)}" title="${escapeHtml(toggleThemeLabel)}">
            <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
        </div>
      </div>
    </header>
  `;
}

/* Classical dock: Hunts · Saved · (+ FAB) · Rank · Profile */
const CL_DOCK = {
  hunts: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10l9-6 9 6v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>`,
  huntsF: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M3 10l9-6 9 6v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>`,
  saved: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
  savedF: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
  rank: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 21V8m6 13V3m6 18v-8"/></svg>`,
  rankF: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" aria-hidden="true"><path d="M6 21V8m6 13V3m6 18v-8"/></svg>`,
  profile: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/></svg>`,
  profileF: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/></svg>`,
  signIn: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>`,
  signInF: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>`,
  plus: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
  plusF: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><rect x="10.2" y="4.8" width="3.6" height="14.4" rx="1.8"/><rect x="4.8" y="10.2" width="14.4" height="3.6" rx="1.8"/></svg>`,
};

function mobileDock(activePage) {
  const user = auth.currentUser;
  const profileHref = user ? "#/profile" : "#/login";
  const tab = (href, key, label, idle, active) => {
    const on = activePage === key;
    const idleEnc = encodeURIComponent(idle);
    const activeEnc = encodeURIComponent(active);
    const iconHtml = on ? active : idle;
    return `<a class="mobile-tab ${on ? "is-active" : ""}" href="${href}" aria-label="${escapeHtml(label)}">
      <span class="mobile-tab-icon" data-icon-idle="${idleEnc}" data-icon-active="${activeEnc}" aria-hidden="true">${iconHtml}</span>
      <span class="mobile-tab-caption">${escapeHtml(label)}</span>
    </a>`;
  };
  const profileIcon = user ? CL_DOCK.profile : CL_DOCK.signIn;
  const profileIconActive = user ? CL_DOCK.profileF : CL_DOCK.signInF;
  const profileKey = user ? "profile" : "login";
  const profileLabel = user ? t("shell.nav.profile") : "Sign in";
  return `
    <nav class="app-dock app-dock--five" aria-label="App navigation">
      <div class="app-dock-inner app-dock-inner--five">
        ${tab("#/", "hunts", t("shell.nav.hunts"), CL_DOCK.hunts, CL_DOCK.huntsF)}
        ${tab("#/favorited", "favorited", t("shell.nav.saved"), CL_DOCK.saved, CL_DOCK.savedF)}
        <a class="mobile-tab mobile-tab-plus ${activePage === "create" ? "is-active" : ""}" href="#/create" aria-label="${escapeHtml(t("shell.nav.create"))}">
          <span class="mobile-tab-plus-circle" data-icon-idle="${encodeURIComponent(CL_DOCK.plus)}" data-icon-active="${encodeURIComponent(CL_DOCK.plusF)}" aria-hidden="true">${activePage === "create" ? CL_DOCK.plusF : CL_DOCK.plus}</span>
          <span class="mobile-tab-caption">${escapeHtml(t("shell.nav.create"))}</span>
        </a>
        ${tab("#/leaderboard", "leaderboard", t("shell.nav.rank"), CL_DOCK.rank, CL_DOCK.rankF)}
        ${tab(profileHref, profileKey, profileLabel, profileIcon, profileIconActive)}
      </div>
    </nav>
  `;
}

function wireHeaderMerit() {
  const pointsEls = () => document.querySelectorAll("[data-merit-points]");
  const pillEls = () => document.querySelectorAll("[data-merit-pill]");
  watchMeritPoints((text) => {
    const pointText = String(text || "0");
    const guestText = t("shell.guest");
    const isGuest = pointText === "Guest" || pointText === guestText;
    const pillText = isGuest ? guestText : `${pointText} PTS`;
    pointsEls().forEach((el) => {
      el.textContent = pointText;
    });
    pillEls().forEach((el) => {
      el.textContent = pillText;
      el.classList.toggle("is-guest", isGuest);
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

function applyRouteEnterMotion() {
  const root = document.querySelector("#app-main .page-transition-root");
  logRouteEnterRoot(root);
  if (!root) return;
  if (prefersReducedMotion()) {
    root.classList.add("is-route-entered");
    return;
  }
  const container = root.firstElementChild || root;
  const title = container.querySelector("h1, h2, .hero-title, .neo-hunts-title");
  logRouteEnterElements(container, title);
  markRouteMotionElements(container, title);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.add("is-route-entered");
      logRouteEnterApplied(root);
    });
  });
}

function prefersReducedMotion() {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

function logRouteEnterRoot(root) {
  // #region agent log
  agentDebugLog("run1", "H3", "public/js/components/shell.js:applyRouteEnterMotion", "enter-motion-root", {
    hasRoot: Boolean(root),
    rootClass: root?.className || "",
  });
  // #endregion
}

function logRouteEnterElements(container, title) {
  // #region agent log
  agentDebugLog("run1", "H4", "public/js/components/shell.js:applyRouteEnterMotion", "enter-motion-elements", {
    hasTitle: Boolean(title),
    childCount: container.children?.length || 0,
  });
  // #endregion
}

function markRouteMotionElements(container, title) {
  if (title) title.classList.add("motion-title");
  Array.from(container.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    if (title && child.contains(title)) return;
    child.classList.add("motion-content");
  });
}

function logRouteEnterApplied(root) {
  // #region agent log
  const cs = window.getComputedStyle(root);
  agentDebugLog("run1", "H4", "public/js/components/shell.js:applyRouteEnterMotion", "enter-motion-applied", {
    className: root.className,
    transitionDuration: cs.transitionDuration,
    transitionProperty: cs.transitionProperty,
    animationDuration: cs.animationDuration,
    opacity: cs.opacity,
    prefersReducedMotion: prefersReducedMotion(),
    htmlClass: document.documentElement.className,
  });
  // #endregion
}

export function applyImageLoadMotion(scope = document.getElementById("app-main")) {
  if (!scope) return;
  const images = scope.querySelectorAll("img:not([data-no-motion-image])");
  // #region agent log
  agentDebugLog("run5", "H12", "public/js/components/shell.js:wireImageLoadMotion", "image-motion-scan", {
    totalImages: images.length,
    avatarImages: scope.querySelectorAll("img.profile-hero-img").length,
  });
  // #endregion
  images.forEach((img, index) => {
    img.classList.add("motion-image");
    // Force a style flush so the browser commits the `motion-image` baseline
    // before cached image loads collapse the transition into one frame.
    // eslint-disable-next-line no-unused-expressions
    img.offsetWidth;
    const markLoaded = (reason) => markImageLoaded(img, index, reason);
    logImageMotionBind(img, index);
    if (img.complete && img.naturalWidth > 0) {
      requestAnimationFrame(() => markLoaded("immediate-complete"));
    } else {
      img.addEventListener("load", () => markLoaded("load-event"), { once: true });
      img.addEventListener("error", () => markLoaded("error-event"), { once: true });
    }
  });
}

function shouldLogImageMotion(img, index) {
  return index < 6 || img.classList.contains("profile-hero-img");
}

function logImageMotionBind(img, index) {
  if (!shouldLogImageMotion(img, index)) return;
  // #region agent log
  agentDebugLog("run5", "H13", "public/js/components/shell.js:wireImageLoadMotion", "image-motion-bind", {
    index,
    complete: img.complete,
    naturalWidth: img.naturalWidth || 0,
    className: img.className,
    src: img.getAttribute("src") || "",
  });
  // #endregion
}

function markImageLoaded(img, index, reason) {
  img.classList.add("is-loaded");
  if (!shouldLogImageMotion(img, index)) return;
  // #region agent log
  agentDebugLog("run5", "H13", "public/js/components/shell.js:wireImageLoadMotion", "image-motion-loaded", {
    index,
    reason,
    className: img.className,
    complete: img.complete,
    naturalWidth: img.naturalWidth || 0,
    src: img.getAttribute("src") || "",
  });
  // #endregion
}

/**
 * @param {{ stripChrome?: boolean, hideHeader?: boolean }} [options]
 * stripChrome: hide header + dock + footer (e.g. guest-only screens).
 * hideHeader: hide top header only, keep dock/footer.
 */
export function renderShell(inner, activePage = "home", options = {}) {
  const stripChrome = options.stripChrome === true;
  const hideHeader = stripChrome || options.hideHeader === true;
  const mainClass = stripChrome ? "main-wrap main-wrap--solo" : "main-wrap";
  const footerHtml = stripChrome ? "" : footer();
  const dockHtml = stripChrome ? "" : mobileDock(activePage);
  const headerHtml = hideHeader ? "" : appHeader();
  const offlineText = t("shell.offlineText");
  const reconnectText = t("shell.offlineReconnect");
  const portraitTitle = t("shell.portraitTitle");
  const portraitBody = t("shell.portraitBody");
  document.body.innerHTML = `
    <div id="network-offline-banner" class="network-offline-banner ds-banner ds-banner--offline" role="alert" aria-live="assertive" aria-hidden="true">
      <div class="network-offline-banner__inner ds-banner__inner">
        <div class="ds-banner__icon" aria-hidden="true">!</div>
        <div class="ds-banner__body">
          <div class="ds-banner__kicker">Connection lost</div>
          <p class="network-offline-banner__text ds-banner__text">${escapeHtml(offlineText)}</p>
        </div>
        <button type="button" class="btn btn-secondary btn-small network-offline-banner__reconnect ds-banner__action" id="network-reconnect-btn">${escapeHtml(reconnectText)}</button>
      </div>
    </div>
    ${headerHtml}
    <main id="app-main" class="${mainClass}"><div class="page-transition-root">${inner}</div></main>
    ${footerHtml}
    ${dockHtml}
    <div class="portrait-gate" role="alertdialog" aria-modal="true" aria-live="polite" aria-labelledby="portrait-gate-heading" aria-describedby="portrait-gate-desc">
      <div class="portrait-gate__panel">
        <div class="portrait-gate__visual-wrap" aria-hidden="true">${PORTRAIT_GATE_ILLU}</div>
        <p class="portrait-gate__kicker">Tourgo · NeoUI</p>
        <h2 id="portrait-gate-heading" class="portrait-gate__title">
          Phone<br/>Portrait<br/>Only
        </h2>
        <div id="portrait-gate-desc" class="portrait-gate__content">
          <p class="portrait-gate__text portrait-gate__text--wide">
            This interface is tuned for <strong>iPhone 16 Pro portrait</strong> (about <strong>402×874</strong>). Narrow the window and keep it upright to continue.
          </p>
          <p class="portrait-gate__text portrait-gate__text--narrow">
            This viewport is too narrow for the NeoUI baseline. Widen to at least <strong>360px</strong> to continue.
          </p>
          <p class="portrait-gate__text portrait-gate__text--fallback">
            ${escapeHtml(portraitTitle)} ${escapeHtml(portraitBody)}
          </p>
        </div>
        <span class="portrait-gate__pill" aria-hidden="true">Target · 402 × 874</span>
      </div>
    </div>
  `;
  syncThemeFromStorage();
  if (!hideHeader) {
    wireHeaderMerit();
    wireHeaderThemeToggle();
  }
  refreshNetworkBanner();
  syncDockVisualViewport();
  applyRouteEnterMotion();
  applyImageLoadMotion();
  /* Route switches replace the body but the document scrollTop persists —
     scrolling down on Hunts then dock-tapping Saved would leave Saved at the
     same offset. Reset the window + main-scroll container to top on every
     shell render so each page opens at the top. */
  try {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
    const main = document.getElementById("app-main");
    if (main) main.scrollTop = 0;
    const root = document.scrollingElement || document.documentElement;
    if (root) root.scrollTop = 0;
  } catch {}
}
