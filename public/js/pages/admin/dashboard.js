import { db } from "./admin-utils.js";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { mountFrame } from "./frame.js";
import {
  paintAttempts,
  paintChallenges,
  paintReports,
  paintUsers,
  setTableMessage,
  snapshotRows,
} from "./dashboard-tables.js";
import {
  bindAdminLogout,
  bindAttemptActions,
  bindChallengeActions,
  bindSocialControls,
  bindSocialModerationActions,
  bindUserActions,
} from "./dashboard-actions.js";
import { collectDashboardElements, dashboardContentHtml } from "./dashboard-content.js";

const DASHBOARD_TITLE =
  'Operations<br /><span class="admin-hero-title-accent">&amp; moderation.</span>';

const DASHBOARD_STATE = {
  users: [],
  challenges: [],
  attempts: [],
  reports: [],
};

export function renderDashboard(addUnsub) {
  mountFrame("Dashboard", DASHBOARD_TITLE, dashboardContentHtml());
  const elements = collectDashboardElements();

  bindAdminLogout();
  bindSocialControls(elements);
  bindSocialModerationActions(elements);
  bindUserActions(elements);
  bindChallengeActions(elements);
  bindAttemptActions(elements);
  subscribeDashboardData(addUnsub, elements, DASHBOARD_STATE);
}
function subscribeDashboardData(addUnsub, elements, state) {
  subscribeReports(addUnsub, elements, state);
  subscribeUsers(addUnsub, elements, state);
  subscribeChallenges(addUnsub, elements, state);
  subscribeAttempts(addUnsub, elements, state);
}

function subscribeReports(addUnsub, elements, state) {
  addUnsub(
    onSnapshot(
      query(collection(db, "challengeReports"), orderBy("createdAt", "desc"), limit(100)),
      (snap) => {
        state.reports = snapshotRows(snap);
        paintReports(elements, state);
      },
      () => {
        setTableMessage(
          elements.tbReports,
          5,
          "Could not load hunt reports (check Firestore index on challengeReports.createdAt).",
        );
      },
    ),
  );
}

function subscribeUsers(addUnsub, elements, state) {
  addUnsub(
    onSnapshot(
      collection(db, "users"),
      (snap) => {
        state.users = snapshotRows(snap);
        paintUsers(elements, state);
      },
      () => {
        setTableMessage(elements.tbUsers, 7, "Could not load users (check rules / network).");
      },
    ),
  );
}

function subscribeChallenges(addUnsub, elements, state) {
  addUnsub(
    onSnapshot(
      query(collection(db, "challenges"), orderBy("createdAt", "desc"), limit(80)),
      (snap) => {
        state.challenges = snapshotRows(snap);
        paintChallenges(elements, state);
      },
      () => {
        setTableMessage(
          elements.tbChallenges,
          7,
          "Could not load challenges. If this is new, create a Firestore index for createdAt on challenges.",
        );
      },
    ),
  );
}

function subscribeAttempts(addUnsub, elements, state) {
  addUnsub(
    onSnapshot(
      query(collection(db, "attempts"), orderBy("startedAt", "desc"), limit(150)),
      (snap) => {
        state.attempts = snapshotRows(snap);
        paintAttempts(elements, state);
      },
      () => {
        setTableMessage(
          elements.tbAttempts,
          7,
          "Could not load attempts. Add a single-field index on startedAt for attempts if prompted.",
        );
      },
    ),
  );
}
