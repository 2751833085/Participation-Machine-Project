/**
 * Hash route → page render. Single place to register or adjust routes.
 * Pair with `lib/router.js` (`parseRoute` / `nav`).
 */

import { requestRoute } from "./route-events.js";

const PAGE_PATHS = {
  home: "../pages/home.js",
  login: "../pages/login.js",
  profile: "../pages/profile.js",
  create: "../pages/create.js",
  createPicker: "../pages/create-picker.js",
  createMap: "../pages/create-map.js",
  challenge: "../pages/challenge.js",
  huntReview: "../pages/hunt-review.js",
  run: "../pages/run.js",
  map: "../pages/map.js",
  admin: "../pages/admin.js",
  favorited: "../pages/favorited.js",
  leaderboard: "../pages/leaderboard.js",
};

const pageModules = new Map();
const SHELL_PATH = "../components/shell.js";
const AUTH_SERVICE_PATH = "../services/auth.js";
const FIREBASE_PATH = "./firebase.js";
const STATE_PATH = "./state.js";
let shellModule;
let authServiceModule;
let routeGuardDeps;

function routeTo(hash) {
  location.hash = hash.startsWith("#") ? hash : `#${hash}`;
  requestRoute();
}

async function getAuthService() {
  if (!authServiceModule) authServiceModule = import(AUTH_SERVICE_PATH);
  return authServiceModule;
}

async function getRouteGuardDeps() {
  if (!routeGuardDeps) {
    routeGuardDeps = Promise.all([
      import(FIREBASE_PATH),
      import(STATE_PATH),
    ]);
  }
  const [firebase, state] = await routeGuardDeps;
  return {
    auth: firebase.auth,
    isGuestSession: state.isGuestSession,
    saveAuthReturn: state.saveAuthReturn,
  };
}

async function loadPage(key) {
  if (!pageModules.has(key)) {
    const path = PAGE_PATHS[key];
    if (!path) throw new Error(`Unknown page module: ${key}`);
    pageModules.set(key, import(path));
  }
  return pageModules.get(key);
}

async function renderErrorShell(html, activeKey) {
  if (!shellModule) shellModule = import(SHELL_PATH);
  const { renderShell } = await shellModule;
  renderShell(html, activeKey);
}

async function renderPageRoute(ctx, moduleKey, ...args) {
  const pageModule = await loadPage(moduleKey);
  ctx.activate(pageModule);
  await pageModule.render(...args);
}

async function handleHomeRoute(ctx) {
  await renderPageRoute(ctx, "home");
}

async function handleLoginRoute(ctx) {
  if (ctx.auth.currentUser) {
    setTimeout(() => ctx.afterAuthSuccess(), 0);
    return;
  }
  await renderPageRoute(ctx, "login");
}

async function requireSignedInRoute(ctx, message) {
  if (!ctx.isGuestBrowsing()) return true;
  await ctx.promptGuestNeedsSignIn(message);
  routeTo("#/");
  return false;
}

async function handleCreateMapRoute(ctx) {
  if (!(await requireSignedInRoute(ctx))) return;
  await renderPageRoute(ctx, "createMap");
}

async function handleCreateRoute(ctx) {
  if (!(await requireSignedInRoute(ctx))) return;
  await renderPageRoute(ctx, ctx.id === "classic" ? "createMap" : "createPicker");
}

async function handleCreateListRoute(ctx) {
  if (!(await requireSignedInRoute(ctx))) return;
  await renderPageRoute(ctx, "create");
}

async function handleFavoritedRoute(ctx) {
  if (ctx.isGuestBrowsing()) {
    await ctx.promptGuestNeedsSignIn("Saving favorites needs a Google account.");
    routeTo("#/");
    return;
  }
  if (!ctx.auth.currentUser) {
    ctx.saveAuthReturn(location.hash || "#/favorited");
    if (location.hash !== "#/login") {
      location.hash = "#/login";
    }
    await renderPageRoute(ctx, "login");
    return;
  }
  await renderPageRoute(ctx, "favorited");
}

