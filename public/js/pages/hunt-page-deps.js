/**
 * Shared hunt-page dependency loader.
 *
 * Home, challenge detail, and saved hunts all need the same service cluster.
 * Loading it here keeps page modules from each owning identical cross-module
 * import sets while preserving route-level lazy loading.
 */
const FIREBASE_PATH = "../firebase-init.js";
const PRELOAD_GATE_PATH = "../lib/preload-gate.js";
const ATTEMPTS_PATH = "../services/attempts.js";
const CHALLENGES_PATH = "../services/challenges.js";
const AUTH_SERVICE_PATH = "../services/auth.js";
const FAVORITES_PATH = "../services/favorites.js";
const REPORTS_PATH = "../services/reports.js";
const TOAST_PATH = "../lib/app-toast.js";
const START_MAP_PATH = "./challenge-start-map.js";

let huntFeedDepsPromise;
let challengeDetailDepsPromise;

export function loadHuntFeedDeps() {
  if (!huntFeedDepsPromise) {
    huntFeedDepsPromise = Promise.all([
      import(FIREBASE_PATH),
      import(PRELOAD_GATE_PATH),
      import(ATTEMPTS_PATH),
      import(CHALLENGES_PATH),
      import(AUTH_SERVICE_PATH),
      import(FAVORITES_PATH),
      import(REPORTS_PATH),
      import(TOAST_PATH),
    ]).then(([firebase, preload, attempts, challenges, authService, favorites, reports, toast]) => ({
      auth: firebase.auth,
      gateRoutePreload: preload.gateRoutePreload,
      userHasWonChallenge: attempts.userHasWonChallenge,
      watchChallenges: challenges.watchChallenges,
      getChallenge: challenges.getChallenge,
      promptGuestNeedsSignIn: authService.promptGuestNeedsSignIn,
      watchFavoritedHuntIds: favorites.watchFavoritedHuntIds,
      setHuntFavorited: favorites.setHuntFavorited,
      promptReportChallenge: reports.promptReportChallenge,
      showAppToast: toast.showAppToast,
    }));
  }
  return huntFeedDepsPromise;
}

export function loadChallengeDetailDeps() {
  if (!challengeDetailDepsPromise) {
    challengeDetailDepsPromise = Promise.all([
      import(FIREBASE_PATH),
      import(ATTEMPTS_PATH),
      import(CHALLENGES_PATH),
      import(FAVORITES_PATH),
      import(TOAST_PATH),
      import(REPORTS_PATH),
      import(AUTH_SERVICE_PATH),
      import(START_MAP_PATH),
    ]).then(([firebase, attempts, challenges, favorites, toast, reports, authService, startMap]) => ({
      auth: firebase.auth,
      startHuntWithGeoCheck: attempts.startHuntWithGeoCheck,
      userHasWonChallenge: attempts.userHasWonChallenge,
      getChallenge: challenges.getChallenge,
      huntStartAnchorCoords: challenges.huntStartAnchorCoords,
      isHuntFavorited: favorites.isHuntFavorited,
      setHuntFavorited: favorites.setHuntFavorited,
      showAppToast: toast.showAppToast,
      promptReportChallenge: reports.promptReportChallenge,
      promptGuestNeedsSignIn: authService.promptGuestNeedsSignIn,
      destroyChallengeMap: startMap.destroyChallengeMap,
      mountChallengeStartMap: startMap.mountChallengeStartMap,
    }));
  }
  return challengeDetailDepsPromise;
}
