/**
 * Hash route → page render. Single place to register or adjust routes.
 * Pair with `lib/router.js` (`parseRoute` / `nav`).
 */

import { auth } from "../firebase-init.js";
import { renderShell } from "../components/shell.js";
import { saveAuthReturn, isGuestSession } from "./state.js";
import { nav } from "./router.js";
import {
  afterAuthSuccess,
  isGuestBrowsing,
  promptGuestNeedsSignIn,
} from "../services/auth.js";

import * as homePage from "../pages/home.js";
import * as loginPage from "../pages/login.js";
import * as profilePage from "../pages/profile.js";
import * as createPage from "../pages/create.js";
import * as createPickerPage from "../pages/create-picker.js";
import * as createMapPage from "../pages/create-map.js";
import * as challengePage from "../pages/challenge.js";
import * as huntReviewPage from "../pages/hunt-review.js";
import * as runPage from "../pages/run.js";
import * as mapPage from "../pages/map.js";
import * as adminPage from "../pages/admin.js";
import * as favoritedPage from "../pages/favorited.js";
import * as leaderboardPage from "../pages/leaderboard.js";

/**
 * @param {object} args
 * @param {string} args.page
 * @param {string|null} args.id
 * @param {(m: { cleanup?: () => void }) => void} args.activate — wires `currentCleanup` from app entry
 */
export async function dispatchHashRoute({ page, id, activate }) {
  const allowWithoutFirebase =
    page === "login" || page === "admin" || page === "profile";
  const guestBrowseOk = isGuestSession();
  if (!auth.currentUser && !allowWithoutFirebase && !guestBrowseOk) {
    saveAuthReturn(location.hash || "#/");
    if (location.hash !== "#/login") {
      location.hash = "#/login";
    }
    activate(loginPage);
    await loginPage.render();
    return;
  }

  switch (page) {
    case "home":
    case "":
    case "overview":
    case "list":
      activate(homePage);
      await homePage.render();
      break;

    case "map":
      activate(mapPage);
      await mapPage.render();
      break;

    case "login":
      if (auth.currentUser) {
        setTimeout(() => afterAuthSuccess(), 0);
        return;
      }
      activate(loginPage);
      await loginPage.render();
      break;

    case "create-map":
      if (isGuestBrowsing()) {
        await promptGuestNeedsSignIn();
        nav("#/");
        return;
      }
      activate(createMapPage);
      await createMapPage.render();
      break;

    case "create":
      if (isGuestBrowsing()) {
        await promptGuestNeedsSignIn();
        nav("#/");
        return;
      }
      if (id === "classic") {
        activate(createMapPage);
        await createMapPage.render();
      } else {
        activate(createPickerPage);
        await createPickerPage.render();
      }
      break;

    case "create-list":
      if (isGuestBrowsing()) {
        await promptGuestNeedsSignIn();
        nav("#/");
        return;
      }
      activate(createPage);
      await createPage.render();
      break;

    case "profile":
      activate(profilePage);
      await profilePage.render();
      break;

    case "favorited":
      if (isGuestBrowsing()) {
        await promptGuestNeedsSignIn("Saving favorites needs a Google account.");
        nav("#/");
        return;
      }
      if (!auth.currentUser) {
        saveAuthReturn(location.hash || "#/favorited");
        if (location.hash !== "#/login") {
          location.hash = "#/login";
        }
        activate(loginPage);
        await loginPage.render();
        return;
      }
      activate(favoritedPage);
      await favoritedPage.render();
      break;

    case "leaderboard":
      activate(leaderboardPage);
      await leaderboardPage.render();
      break;

    case "admin":
      activate(adminPage);
      await adminPage.render();
      break;

    case "challenge":
      if (!id) {
        renderShell(
          `<div class="page-narrow"><div class="status-banner error">Missing hunt id.</div><p><a href="#/" class="back-link">← All hunts</a></p></div>`,
        );
        break;
      }
      activate(challengePage);
      await challengePage.render(id);
      break;

    case "hunt-review":
      if (!id) {
        renderShell(
          `<div class="page-narrow"><div class="status-banner error">Missing hunt id.</div><p><a href="#/" class="back-link">← All hunts</a></p></div>`,
          "hunts",
        );
        break;
      }
      if (isGuestBrowsing()) {
        await promptGuestNeedsSignIn(
          "Photo review and shared comments need a Google account.",
        );
        nav("#/");
        return;
      }
      activate(huntReviewPage);
      await huntReviewPage.render(id);
      break;

    case "run":
      if (!id) {
        renderShell(
          `<div class="page-narrow"><div class="status-banner error">Missing run id.</div><p><a href="#/" class="back-link">← Home</a></p></div>`,
        );
        break;
      }
      if (isGuestBrowsing()) {
        await promptGuestNeedsSignIn("Runs and checkpoint uploads need a Google account.");
        nav("#/");
        return;
      }
      activate(runPage);
      await runPage.render(id);
      break;

    default:
      renderShell(
        `<div class="page-narrow"><div class="status-banner error">Unknown page.</div><p><a href="#/" class="back-link">← Home</a></p></div>`,
      );
  }
}
