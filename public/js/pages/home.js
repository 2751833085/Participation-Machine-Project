/**
 * Home page — hunts feed.
 */

import { renderShell } from "../components/shell.js";
import {
  applyHomeHeroContextPlaceholder,
  applyHomeHeroEyebrowDateOnly,
  applyHomeHeroTitle,
  hydrateHomeHeroContext,
} from "../lib/nyc-hero-context.js";
import { escapeHtml } from "../lib/utils.js";
import { nav } from "../lib/router.js";
import { auth } from "../firebase-init.js";
import { userHasWonChallenge } from "../services/attempts.js";
import { watchChallenges } from "../services/challenges.js";
import { promptGuestNeedsSignIn } from "../services/auth.js";
import { promptReportChallenge } from "../services/reports.js";
import {
  huntListItemHtml,
  wireHuntListThumbnails,
} from "../components/hunt-feed-markup.js";
import { watchFavoritedHuntIds, setHuntFavorited } from "../services/favorites.js";
import { showAppToast } from "../lib/app-toast.js";

let listUnsub = null;
let favUnsub = null;
let lastSnap = null;
let huntFeedEl = null;
/** @type {Set<string>} */
let favoritedIds = new Set();

function setFeedContent(feedEl, html) {
  feedEl.innerHTML = html;
  feedEl.classList.remove("loading");
  feedEl.removeAttribute("aria-busy");
}

function renderFeedInto(feedEl) {
  if (!feedEl || !lastSnap) return;

  const docs = lastSnap.docs;

  if (!docs.length) {
    setFeedContent(
      feedEl,
      '<p class="empty-state">No hunts yet. Be the first to <a href="#/create">create one</a>.</p>',
    );
    return;
  }

  setFeedContent(
    feedEl,
    `<ul class="hunt-list-stack">${docs
      .map((d) => {
        const c = d.data();
        const spots = c.spots?.length ?? 0;
        const mins = c.timeLimitMinutes ?? "?";
        const thumb = c.spots?.[0]?.imageUrl;
        const titleRaw = c.title || "Untitled hunt";
        const createdBy = c.createdBy || "";
        return huntListItemHtml({
          id: d.id,
          title: titleRaw,
          spots,
          mins,
          areaLabel: c.areaLabel || "NYC",
          thumb,
          createdBy,
          isFavorited: favoritedIds.has(d.id),
        });
      })
      .join("")}</ul>`,
  );
  wireHuntListThumbnails(feedEl);
}

async function onHuntFeedClick(e) {
  const row = e.target.closest("a.hunt-row");
  if (row && huntFeedEl?.contains(row) && auth.currentUser) {
    const href = row.getAttribute("href") || "";
    const m = href.match(/#\/challenge\/([^/?#]+)/);
    if (m) {
      const challengeId = m[1];
      const createdBy = row.getAttribute("data-created-by") || "";
      if (createdBy && createdBy === auth.currentUser.uid) {
        e.preventDefault();
        nav(`#/hunt-review/${challengeId}`);
        return;
      }
      e.preventDefault();
      try {
        const won = await userHasWonChallenge(
          auth.currentUser.uid,
          challengeId,
        );
        if (won) {
          nav(`#/hunt-review/${challengeId}`);
        } else {
          nav(`#/challenge/${challengeId}`);
        }
      } catch {
        nav(`#/challenge/${challengeId}`);
      }
      return;
    }
  }

  const fav = e.target.closest(".hunt-favorite-btn");
  if (fav && huntFeedEl?.contains(fav)) {
    e.preventDefault();
    e.stopPropagation();
    const challengeId = fav.getAttribute("data-challenge-id");
    if (!challengeId) return;
    if (!auth.currentUser) {
      if (
        await promptGuestNeedsSignIn("Saving favorites needs a Google account.")
      ) {
        return;
      }
      return;
    }
    const was = favoritedIds.has(challengeId);
    try {
      await setHuntFavorited(challengeId, !was);
      if (!was) favoritedIds.add(challengeId);
      else favoritedIds.delete(challengeId);
      renderFeedInto(huntFeedEl);
      showAppToast(was ? "Removed from Favorited." : "Added to Favorited.");
    } catch (err) {
      showAppToast(err?.message || "Could not update favorites.");
    }
    return;
  }

  const btn = e.target.closest(".hunt-row__report");
  if (!btn || !huntFeedEl?.contains(btn)) return;
  e.preventDefault();
  e.stopPropagation();
  const challengeId = btn.getAttribute("data-challenge-id");
  if (!challengeId) return;
  const huntTitle = btn.getAttribute("data-challenge-title") || "Hunt";
  await promptReportChallenge({ challengeId, huntTitle });
}

function bindFavoritesWatch() {
  if (favUnsub) {
    favUnsub();
    favUnsub = null;
  }
  const uid = auth.currentUser?.uid;
  if (!uid) {
    favoritedIds = new Set();
    if (lastSnap && huntFeedEl) renderFeedInto(huntFeedEl);
    return;
  }
  favUnsub = watchFavoritedHuntIds(
    uid,
    (ids) => {
      favoritedIds = new Set(ids);
      if (lastSnap && huntFeedEl) renderFeedInto(huntFeedEl);
    },
    () => {},
  );
}

export function render() {
  lastSnap = null;

  renderShell(
    `
    <div class="home-page">
      <section class="hero" aria-labelledby="hero-dynamic-title">
        <p class="hero-eyebrow home-hero-eyebrow" id="hero-eyebrow"></p>
        <h1 class="hero-title" id="hero-dynamic-title">Good day.</h1>
        <p class="hero-context" id="hero-context" hidden></p>
        <p class="lead hero-lead">Timed photo hunts on Manhattan streets — open a listing to preview checkpoints, then start the clock. Tap <strong>+</strong> below to publish your own.</p>
      </section>
      <section class="section home-feed-section" aria-labelledby="hunts-feed-heading">
        <h2 id="hunts-feed-heading" class="section-title">Open hunts</h2>
        <div id="hunts-feed" class="hunt-list loading" role="region" aria-busy="true">Loading…</div>
      </section>
    </div>
  `,
    "hunts",
  );

  huntFeedEl = document.getElementById("hunts-feed");
  huntFeedEl?.addEventListener("click", onHuntFeedClick);
  bindFavoritesWatch();

  applyHomeHeroEyebrowDateOnly();
  applyHomeHeroTitle();
  applyHomeHeroContextPlaceholder();
  void hydrateHomeHeroContext();

  listUnsub = watchChallenges(
    40,
    (snap) => {
      lastSnap = snap;
      if (!snap.size) {
        setFeedContent(
          huntFeedEl,
          '<p class="empty-state">No hunts yet. Be the first to <a href="#/create">create one</a>.</p>',
        );
        return;
      }
      renderFeedInto(huntFeedEl);
    },
    (err) => {
      setFeedContent(
        huntFeedEl,
        `<div class="status-banner error">${escapeHtml(err.message)}</div>`,
      );
    },
  );
}

export function cleanup() {
  huntFeedEl?.removeEventListener("click", onHuntFeedClick);
  huntFeedEl = null;
  if (favUnsub) {
    favUnsub();
    favUnsub = null;
  }
  favoritedIds = new Set();
  if (listUnsub) {
    listUnsub();
    listUnsub = null;
  }
  lastSnap = null;
}
