/**
 * Leaderboard — users with merit points &gt; 0, highest first.
 * Visual structure matches _design-v2 ClassicalLeaderboard / NeoLeaderboard.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

import { escapeHtml } from "./page-html.js";
import { renderAppShell } from "./page-shell.js";
const PRELOAD_GATE_PATH = "../lib/preload-gate.js";
const FIREBASE_PATH = "../firebase-init.js";
const USERS_PATH = "../services/users.js";
const I18N_PATH = "../lib/i18n.js";

let gateRoutePreload;
let auth;
let db;
let avatarSrcForId;
let t;
let leaderboardDepsPromise;

async function loadLeaderboardDeps() {
  if (!leaderboardDepsPromise) {
    leaderboardDepsPromise = Promise.all([
      import(PRELOAD_GATE_PATH),
      import(FIREBASE_PATH),
      import(USERS_PATH),
      import(I18N_PATH),
    ]).then(([preload, firebase, users, i18n]) => {
      gateRoutePreload = preload.gateRoutePreload;
      auth = firebase.auth;
      db = firebase.db;
      avatarSrcForId = users.avatarSrcForId;
      t = i18n.t;
    });
  }
  return leaderboardDepsPromise;
}

const PAGE_LIMIT = 80;

/* Bumped on each render() + cleanup(). The in-flight data load carries
   the token it started with and bails out if it doesn't match anymore
   — so a fast dock switch (Rank → Profile) never waits on the
   leaderboard's Firestore round-trip and never writes into the
   detached/replaced #lb-body. */
let activeToken = 0;

function avatarMarkup(url, size) {
  const s = String(size);
  if (!url) {
    return '<span class="lb-avatar lb-avatar--empty" aria-hidden="true"></span>';
  }
  return `<img class="lb-avatar" src="${escapeHtml(url)}" alt="" width="${s}" height="${s}" decoding="async" />`;
}

function podiumSlotHtml(player, slotIndex) {
  /* slotIndex: 0 = left (rank 2), 1 = center (rank 1), 2 = right (rank 3). */
  const isFirst = player.rank === 1;
  return `
    <div class="lb-podium-slot${isFirst ? " lb-podium-slot--top" : ""}" data-slot="${slotIndex}">
      <div class="lb-podium-rank">#${player.rank}</div>
      <div class="lb-podium-body">
        <div class="lb-podium-avatar">
          ${avatarMarkup(player.avatarUrl, 40)}
        </div>
        <p class="lb-podium-name">@${escapeHtml(player.name)}</p>
        <p class="lb-podium-merit">${player.merit.toLocaleString()}</p>
      </div>
    </div>
  `;
}

function leaderboardRowFromDoc(d, i) {
  const data = d.data();
  const merit = Number(data.meritPoints ?? 0);
  const name =
    String(data.displayName || "").trim() ||
    String(data.usernameNorm || "").trim() ||
    "Player";
  const avatarUrl = avatarSrcForId(data.avatarId);
  return {
    avatarUrl,
    id: d.id,
    merit,
    name,
    rank: i + 1,
  };
}

function currentPlayerSummary(currentUid, rows, currentUserSnap) {
  const currentRank = currentUid ? rows.find((row) => row.id === currentUid) : null;
  const currentData =
    currentUserSnap && currentUserSnap.exists() ? currentUserSnap.data() : null;
  return {
    avatarUrl: avatarSrcForId(currentData?.avatarId),
    merit: Number(currentData?.meritPoints ?? 0),
    name:
      String(currentData?.displayName || "").trim() ||
      String(currentData?.usernameNorm || "").trim() ||
      (currentUid ? "you" : "Guest"),
    rank: currentRank,
  };
}

function podiumBlockHtml(rows) {
  if (!rows.length) {
    return '<p class="lb-empty">No players with merits yet. Finish a hunt in time to earn Merits and appear here.</p>';
  }
  const podiumOrder = [rows[1], rows[0], rows[2]].filter(Boolean);
  return `<div class="lb-podium">
    ${podiumOrder.map((p, i) => podiumSlotHtml(p, i)).join("")}
  </div>`;
}

function restListHtml(rows, currentUid) {
  const restRows = rows.slice(3);
  if (!restRows.length) return "";
  return `<ul class="lb-list" role="list">
    ${restRows
      .map(
        (player) => `
      <li class="lb-row${currentUid && player.id === currentUid ? " is-you" : ""}">
        <span class="lb-row-rank" aria-label="Rank ${player.rank}">#${player.rank}</span>
        ${avatarMarkup(player.avatarUrl, 40)}
        <span class="lb-row-name">@${escapeHtml(player.name)}</span>
        <span class="lb-row-merit">${player.merit.toLocaleString()}</span>
      </li>`,
      )
      .join("")}
  </ul>`;
}