async function handleChallengeRoute(ctx) {
  if (!ctx.id) {
    await renderErrorShell(
      `<div class="page-narrow"><div class="status-banner error">Missing hunt id.</div><p><a href="#/" class="back-link">← All hunts</a></p></div>`,
    );
    return;
  }
  await renderPageRoute(ctx, "challenge", ctx.id);
}

async function handleHuntReviewRoute(ctx) {
  if (!ctx.id) {
    await renderErrorShell(
      `<div class="page-narrow"><div class="status-banner error">Missing hunt id.</div><p><a href="#/" class="back-link">← All hunts</a></p></div>`,
      "hunts",
    );
    return;
  }
  if (!(await requireSignedInRoute(ctx, "Photo review and shared comments need a Google account."))) return;
  await renderPageRoute(ctx, "huntReview", ctx.id);
}

async function handleRunRoute(ctx) {
  if (!ctx.id) {
    await renderErrorShell(
      `<div class="page-narrow"><div class="status-banner error">Missing run id.</div><p><a href="#/" class="back-link">← Home</a></p></div>`,
    );
    return;
  }
  if (!(await requireSignedInRoute(ctx, "Runs and checkpoint uploads need a Google account."))) return;
  await renderPageRoute(ctx, "run", ctx.id);
}

async function handleUnknownRoute() {
  await renderErrorShell(
    `<div class="page-narrow"><div class="status-banner error">Unknown page.</div><p><a href="#/" class="back-link">← Home</a></p></div>`,
  );
}

const ROUTE_HANDLERS = {
  "": handleHomeRoute,
  admin: (ctx) => renderPageRoute(ctx, "admin"),
  challenge: handleChallengeRoute,
  create: handleCreateRoute,
  "create-list": handleCreateListRoute,
  "create-map": handleCreateMapRoute,
  favorited: handleFavoritedRoute,
  home: handleHomeRoute,
  "hunt-review": handleHuntReviewRoute,
  leaderboard: (ctx) => renderPageRoute(ctx, "leaderboard"),
  list: handleHomeRoute,
  login: handleLoginRoute,
  map: (ctx) => renderPageRoute(ctx, "map"),
  overview: handleHomeRoute,
  profile: (ctx) => renderPageRoute(ctx, "profile"),
  run: handleRunRoute,
};

/**
 * @param {object} args
 * @param {string} args.page
 * @param {string|null} args.id
 * @param {(m: { cleanup?: () => void }) => void} args.activate — wires `currentCleanup` from app entry
 */
export async function dispatchHashRoute({ page, id, activate }) {
  const { auth, isGuestSession, saveAuthReturn } = await getRouteGuardDeps();
  const authService = await getAuthService();
  if (await redirectMissingSessionRoute({ page, auth, isGuestSession, saveAuthReturn, activate })) return;

  const handler = ROUTE_HANDLERS[page] || handleUnknownRoute;
  await handler({
    activate,
    afterAuthSuccess: authService.afterAuthSuccess,
    auth,
    id,
    isGuestBrowsing: authService.isGuestBrowsing,
    promptGuestNeedsSignIn: authService.promptGuestNeedsSignIn,
    saveAuthReturn,
  });
}

async function redirectMissingSessionRoute({ page, auth, isGuestSession, saveAuthReturn, activate }) {
  if (auth.currentUser || allowRouteWithoutFirebase(page) || isGuestSession()) return false;
  saveAuthReturn(location.hash || "#/");
  if (location.hash !== "#/login") {
    location.hash = "#/login";
  }
  const loginPage = await loadPage("login");
  activate(loginPage);
  await loginPage.render();
  return true;
}

function allowRouteWithoutFirebase(page) {
  return page === "login" || page === "admin" || page === "profile";
}
