/**
 * Review checkpoint photos for a hunt — your completions first, then others (gated).
 */

import { auth } from "../firebase-init.js";
import {
  buildPhotoCardHtml,
  mountPhotoCard,
} from "../components/run-social-ui.js";
import { renderShell } from "../components/shell.js";
import { escapeHtml } from "../lib/utils.js";
import { saveAuthReturn } from "../lib/state.js";
import { getChallenge } from "../services/challenges.js";
import {
  aggregateVoteCounts,
  myPhotoReaction,
  watchRunPhotos,
} from "../services/run-social.js";
import * as loginPage from "./login.js";

let photosUnsub = null;
const photoCardCleanups = [];

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
      <section class="hunt-review-section hunt-review-official" aria-labelledby="hunt-review-official-h">
        <h2 id="hunt-review-official-h" class="section-title">Hunt listing photos</h2>
        <p class="card-meta hunt-review-empty">No listing photos on this hunt.</p>
      </section>
      <div class="hunt-review-divider" role="presentation"></div>`;
  }
  const spotsHtml = spots
    .map(
      (s, i) => `
      <div class="spot-check">
        <img src="${escapeHtml(s.imageUrl)}" alt="Listing checkpoint ${i + 1}" loading="lazy" />
        <div class="body">
          <strong>Checkpoint ${i + 1}</strong>
          ${s.hint ? `<p class="card-meta">${escapeHtml(s.hint)}</p>` : ""}
        </div>
      </div>`,
    )
    .join("");
  return `
      <section class="hunt-review-section hunt-review-official" aria-labelledby="hunt-review-official-h">
        <h2 id="hunt-review-official-h" class="section-title">Hunt listing photos</h2>
        <p class="card-meta hunt-review-official-lead">Official images from this hunt’s page — the checkpoints players try to complete.</p>
        <div class="card hunt-review-official-card">${spotsHtml}</div>
      </section>
      <div class="hunt-review-divider" role="presentation"></div>`;
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
  const groups = groupPhotosByAttempt(mine);
  const orderedGroups = sortGroupsDesc(groups);
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

  parts.push(`<section class="hunt-review-section hunt-review-yours" aria-labelledby="hunt-review-yours-h">`);
  parts.push(
    `<h2 id="hunt-review-yours-h" class="section-title">Your submissions</h2>`,
  );

  if (!orderedGroups.length) {
    parts.push(
      `<p class="card-meta hunt-review-empty">You have not submitted any checkpoint photos for this hunt yet. Start a run and upload at least one checkpoint photo to unlock other players’ photos here.</p>`,
    );
  } else {
    orderedGroups.forEach(([attemptId, groupPhotos], idx) => {
      const sorted = sortWithinGroup(groupPhotos);
      const title = formatRunHeading(sorted);
      parts.push(`<div class="hunt-review-run-block" data-attempt="${escapeHtml(attemptId)}">`);
      parts.push(`<h3 class="hunt-review-run-title">${escapeHtml(title)}</h3>`);
      parts.push(
        `<div class="run-photo-feed hunt-review-run-feed" id="hunt-review-run-${idx}"></div>`,
      );
      parts.push(`</div>`);
    });
  }
  parts.push(`</section>`);

  parts.push(`<div class="hunt-review-divider" role="presentation"></div>`);

  parts.push(
    `<section class="hunt-review-section hunt-review-others" aria-labelledby="hunt-review-others-h">`,
  );
  parts.push(
    `<h2 id="hunt-review-others-h" class="section-title">Other players</h2>`,
  );

  if (!canSeeOthers) {
    parts.push(
      `<p class="status-banner info hunt-review-gate">Submit at least one checkpoint photo during a run to see other players’ photos.</p>`,
    );
  } else if (!others.length) {
    parts.push(
      `<p class="card-meta hunt-review-empty">No other players have shared photos for this hunt yet.</p>`,
    );
  } else {
    orderedOtherGroups.forEach(([, playerPhotos], j) => {
      const label = String(playerPhotos[0]?.authorName || "Player").trim() || "Player";
      parts.push(`<div class="hunt-review-other-block">`);
      parts.push(
        `<h3 class="hunt-review-other-name">${escapeHtml(label)}</h3>`,
      );
      parts.push(
        `<div class="run-photo-feed hunt-review-other-feed" id="hunt-review-other-${j}"></div>`,
      );
      parts.push(`</div>`);
    });
  }
  parts.push(`</section>`);

  body.innerHTML = parts.join("");

  orderedGroups.forEach(([, groupPhotos], idx) => {
    const host = document.getElementById(`hunt-review-run-${idx}`);
    if (host) renderPhotoCardsInto(host, sortWithinGroup(groupPhotos), uid);
  });

  orderedOtherGroups.forEach(([, playerPhotos], j) => {
    const host = document.getElementById(`hunt-review-other-${j}`);
    if (host) renderPhotoCardsInto(host, sortOthersFeed(playerPhotos), uid);
  });
}

export async function render(challengeId) {
  if (!auth.currentUser) {
    saveAuthReturn(`#/hunt-review/${challengeId}`);
    loginPage.render();
    return;
  }

  const uid = auth.currentUser.uid;
  renderShell('<p class="loading">Loading photos…</p>', "hunts");

  try {
    const c = await getChallenge(challengeId);
    if (!c) {
      renderShell(
        '<div class="page-narrow"><div class="status-banner error">This hunt was not found.</div><p><a href="#/" class="back-link">← All hunts</a></p></div>',
        "hunts",
      );
      return;
    }

    const title = c.title || "Hunt";
    const backHref = `#/challenge/${challengeId}`;

    renderShell(
      `
      <a href="${escapeHtml(backHref)}" class="back-link" id="hunt-review-back">← ${escapeHtml(title)}</a>
      <h1 class="h1" style="margin-top:0.5rem;">Photos from this hunt</h1>
      <div id="hunt-review-official" class="hunt-review-official-host"></div>
      <p class="card-meta hunt-review-lead">Below: checkpoint photos from your runs, then other players (visible after you submit at least one run photo).</p>
      <div id="hunt-review-body"><p class="card-meta">Loading…</p></div>
    `,
      "hunts",
    );

    const officialHost = document.getElementById("hunt-review-official");
    if (officialHost) {
      officialHost.innerHTML = buildOfficialListingHtml(c);
    }

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
  } catch (err) {
    renderShell(
      `<div class="page-narrow"><div class="status-banner error">${escapeHtml(err.message)}</div><p><a href="#/" class="back-link">← All hunts</a></p></div>`,
      "hunts",
    );
  }
}

export function cleanup() {
  teardownPhotoCards();
  stopPhotosWatch();
}
