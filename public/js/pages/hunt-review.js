/**
 * Review checkpoint photos for a hunt — your completions first, then others (gated).
 *
 * Rewritten in the Neo Claude Design idiom. Modeled after NeoRun (kicker +
 * Barlow Condensed title + trail chips + photo camera block) and NeoProfile
 * (color-block stat trio: peach / mustard / mint / lavender). Chunky radii
 * and flat offset shadows; tokens drive the color so dark mode swaps.
 * JavaScript behavior (Firebase watchers, run-start flow, photo card mounts)
 * is preserved — only the template + class names changed.
 */


import { escapeHtml } from "./page-html.js";
import { renderAppShell } from "./page-shell.js";
const FIREBASE_PATH = "../firebase-init.js";
const RUN_SOCIAL_UI_PATH = "../components/run-social-ui.js";
const STATE_PATH = "../lib/state.js";
const ATTEMPTS_PATH = "../services/attempts.js";
const CHALLENGES_PATH = "../services/challenges.js";
const RUN_SOCIAL_PATH = "../services/run-social.js";
const LOGIN_PAGE_PATH = "./login.js";

let auth;
let buildPhotoCardHtml;
let mountPhotoCard;
let saveAuthReturn;
let startHuntWithGeoCheck;
let userHasWonChallenge;
let getChallenge;
let aggregateVoteCounts;
let myPhotoReaction;
let watchRunPhotos;
let loginPage;
let huntReviewDepsPromise;

async function loadHuntReviewDeps() {
  if (!huntReviewDepsPromise) {
    huntReviewDepsPromise = Promise.all([
      import(FIREBASE_PATH),
      import(RUN_SOCIAL_UI_PATH),
      import(STATE_PATH),
      import(ATTEMPTS_PATH),
      import(CHALLENGES_PATH),
      import(RUN_SOCIAL_PATH),
      import(LOGIN_PAGE_PATH),
    ]).then(([firebase, runSocialUi, state, attempts, challenges, runSocial, login]) => {
      auth = firebase.auth;
      buildPhotoCardHtml = runSocialUi.buildPhotoCardHtml;
      mountPhotoCard = runSocialUi.mountPhotoCard;
      saveAuthReturn = state.saveAuthReturn;
      startHuntWithGeoCheck = attempts.startHuntWithGeoCheck;
      userHasWonChallenge = attempts.userHasWonChallenge;
      getChallenge = challenges.getChallenge;
      aggregateVoteCounts = runSocial.aggregateVoteCounts;
      myPhotoReaction = runSocial.myPhotoReaction;
      watchRunPhotos = runSocial.watchRunPhotos;
      loginPage = login;
    });
  }
  return huntReviewDepsPromise;
}

let photosUnsub = null;
const photoCardCleanups = [];
let huntReviewRunBtn = null;
let huntReviewRunHandler = null;
let huntReviewChallengeForRun = null;

