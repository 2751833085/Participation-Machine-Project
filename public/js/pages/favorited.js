/**
 * Favorited hunts — lists `users/{uid}/favoritedHunts` with live updates.
 */

import { renderShell } from "../components/shell.js";
import { escapeHtml } from "../lib/utils.js";
import { nav } from "../lib/router.js";
import { auth } from "../firebase-init.js";
import { userHasWonChallenge } from "../services/attempts.js";
import { getChallenge } from "../services/challenges.js";
import { watchFavoritedHuntIds, setHuntFavorited } from "../services/favorites.js";
import { promptReportChallenge } from "../services/reports.js";
import { showAppToast } from "../lib/app-toast.js";
import {
  huntListItemHtml,
  wireHuntListThumbnails,
} from "../components/hunt-feed-markup.js";
import { promptGuestNeedsSignIn } from "../services/auth.js";

let feedEl = null;
let favorUnsub = null;
/** @type {string[]} */
let orderedIds = [];

function setFeedHtml(html) {
  if (!feedEl) return;
  feedEl.innerHTML = html;
  feedEl.classList.remove("loading");
  feedEl.removeAttribute("aria-busy");
}

async function paintFeed() {
  if (!feedEl) return;
  if (!orderedIds.length) {
    setFeedHtml(
      '<p class="empty-state">You have not favorited any hunts yet. Browse <a href="#/">Open hunts</a> and tap <strong>Favorite</strong> on a listing.</p>',
    );
    return;
  }

  const rows = await Promise.all(
    orderedIds.map(async (id) => {
      const c = await getChallenge(id);
      if (!c) return null;
      const spots = c.spots?.length ?? 0;
      const mins = c.timeLimitMinutes ?? "?";
      const thumb = c.spots?.[0]?.imageUrl;
      return huntListItemHtml({
        id: c.id,
        title: c.title || "Untitled hunt",
        spots,
        mins,
        areaLabel: c.areaLabel || "NYC",
        thumb,
        createdBy: c.createdBy || "",
        isFavorited: true,
      });
    }),
  );

  const html = rows.filter(Boolean).length
    ? `<ul class="hunt-list-stack">${rows.filter(Boolean).join("")}</ul>`
    : '<p class="empty-state">Your saved hunts are no longer available.</p>';

  setFeedHtml(html);
  wireHuntListThumbnails(feedEl);
}

async function onFeedClick(e) {
  const row = e.target.closest("a.hunt-row");
  if (row && feedEl?.contains(row) && auth.currentUser) {
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
        if (won) nav(`#/hunt-review/${challengeId}`);
        else nav(`#/challenge/${challengeId}`);
      } catch {
        nav(`#/challenge/${challengeId}`);
      }
      return;
    }
  }

  const fav = e.target.closest(".hunt-favorite-btn");
  if (fav && feedEl?.contains(fav)) {
    e.preventDefault();
    e.stopPropagation();
    const challengeId = fav.getAttribute("data-challenge-id");
    if (!challengeId) return;
    if (!auth.currentUser) {
      if (await promptGuestNeedsSignIn("Saving favorites needs a Google account.")) {
        return;
      }
      return;
    }
    const was = fav.classList.contains("is-favorited");
    try {
      await setHuntFavorited(challengeId, !was);
      showAppToast(
        was ? "Removed from Favorited." : "Added to Favorited.",
      );
    } catch (err) {
      showAppToast(err?.message || "Could not update favorites.");
    }
    return;
  }

  const btn = e.target.closest(".hunt-row__report");
  if (!btn || !feedEl?.contains(btn)) return;
  e.preventDefault();
  e.stopPropagation();
  const challengeId = btn.getAttribute("data-challenge-id");
  if (!challengeId) return;
  const huntTitle = btn.getAttribute("data-challenge-title") || "Hunt";
  await promptReportChallenge({ challengeId, huntTitle });
}

export function render() {
  orderedIds = [];
  renderShell(
    `
    <div class="home-page favorited-page">
      <section class="hero" aria-labelledby="favorited-heading">
        <p class="hero-eyebrow">Collection</p>
        <h1 class="hero-title" id="favorited-heading">Saved hunts</h1>
        <p class="lead hero-lead">Hunts you bookmarked for later.</p>
      </section>
      <section class="section home-feed-section" aria-labelledby="favorited-feed-heading">
        <h2 id="favorited-feed-heading" class="section-title">Saved</h2>
        <div id="favorited-feed" class="hunt-list loading" role="region" aria-busy="true">Loading…</div>
      </section>
    </div>
  `,
    "favorited",
  );

  feedEl = document.getElementById("favorited-feed");
  feedEl?.addEventListener("click", onFeedClick);

  const uid = auth.currentUser?.uid;
  if (!uid) {
    setFeedHtml(
      '<p class="empty-state">Sign in to view your favorited hunts.</p>',
    );
    return;
  }

  favorUnsub = watchFavoritedHuntIds(
    uid,
    (ids) => {
      orderedIds = ids;
      void paintFeed();
    },
    (err) => {
      setFeedHtml(
        `<div class="status-banner error">${escapeHtml(err.message)}</div>`,
      );
    },
  );
}

export function cleanup() {
  feedEl?.removeEventListener("click", onFeedClick);
  feedEl = null;
  if (favorUnsub) {
    favorUnsub();
    favorUnsub = null;
  }
  orderedIds = [];
}
