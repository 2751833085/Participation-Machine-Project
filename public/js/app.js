/**
 * App entry — coalesced route flush, shell bootstrap, hash + dock wiring.
 * Route table: `lib/route-dispatch.js`. Hash patterns: `lib/router.js`.
 */

import { auth } from "./firebase-init.js";
import {
  bindSystemThemeListener,
  isGuestSession,
} from "./lib/state.js";
import { syncUiThemeFromStorage } from "./lib/ui-theme.js";
import { parseRoute } from "./lib/router.js";
import {
  requestRoute,
  takePendingRouteForce,
  wireAppRoute,
} from "./lib/route-events.js";
import { renderShell } from "./components/shell.js";
import { dispatchHashRoute } from "./lib/route-dispatch.js";
import { installDockVisualViewportSync } from "./lib/dock-visual-viewport.js";
import { installDockHashNavigation } from "./lib/dock-navigation.js";
import { startAuthAndRoutes } from "./lib/auth-bootstrap.js";
import { unwatchMeritPoints } from "./services/users.js";

let currentCleanup = null;

/** Hash after last completed `executeRoute` — suppress redundant `hashchange` after `nav()` / dock. */
let lastResolvedHash = "";
/** Full route identity after last flush — suppress duplicate `onAuthStateChanged` snapshots. */
let lastRouteFlushSig = null;

function routeFlushSignature() {
  return `${location.hash || "#/"}|${auth.currentUser?.uid ?? ""}|${isGuestSession() ? "1" : "0"}`;
}

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

async function executeRoute(forceFlush = false) {
  const sigPre = routeFlushSignature();
  if (
    !forceFlush &&
    lastRouteFlushSig !== null &&
    sigPre === lastRouteFlushSig
  ) {
    return;
  }

  try {
    cleanupCurrent();
    document.body.classList.remove("create-map-fs-open", "sheet-is-dragging");
    if (document.body.style.overflow === "hidden") {
      document.body.style.overflow = "";
    }

    const { page, id } = parseRoute();
    await dispatchHashRoute({ page, id, activate });
  } finally {
    lastRouteFlushSig = routeFlushSignature();
    lastResolvedHash = location.hash || "#/";
  }
}

/* ── One coalesced flush per task (hashchange + nav + auth) ── */
let routeFlushQueued = false;
let routeDirty = false;

function scheduleRoute() {
  routeDirty = true;
  if (routeFlushQueued) return;
  routeFlushQueued = true;
  queueMicrotask(async () => {
    routeFlushQueued = false;
    if (!routeDirty) return;
    routeDirty = false;
    const forceFlush = takePendingRouteForce();
    await executeRoute(forceFlush);
  });
}

wireAppRoute(scheduleRoute);

installDockHashNavigation();
installDockVisualViewportSync();

/* ── Bootstrap ── */

renderShell('<p class="loading">Connecting…</p>', "home", { stripChrome: true });
bindSystemThemeListener();
syncUiThemeFromStorage();

startAuthAndRoutes({ scheduleRoute });

window.addEventListener("hashchange", () => {
  const h = location.hash || "#/";
  if (h === lastResolvedHash) {
    return;
  }
  requestRoute();
});
