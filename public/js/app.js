/**
 * App entry — route table, auth coordination, hash navigation.
 */

import { auth } from "./firebase-init.js";
import { bindSystemThemeListener, saveAuthReturn } from "./lib/state.js";
import { parseRoute, nav } from "./lib/router.js";
import { requestRoute, wireAppRoute } from "./lib/route-events.js";
import { renderShell } from "./components/shell.js";
import {
  afterAuthSuccess,
  completePendingGoogleRedirect,
} from "./services/auth.js";
import {
  ensureDefaultDisplayNameIfNeeded,
  unwatchMeritPoints,
} from "./services/users.js";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";

import * as homePage from "./pages/home.js";
import * as loginPage from "./pages/login.js";
import * as profilePage from "./pages/profile.js";
import * as createPage from "./pages/create.js";
import * as createPickerPage from "./pages/create-picker.js";
import * as createMapPage from "./pages/create-map.js";
import * as challengePage from "./pages/challenge.js";
import * as huntReviewPage from "./pages/hunt-review.js";
import * as runPage from "./pages/run.js";
import * as mapPage from "./pages/map.js";
import * as adminPage from "./pages/admin.js";

let currentCleanup = null;

function cleanupCurrent() {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
  unwatchMeritPoints();
}

function activate(pageModule) {
  currentCleanup = pageModule.cleanup ?? null;
}

function executeRoute() {
  cleanupCurrent();
  document.body.classList.remove("create-map-fs-open", "sheet-is-dragging");
  if (document.body.style.overflow === "hidden") {
    document.body.style.overflow = "";
  }

  const { page, id } = parseRoute();

  const allowWithoutFirebase =
    page === "login" || page === "admin" || page === "profile";
  if (!auth.currentUser && !allowWithoutFirebase) {
    saveAuthReturn(location.hash || "#/");
    if (location.hash !== "#/login") {
      location.hash = "#/login";
    }
    activate(loginPage);
    loginPage.render();
    return;
  }

  switch (page) {
    case "home":
    case "":
    case "overview":
    case "list":
      activate(homePage);
      homePage.render();
      break;

    case "map":
      activate(mapPage);
      mapPage.render();
      break;

    case "login":
      if (auth.currentUser) {
        /* Macrotask: finish this route pass before changing hash (avoids nested routing). */
        setTimeout(() => afterAuthSuccess(), 0);
        return;
      }
      activate(loginPage);
      loginPage.render();
      break;

    case "create-map":
      activate(createMapPage);
      createMapPage.render();
      break;

    case "create":
      if (id === "classic") {
        activate(createMapPage);
        createMapPage.render();
      } else {
        activate(createPickerPage);
        createPickerPage.render();
      }
      break;

    case "create-list":
      activate(createPage);
      createPage.render();
      break;

    case "profile":
      activate(profilePage);
      profilePage.render();
      break;

    case "admin":
      activate(adminPage);
      adminPage.render();
      break;

    case "challenge":
      if (!id) {
        renderShell(
          `<div class="page-narrow"><div class="status-banner error">Missing hunt id.</div><p><a href="#/" class="back-link">← All hunts</a></p></div>`,
        );
        break;
      }
      activate(challengePage);
      challengePage.render(id);
      break;

    case "hunt-review":
      if (!id) {
        renderShell(
          `<div class="page-narrow"><div class="status-banner error">Missing hunt id.</div><p><a href="#/" class="back-link">← All hunts</a></p></div>`,
          "hunts",
        );
        break;
      }
      activate(huntReviewPage);
      huntReviewPage.render(id);
      break;

    case "run":
      if (!id) {
        renderShell(
          `<div class="page-narrow"><div class="status-banner error">Missing run id.</div><p><a href="#/" class="back-link">← Home</a></p></div>`,
        );
        break;
      }
      activate(runPage);
      runPage.render(id);
      break;

    default:
      renderShell(
        `<div class="page-narrow"><div class="status-banner error">Unknown page.</div><p><a href="#/" class="back-link">← Home</a></p></div>`,
      );
  }
}

/* ── One coalesced flush per task (hashchange + nav + auth) ── */
let routeFlushQueued = false;
let routeDirty = false;

function scheduleRoute() {
  routeDirty = true;
  if (routeFlushQueued) return;
  routeFlushQueued = true;
  queueMicrotask(() => {
    routeFlushQueued = false;
    if (!routeDirty) return;
    routeDirty = false;
    executeRoute();
  });
}

wireAppRoute(scheduleRoute);

/**
 * Bottom dock: bubble phase, no stopPropagation (avoid breaking other UI).
 * Ensures hash updates and a route flush even if default anchor behavior differs by WebKit.
 */
function bindDockHashNavigation() {
  document.addEventListener(
    "click",
    (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest("a[href^='#/']");
      if (!a) return;
      if (!a.closest(".app-dock")) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#/")) return;
      e.preventDefault();
      /* Create tab always opens the mode picker; re-tap while already on #/create still refreshes the picker. */
      if (href === "#/create") {
        if (location.hash !== "#/create") {
          location.hash = "#/create";
        }
        requestRoute();
        return;
      }
      if (location.hash !== href) {
        location.hash = href;
      }
      /* Do not rely on hashchange alone (WebKit / in-app browsers can leave UI stale). */
      requestRoute();
    },
    false,
  );
}

bindDockHashNavigation();

/* ── Bootstrap ── */

renderShell('<p class="loading">Connecting…</p>', "home", { stripChrome: true });
bindSystemThemeListener();

(async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {
    console.warn("[auth] setPersistence", e);
  }
  try {
    /* Finish redirect flow before authStateReady so the first snapshot includes the new user. */
    await completePendingGoogleRedirect();
  } catch (e) {
    console.warn("[auth] completePendingGoogleRedirect", e);
  }
  try {
    await auth.authStateReady();
  } catch (e) {
    console.warn("[auth] authStateReady", e);
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      void ensureDefaultDisplayNameIfNeeded().catch((err) => {
        console.warn("ensureDefaultDisplayNameIfNeeded", err);
      });
    }
    scheduleRoute();
  });
  /* Macrotask fallback if the first observer callback is delayed (embedded WebViews). */
  setTimeout(() => scheduleRoute(), 0);
})();

window.addEventListener("hashchange", () => {
  requestRoute();
});