function teardownPhotoCards() {
  while (photoCardCleanups.length) {
    const fn = photoCardCleanups.pop();
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

function stopPhotosWatch() {
  if (photosUnsub) {
    photosUnsub();
    photosUnsub = null;
  }
}

function unwireHuntReviewRun() {
  if (huntReviewRunBtn && huntReviewRunHandler) {
    huntReviewRunBtn.removeEventListener("click", huntReviewRunHandler);
  }
  huntReviewRunBtn = null;
  huntReviewRunHandler = null;
  huntReviewChallengeForRun = null;
}

function photoMillis(p) {
  return p.createdAt?.toMillis?.() ?? 0;
}

function formatRunHeading(photos) {
  const ts = photos.reduce((m, p) => Math.max(m, photoMillis(p)), 0);
  if (!ts) return "Your run";
  const d = new Date(ts);
  return `Completion — ${d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
}

function groupPhotosByAttempt(photos) {
  const m = new Map();
  for (const p of photos) {
    const key = p.attemptId || "unknown";
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(p);
  }
  return m;
}

function groupPhotosByUser(photos) {
  const m = new Map();
  for (const p of photos) {
    const key = p.userId || "unknown";
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(p);
  }
  return m;
}

function sortWithinGroup(photos) {
  return [...photos].sort(
    (a, b) => (a.spotIndex ?? 0) - (b.spotIndex ?? 0),
  );
}

function sortGroupsDesc(groupsMap) {
  return [...groupsMap.entries()].sort(([, pa], [, pb]) => {
    const ma = pa.reduce((m, p) => Math.max(m, photoMillis(p)), 0);
    const mb = pb.reduce((m, p) => Math.max(m, photoMillis(p)), 0);
    return mb - ma;
  });
}

function sortOthersFeed(photos) {
  return [...photos].sort((a, b) => photoMillis(b) - photoMillis(a));
}

/** Listing checkpoint images from the challenge document (not run uploads). */
function buildOfficialListingHtml(challenge) {
  const spots = Array.isArray(challenge?.spots) ? challenge.spots : [];
  if (!spots.length) {
    return `
      <section class="hr-block" aria-labelledby="hr-official-h">
        <p class="hr-kicker">Listing</p>
        <h2 id="hr-official-h" class="hr-section-title">Hunt listing photos</h2>
        <p class="hr-empty">No listing photos on this hunt.</p>
      </section>`;
  }
  const tints = ["peach", "mustard", "mint", "lav"];
  const spotsHtml = spots
    .map(
      (s, i) => `
      <figure class="hr-listing-item" data-neo-card="${tints[i % tints.length]}">
        <div class="hr-listing-thumb">
          <img src="${escapeHtml(s.imageUrl)}" alt="Listing checkpoint ${i + 1}" loading="lazy" />
        </div>
        <figcaption class="hr-listing-caption">
          <span class="hr-listing-index">CP ${String(i + 1).padStart(2, "0")}</span>
          ${s.hint ? `<span class="hr-listing-hint">${escapeHtml(s.hint)}</span>` : ""}
        </figcaption>
      </figure>`,
    )
    .join("");
  return `
      <section class="hr-block hr-block--listing" aria-labelledby="hr-official-h">
        <p class="hr-kicker">Listing</p>
        <h2 id="hr-official-h" class="hr-section-title">Hunt listing photos.</h2>
        <p class="hr-lead">Official images from this hunt's page — the checkpoints players try to complete.</p>
        <div class="hr-listing-grid">${spotsHtml}</div>
      </section>`;
}

function renderPhotoCardsInto(host, photos, uid) {
  host.innerHTML = "";
  photos.forEach((p) => {
    const counts = aggregateVoteCounts({});
    const mine = myPhotoReaction(uid, {});
    const wrap = document.createElement("div");
    wrap.innerHTML = buildPhotoCardHtml(p, counts, uid, mine).trim();
    const card = wrap.firstElementChild;
    host.appendChild(card);
    photoCardCleanups.push(mountPhotoCard(card, p, uid));
  });
}

function paintReview(photos, uid, backHref) {
  const mine = photos.filter((p) => p.userId === uid);
  const others = photos.filter((p) => p.userId !== uid);
  const canSeeOthers = mine.length > 0;
  const orderedGroups = sortGroupsDesc(groupPhotosByAttempt(mine));
  const orderedOtherGroups =
    canSeeOthers && others.length
      ? sortGroupsDesc(groupPhotosByUser(others))
      : [];
  const body = document.getElementById("hunt-review-body");
  const back = document.getElementById("hunt-review-back");
  if (back) back.setAttribute("href", backHref);

  if (!body) return;

  teardownPhotoCards();

  const parts = [];
  parts.push(renderReviewStats(mine.length, others.length, orderedGroups.length, canSeeOthers));
  parts.push(renderYourReviewRuns(orderedGroups));
  parts.push(renderOtherReviewRuns(orderedOtherGroups, canSeeOthers, others.length));
  body.innerHTML = parts.join("");
  mountReviewRunGroups(orderedGroups, uid);
  mountReviewOtherGroups(orderedOtherGroups, uid);
}

function renderReviewStats(totalMine, totalOthers, runsCount, canSeeOthers) {
  return `
    <section class="hr-stats" aria-label="Run summary">
      <div class="hr-stat" data-neo-card="mint">
        <div class="hr-stat-value">${totalMine}</div>
        <div class="hr-stat-label">Your photos</div>
      </div>
      <div class="hr-stat" data-neo-card="mustard">
        <div class="hr-stat-value">${runsCount}</div>
        <div class="hr-stat-label">Your runs</div>
      </div>
      <div class="hr-stat" data-neo-card="lav">
        <div class="hr-stat-value">${canSeeOthers ? totalOthers : "—"}</div>
        <div class="hr-stat-label">Others</div>
      </div>
    </section>`;
}

function renderYourReviewRuns(orderedGroups) {
  const parts = [
    `<section class="hr-block hr-block--yours" aria-labelledby="hr-yours-h">`,
    `<p class="hr-kicker">Your runs</p>`,
    `<h2 id="hr-yours-h" class="hr-section-title">Your submissions</h2>`,
  ];
  if (!orderedGroups.length) {
    parts.push(
      `<p class="hr-empty">You have not submitted any checkpoint photos for this hunt yet. Start a run and upload at least one checkpoint photo to unlock other players' photos here.</p>`,
    );
  } else {
    orderedGroups.forEach(([attemptId, groupPhotos], idx) => {
      parts.push(renderReviewRunArticle(attemptId, groupPhotos, idx));
    });
  }
  parts.push(`</section>`);
  return parts.join("");
}