function youCardHtml(currentUid, current) {
  if (!currentUid) return "";
  return `<section class="lb-you-card${current.rank ? " is-ranked" : ""}" aria-label="Your rank">
    ${avatarMarkup(current.avatarUrl, 36)}
    <div class="lb-you-meta">
      <p class="lb-you-kicker">Your rank</p>
      <p class="lb-you-line">${
        current.rank
          ? `#${current.rank.rank} globally · ${current.rank.merit.toLocaleString()} merits`
          : `${current.merit.toLocaleString()} merits · not ranked yet`
      }</p>
    </div>
    <div class="lb-you-number">${current.rank ? `#${current.rank.rank}` : "—"}</div>
  </section>`;
}

function tailYouHtml(currentUid, current) {
  if (!currentUid || current.rank) return "";
  return `<ul class="lb-list lb-list--tail" role="list">
    <li class="lb-row is-you">
      <span class="lb-row-rank">—</span>
      ${avatarMarkup(current.avatarUrl, 40)}
      <span class="lb-row-name">@${escapeHtml(current.name)}</span>
      <span class="lb-row-merit">${current.merit.toLocaleString()}</span>
    </li>
  </ul>`;
}

function leaderboardBodyHtml(rows, currentUid, current) {
  const restList = restListHtml(rows, currentUid);
  return `
    ${youCardHtml(currentUid, current)}

    <section class="lb-podium-wrap" aria-label="Top players">
      ${podiumBlockHtml(rows)}
    </section>

    ${
      restList
        ? `<section class="lb-list-wrap" aria-label="All rankings">
            ${restList}
          </section>`
        : ""
    }
    ${tailYouHtml(currentUid, current)}
  `;
}

export async function render() {
  await loadLeaderboardDeps();
  /* Render shell ONCE, SYNCHRONOUSLY. The Firestore round-trip used to
     be awaited here, which blocked the router: a fast dock switch
     (Rank → Profile) had to wait for the leaderboard query to resolve
     before the next route could render — looked like a freeze.
     Now the shell paints immediately, the fetch is kicked off in the
     background, and the token guard below prevents writes into a
     detached #lb-body if the user has navigated away. */
  await renderAppShell(
    `
    <div class="leaderboard-page">
      <section class="lb-hero" aria-labelledby="leaderboard-heading">
        <p class="lb-hero-kicker">Weekly · ${escapeHtml(t("shell.nav.rank"))}</p>
        <h1 class="lb-hero-title" id="leaderboard-heading">
          Rank<br/><span class="lb-hero-accent">Hunters.</span>
        </h1>

        <div class="lb-tab-row" role="tablist" aria-label="Range">
          <button type="button" class="lb-tab is-active" role="tab" aria-selected="true">Weekly</button>
          <button type="button" class="lb-tab" role="tab" aria-selected="false">Monthly</button>
          <button type="button" class="lb-tab" role="tab" aria-selected="false">All-time</button>
        </div>
      </section>

      <div id="lb-body" role="region" aria-busy="true"></div>
    </div>
    `,
    "leaderboard",
    { hideHeader: true },
  );

  const bodyEl = document.getElementById("lb-body");
  if (!bodyEl) return;

  activeToken += 1;
  const myToken = activeToken;
  loadLeaderboard(bodyEl, myToken);
}

async function loadLeaderboard(bodyEl, myToken) {
  try {
    const data = await fetchLeaderboardData();
    if (isStaleLeaderboardLoad(bodyEl, myToken)) return;
    paintLeaderboardBody(bodyEl, data);
  } catch (err) {
    if (isStaleLeaderboardLoad(bodyEl, myToken)) return;
    paintLeaderboardError(bodyEl, err);
  }
}

async function fetchLeaderboardData() {
  const currentUid = auth.currentUser?.uid || "";
  const q = query(
    collection(db, "users"),
    where("meritPoints", ">", 0),
    orderBy("meritPoints", "desc"),
    limit(PAGE_LIMIT),
  );
  const [snap, currentUserSnap] = await Promise.all([
    getDocs(q),
    currentUid ? getDoc(doc(db, "users", currentUid)) : Promise.resolve(null),
  ]);
  const rows = snap.docs.map(leaderboardRowFromDoc);
  return {
    current: currentPlayerSummary(currentUid, rows, currentUserSnap),
    currentUid,
    rows,
  };
}

function isStaleLeaderboardLoad(bodyEl, myToken) {
  return myToken !== activeToken || !bodyEl.isConnected;
}

function paintLeaderboardBody(bodyEl, { rows, currentUid, current }) {
  bodyEl.removeAttribute("aria-busy");
  bodyEl.innerHTML = leaderboardBodyHtml(rows, currentUid, current);
  // Hold the leaderboard hidden until avatars + Barlow Condensed have
  // settled, so the user never sees a system-font flash or hazy avatar
  // pop-in on first entry.
  gateRoutePreload(bodyEl);
}

function paintLeaderboardError(bodyEl, err) {
  bodyEl.removeAttribute("aria-busy");
  bodyEl.innerHTML = `<div class="status-banner error">${escapeHtml(err.message || "Could not load leaderboard.")}</div><p><a href="#/" class="lb-back-link">&larr; Open hunts</a></p>`;
}

export function cleanup() {
  /* Invalidate any in-flight loadLeaderboard. The promise still
     resolves, but its DOM writes become no-ops. */
  activeToken += 1;
}
