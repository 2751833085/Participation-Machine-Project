/**
 * App entry — coalesced route flush, shell bootstrap, hash + dock wiring.
 * Route table: `lib/route-dispatch.js`. Hash patterns: `lib/router.js`.
 */

import { auth } from "./firebase-init.js";
import {
  bindSystemThemeListener,
  isGuestSession,
} from "./lib/state.js";
import {
  requestRoute,
  takePendingRouteForce,
  wireAppRoute,
} from "./lib/route-events.js";

let currentCleanup = null;
const SHELL_PATH = "./components/shell.js";
const USERS_SERVICE_PATH = "./services/users.js";
const UI_THEME_PATH = "./lib/ui-theme.js";
const ROUTER_PATH = "./lib/router.js";
const ROUTE_DISPATCH_PATH = "./lib/route-dispatch.js";
const DOCK_VIEWPORT_PATH = "./lib/dock-visual-viewport.js";
const DOCK_NAVIGATION_PATH = "./lib/dock-navigation.js";
const AUTH_BOOTSTRAP_PATH = "./lib/auth-bootstrap.js";
const AGENT_LOG_PATH = "./lib/agent-log.js";
let shellModule;
let usersServiceModule;
let agentLogModule;
let routeRuntimeModules;

async function getShellModule() {
  if (!shellModule) shellModule = import(SHELL_PATH);
  return shellModule;
}

async function unwatchProfileMeritPoints() {
  if (!usersServiceModule) usersServiceModule = import(USERS_SERVICE_PATH);
  const { unwatchMeritPoints } = await usersServiceModule;
  unwatchMeritPoints();
}

function agentDebugLog(...args) {
  if (!agentLogModule) agentLogModule = import(AGENT_LOG_PATH);
  void agentLogModule.then(({ agentDebugLog: log }) => log(...args));
}

async function getRouteRuntimeModules() {
  if (!routeRuntimeModules) {
    routeRuntimeModules = Promise.all([
      import(ROUTER_PATH),
      import(ROUTE_DISPATCH_PATH),
    ]);
  }
  return routeRuntimeModules;
}

/** Hash after last completed `executeRoute` — suppress redundant `hashchange` after `nav()` / dock. */
let lastResolvedHash = "";
/** Full route identity after last flush — suppress duplicate `onAuthStateChanged` snapshots. */
let lastRouteFlushSig = null;

function routeFlushSignature() {
  return `${location.hash || "#/"}|${auth.currentUser?.uid ?? ""}|${isGuestSession() ? "1" : "0"}`;
}

async function cleanupCurrent() {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
  await unwatchProfileMeritPoints();
}

function activate(pageModule) {
  currentCleanup = pageModule.cleanup ?? null;
}

async function playRouteExitMotion() {
  const root = document.querySelector("#app-main .page-transition-root");
  // #region agent log
  agentDebugLog("run1", "H2", "public/js/app.js:playRouteExitMotion", "exit-motion-check", {
    hasRoot: Boolean(root),
    className: root?.className || "",
  });
  // #endregion
  if (!root || root.classList.contains("is-route-leaving")) return;
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReduced) return;
  root.classList.remove("is-route-entered");
  root.classList.add("is-route-leaving");
  await new Promise((resolve) => window.setTimeout(resolve, 190));
}

async function executeRoute(forceFlush = false) {
  const sigPre = routeFlushSignature();
  logExecuteRouteStart(forceFlush, sigPre);
  if (shouldSkipRouteFlush(forceFlush, sigPre)) {
    logExecuteRouteSkipped(forceFlush, sigPre);
    return;
  }

  try {
    await playRouteExitMotion();
    await cleanupCurrent();
    resetRouteBodyState();
    const [{ parseRoute }, { dispatchHashRoute }] = await getRouteRuntimeModules();
    const { page, id } = parseRoute();
    logParsedRoute(page, id);
    await dispatchHashRoute({ page, id, activate });
    logPostDispatchDom();
  } finally {
    lastRouteFlushSig = routeFlushSignature();
    lastResolvedHash = location.hash || "#/";
  }
}

function shouldSkipRouteFlush(forceFlush, sigPre) {
  return !forceFlush &&
    lastRouteFlushSig !== null &&
    sigPre === lastRouteFlushSig;
}

function resetRouteBodyState() {
  document.body.classList.remove("create-map-fs-open", "sheet-is-dragging");
  if (document.body.style.overflow === "hidden") {
    document.body.style.overflow = "";
  }
}

function logExecuteRouteStart(forceFlush, sigPre) {
  // #region agent log
  agentDebugLog("run1", "H1", "public/js/app.js:executeRoute", "execute-route-start", {
    forceFlush,
    sigPre,
    lastRouteFlushSig,
    hash: location.hash || "#/",
  });
  // #endregion
}

function logExecuteRouteSkipped(forceFlush, sigPre) {
  // #region agent log
  agentDebugLog("run1", "H1", "public/js/app.js:executeRoute", "execute-route-skipped", {
    forceFlush,
    sigPre,
    lastRouteFlushSig,
  });
  // #endregion
}

function logParsedRoute(page, id) {
  // #region agent log
  agentDebugLog("run2", "H5", "public/js/app.js:executeRoute", "parsed-route", {
    page,
    id: id ?? null,
    pathname: window.location.pathname,
    hash: window.location.hash || "#/",
    href: window.location.href,
  });
  // #endregion
}

function logPostDispatchDom() {
  // #region agent log
  const root = document.querySelector("#app-main .page-transition-root");
  agentDebugLog("run2", "H6", "public/js/app.js:executeRoute", "post-dispatch-dom", {
    hasRoot: Boolean(root),
    rootClass: root?.className || "",
    bodyClass: document.body.className,
    title: document.title,
  });
  // #endregion
}

/* ── One coalesced flush per task (hashchange + nav + auth) ── */
let routeFlushQueued = false;
let routeDirty = false;
let routeFlushRunning = false;

function scheduleRoute() {
  routeDirty = true;
  // #region agent log
  agentDebugLog("run1", "H1", "public/js/app.js:scheduleRoute", "schedule-route", {
    routeFlushQueued,
    hash: location.hash || "#/",
  });
  // #endregion
  if (routeFlushQueued || routeFlushRunning) return;
  routeFlushQueued = true;
  queueMicrotask(async () => {
    routeFlushQueued = false;
    if (routeFlushRunning) return;
    routeFlushRunning = true;
    try {
      while (routeDirty) {
        routeDirty = false;
        const forceFlush = takePendingRouteForce();
        await executeRoute(forceFlush);
      }
    } finally {
      routeFlushRunning = false;
    }
  });
}

wireAppRoute(scheduleRoute);

/* ── Bootstrap ── */

async function bootMainApp() {
  const { renderShell } = await getShellModule();
  const [
    { syncUiThemeFromStorage },
    { installDockVisualViewportSync },
    { installDockHashNavigation },
    { startAuthAndRoutes },
  ] = await Promise.all([
    import(UI_THEME_PATH),
    import(DOCK_VIEWPORT_PATH),
    import(DOCK_NAVIGATION_PATH),
    import(AUTH_BOOTSTRAP_PATH),
  ]);
  renderShell('<p class="loading">Connecting…</p>', "home", { stripChrome: true });
  bindSystemThemeListener();
  syncUiThemeFromStorage();
  installDockHashNavigation();
  installDockVisualViewportSync();

  startAuthAndRoutes({ scheduleRoute });
}

bootMainApp();

window.addEventListener("hashchange", () => {
  const h = location.hash || "#/";
  if (h === lastResolvedHash) {
    return;
  }
  requestRoute();
});