function renderReviewRunArticle(attemptId, groupPhotos, idx) {
  const sorted = sortWithinGroup(groupPhotos);
  const title = formatRunHeading(sorted);
  return `
    <article class="hr-run" data-attempt="${escapeHtml(attemptId)}">
      <h3 class="hr-run-title">${escapeHtml(title)}</h3>
      <div class="run-photo-feed hr-run-feed" id="hunt-review-run-${idx}"></div>
    </article>`;
}

function renderOtherReviewRuns(orderedOtherGroups, canSeeOthers, othersLength) {
  const parts = [
    `<section class="hr-block hr-block--others" aria-labelledby="hr-others-h">`,
    `<p class="hr-kicker">Community</p>`,
    `<h2 id="hr-others-h" class="hr-section-title">Other players</h2>`,
  ];
  if (!canSeeOthers) {
    parts.push(
      `<p class="status-banner info hr-gate">Submit at least one checkpoint photo during a run to see other players' photos.</p>`,
    );
  } else if (!othersLength) {
    parts.push(
      `<p class="hr-empty">No other players have shared photos for this hunt yet.</p>`,
    );
  } else {
    orderedOtherGroups.forEach(([, playerPhotos], j) => {
      parts.push(renderOtherReviewRunArticle(playerPhotos, j));
    });
  }
  parts.push(`</section>`);
  return parts.join("");
}

function renderOtherReviewRunArticle(playerPhotos, index) {
  const label = String(playerPhotos[0]?.authorName || "Player").trim() || "Player";
  return `
    <article class="hr-other">
      <h3 class="hr-other-name">${escapeHtml(label)}</h3>
      <div class="run-photo-feed hr-other-feed" id="hunt-review-other-${index}"></div>
    </article>`;
}

function mountReviewRunGroups(orderedGroups, uid) {
  orderedGroups.forEach(([, groupPhotos], idx) => {
    const host = document.getElementById(`hunt-review-run-${idx}`);
    if (host) renderPhotoCardsInto(host, sortWithinGroup(groupPhotos), uid);
  });
}

function mountReviewOtherGroups(orderedOtherGroups, uid) {
  orderedOtherGroups.forEach(([, playerPhotos], j) => {
    const host = document.getElementById(`hunt-review-other-${j}`);
    if (host) renderPhotoCardsInto(host, sortOthersFeed(playerPhotos), uid);
  });
}

export async function render(challengeId) {
  await loadHuntReviewDeps();
  if (!auth.currentUser) {
    saveAuthReturn(`#/hunt-review/${challengeId}`);
    loginPage.render();
    return;
  }

  const uid = auth.currentUser.uid;
  await renderAppShell('<div class="hr-page"><p class="hr-empty">Loading photos…</p></div>', "hunts");

  try {
    const c = await getChallenge(challengeId);
    if (!c) {
      await renderMissingReview();
      return;
    }

    const backHref = await renderReviewShell(c, challengeId);

    const officialHost = document.getElementById("hunt-review-official");
    if (officialHost) {
      officialHost.innerHTML = buildOfficialListingHtml(c);
    }

    await bindReviewRunButton(c, uid, challengeId);
    startReviewPhotosWatch(challengeId, uid, backHref);
  } catch (err) {
    await renderAppShell(
      `<div class="hr-page">
        <div class="status-banner error">${escapeHtml(err.message)}</div>
        <p><a href="#/" class="hr-back-link">← All hunts</a></p>
      </div>`,
      "hunts",
    );
  }
}

