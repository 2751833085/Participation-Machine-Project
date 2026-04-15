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
import { watchChallenges } from "../services/challenges.js";

let listUnsub = null;
let lastSnap = null;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  );
}

/** Fade/slide in after first paint of loaded content (not on later Firestore updates). */
function revealFeedAfterFirstLoad(feedEl) {
  if (prefersReducedMotion()) return;
  feedEl.classList.add("hunt-list--reveal-once");
  feedEl.addEventListener(
    "animationend",
    () => feedEl.classList.remove("hunt-list--reveal-once"),
    { once: true },
  );
}

function setFeedContent(feedEl, html) {
  const fromLoading = feedEl.classList.contains("loading");
  feedEl.innerHTML = html;
  feedEl.classList.remove("loading");
  feedEl.removeAttribute("aria-busy");
  if (fromLoading) revealFeedAfterFirstLoad(feedEl);
}

/** Reveal each row thumbnail only after decode/load (avoids pop-in over the list fade). */
function wireHuntListThumbnails(feedEl) {
  if (!feedEl) return;
  const imgs = feedEl.querySelectorAll("img.hunt-row__thumb-img");
  for (const img of imgs) {
    const reveal = () => {
      img.classList.add("is-loaded");
    };
    if (img.complete && img.naturalWidth > 0) {
      reveal();
      continue;
    }
    img.addEventListener("load", reveal, { once: true });
    img.addEventListener("error", reveal, { once: true });
  }
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
      const thumbBlock = thumb
        ? `<div class="hunt-row__thumb hunt-row__thumb--has-img"><img class="hunt-row__thumb-img" src="${escapeHtml(thumb)}" alt="" loading="lazy" width="96" height="96" decoding="async" /></div>`
        : `<div class="hunt-row__thumb hunt-row__thumb--empty" role="img" aria-label=""></div>`;
      return `
            <li class="hunt-list-item">
              <a class="hunt-row" href="#/challenge/${d.id}">
                ${thumbBlock}
                <div class="hunt-row__body">
                  <span class="badge hunt-row__badge">${spots} checkpoint${spots === 1 ? "" : "s"} · ${mins} min</span>
                  <h3 class="hunt-row__title">${escapeHtml(c.title || "Untitled hunt")}</h3>
                  <p class="hunt-row__meta">${escapeHtml(c.areaLabel || "NYC")}</p>
                </div>
              </a>
            </li>
          `;
    })
    .join("")}</ul>`,
  );
  wireHuntListThumbnails(feedEl);
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

  const feed = document.getElementById("hunts-feed");

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
          feed,
          '<p class="empty-state">No hunts yet. Be the first to <a href="#/create">create one</a>.</p>',
        );
        return;
      }
      renderFeedInto(feed);
    },
    (err) => {
      setFeedContent(
        feed,
        `<div class="status-banner error">${escapeHtml(err.message)}</div>`,
      );
    },
  );
}

export function cleanup() {
  if (listUnsub) {
    listUnsub();
    listUnsub = null;
  }
  lastSnap = null;
}