async function renderMissingReview() {
  await renderAppShell(
    `<div class="hr-page">
      <div class="status-banner error">This hunt was not found.</div>
      <p><a href="#/" class="hr-back-link">← All hunts</a></p>
    </div>`,
    "hunts",
  );
}

async function renderReviewShell(c, challengeId) {
  const title = c.title || "Hunt";
  const area = c.areaLabel || "Manhattan";
  const backHref = `#/challenge/${challengeId}`;
  await renderAppShell(
    `
    <div class="hr-page">
      <header class="hr-hero">
        <a href="${escapeHtml(backHref)}" class="hr-back-link" id="hunt-review-back">← ${escapeHtml(title)}</a>
        <p class="hr-kicker">Review · ${escapeHtml(area)}</p>
        <h1 class="hr-title">Photos<br /><span class="hr-title-accent">from this hunt.</span></h1>
        <p class="hr-lead">Checkpoint photos from your runs, then other players (visible after you submit at least one run photo).</p>
      </header>

      <div id="hunt-review-run-pack" class="hr-run-pack" hidden>
        <div class="hr-run-card">
          <button type="button" class="btn btn-primary btn-block" id="hunt-review-run-btn"></button>
          <div id="hunt-review-run-status" class="hr-run-status"></div>
        </div>
      </div>

      <div id="hunt-review-official"></div>

      <div id="hunt-review-body">
        <p class="hr-empty">Loading…</p>
      </div>
    </div>
  `,
    "hunts",
  );
  return backHref;
}

async function bindReviewRunButton(c, uid, challengeId) {
  unwireHuntReviewRun();
  const pack = document.getElementById("hunt-review-run-pack");
  const runBtn = document.getElementById("hunt-review-run-btn");
  if (!runBtn || !pack) return;
  const hasWon = await safeUserHasWonChallenge(uid, challengeId);
  const isCreator = (c.createdBy || "") === uid;
  if (hasWon) bindReviewRunCta(c, challengeId, runBtn, "Restart hunt", true);
  else if (isCreator) bindReviewRunCta(c, challengeId, runBtn, "Start your own hunt", false);
  if (hasWon || isCreator) pack.hidden = false;
}

async function safeUserHasWonChallenge(uid, challengeId) {
  try {
    return await userHasWonChallenge(uid, challengeId);
  } catch {
    return false;
  }
}

function bindReviewRunCta(challenge, challengeId, runBtn, text, confirmRepeatWin) {
  const runStatus = document.getElementById("hunt-review-run-status");
  runBtn.textContent = text;
  huntReviewChallengeForRun = challenge;
  huntReviewRunBtn = runBtn;
  huntReviewRunHandler = () => {
    void startHuntWithGeoCheck({
      challenge: huntReviewChallengeForRun,
      challengeId,
      statusEl: runStatus,
      buttonEl: runBtn,
      loginReturnHash: `#/hunt-review/${challengeId}`,
      confirmRepeatWin,
    });
  };
  runBtn.addEventListener("click", huntReviewRunHandler);
}

function startReviewPhotosWatch(challengeId, uid, backHref) {
  stopPhotosWatch();
  photosUnsub = watchRunPhotos(
    challengeId,
    (list) => {
      paintReview(list, uid, backHref);
    },
    (err) => {
      console.warn("hunt-review photos", err);
      const body = document.getElementById("hunt-review-body");
      if (body) {
        body.innerHTML = `<div class="status-banner error">${escapeHtml(err.message || "Could not load photos.")}</div>`;
      }
    },
  );
}

export function cleanup() {
  unwireHuntReviewRun();
  teardownPhotoCards();
  stopPhotosWatch();
}
