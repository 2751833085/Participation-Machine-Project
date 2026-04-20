/**
 * Leaderboard — users with merit points &gt; 0, highest first.
 */

import { renderShell } from "../components/shell.js";
import { escapeHtml } from "../lib/utils.js";
import { auth, db } from "../firebase-init.js";
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
import { avatarSrcForId } from "../services/users.js";

const PAGE_LIMIT = 80;

export async function render() {
  renderShell(
    '<p class="loading">Loading leaderboard…</p>',
    "leaderboard",
  );

  try {
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
    const rows = snap.docs.map((d, i) => {
      const data = d.data();
      const merit = Number(data.meritPoints ?? 0);
      const name =
        String(data.displayName || "").trim() ||
        String(data.usernameNorm || "").trim() ||
        "Player";
      const avatarUrl = avatarSrcForId(data.avatarId);
      const rank = i + 1;
      return {
        id: d.id,
        rank,
        merit,
        name,
        avatarUrl,
      };
    });

    const currentRank = currentUid ? rows.find((row) => row.id === currentUid) : null;
    const currentData =
      currentUserSnap && currentUserSnap.exists() ? currentUserSnap.data() : null;
    const currentName =
      String(currentData?.displayName || "").trim() ||
      String(currentData?.usernameNorm || "").trim() ||
      (currentUid ? "you" : "Guest");
    const currentMerit = Number(currentData?.meritPoints ?? 0);
    const currentAvatarUrl = avatarSrcForId(currentData?.avatarId);

    const podiumRows = rows.slice(0, 3);
    const podiumBlock = podiumRows.length
      ? `<div class="leaderboard-podium">
          ${podiumRows
            .map(
              (player, index) => `
            <div class="leaderboard-podium__slot">
              <div class="leaderboard-podium__avatar-wrap">
                ${
                  player.avatarUrl
                    ? `<img class="leaderboard-podium__avatar" src="${escapeHtml(player.avatarUrl)}" alt="" width="48" height="48" decoding="async" />`
                    : '<span class="leaderboard-podium__avatar leaderboard-row__avatar--empty" aria-hidden="true"></span>'
                }
              </div>
              <p class="leaderboard-podium__name">${escapeHtml(player.name)}</p>
              <p class="leaderboard-podium__merit">${player.merit} pts</p>
              <div class="leaderboard-podium__bar leaderboard-podium__bar--${index + 1}">
                <span>#${player.rank}</span>
              </div>
            </div>`,
            )
            .join("")}
        </div>`
      : '<p class="empty-state">No players with merits yet. Finish a hunt in time to earn Merits and appear here.</p>';

    const rankedList = rows.length
      ? `<ol class="leaderboard-list">
          ${rows
            .map(
              (player) => `
            <li class="leaderboard-row${currentUid && player.id === currentUid ? " is-you" : ""}">
              <span class="leaderboard-row__rank" aria-label="Rank ${player.rank}">#${player.rank}</span>
              ${
                player.avatarUrl
                  ? `<img class="leaderboard-row__avatar" src="${escapeHtml(player.avatarUrl)}" alt="" width="40" height="40" decoding="async" />`
                  : '<span class="leaderboard-row__avatar leaderboard-row__avatar--empty" aria-hidden="true"></span>'
              }
              <div class="leaderboard-row__main">
                <span class="leaderboard-row__name">${escapeHtml(player.name)}</span>
                <span class="leaderboard-row__merit">${player.merit} Merits</span>
              </div>
            </li>`,
            )
            .join("")}
        </ol>`
      : '<p class="empty-state">No players with merits yet. Finish a hunt in time to earn Merits and appear here.</p>';

    renderShell(
      `
      <div class="page-narrow leaderboard-page">
        <section class="hero leaderboard-hero" aria-labelledby="leaderboard-heading">
          <p class="hero-eyebrow">Rankings</p>
          <h1 class="hero-title" id="leaderboard-heading">Leaderboard</h1>
          <p class="lead hero-lead">Public names and avatars, sorted by lifetime Merits.</p>
        </section>
        <section class="leaderboard-you-card" aria-label="Your rank">
          <div class="leaderboard-you-card__avatar-wrap">
            ${
              currentAvatarUrl
                ? `<img class="leaderboard-you-card__avatar" src="${escapeHtml(currentAvatarUrl)}" alt="" width="36" height="36" decoding="async" />`
                : '<span class="leaderboard-you-card__avatar leaderboard-row__avatar--empty" aria-hidden="true"></span>'
            }
          </div>
          <div class="leaderboard-you-card__meta">
            <p class="leaderboard-you-card__kicker">Your rank</p>
            <p class="leaderboard-you-card__line">${
              currentRank
                ? `#${currentRank.rank} globally · ${currentRank.merit} merits`
                : `${currentMerit} merits · not ranked yet`
            }</p>
          </div>
          <div class="leaderboard-you-card__number">${currentRank ? currentRank.rank : "—"}</div>
        </section>
        <section class="leaderboard-block" aria-label="Top players">
          <p class="leaderboard-block__title">Top players</p>
          ${podiumBlock}
        </section>
        <section class="card leaderboard-card" aria-label="All rankings">
          <p class="leaderboard-block__title">All rankings</p>
          ${rankedList}
          ${
            currentUid && !currentRank
              ? `<div class="leaderboard-row leaderboard-row--standalone is-you">
              <span class="leaderboard-row__rank">—</span>
              ${
                currentAvatarUrl
                  ? `<img class="leaderboard-row__avatar" src="${escapeHtml(currentAvatarUrl)}" alt="" width="40" height="40" decoding="async" />`
                  : '<span class="leaderboard-row__avatar leaderboard-row__avatar--empty" aria-hidden="true"></span>'
              }
              <div class="leaderboard-row__main">
                <span class="leaderboard-row__name">${escapeHtml(currentName)}</span>
                <span class="leaderboard-row__merit">${currentMerit} Merits</span>
              </div>
            </div>`
              : ""
          }
        </section>
      </div>
    `,
      "leaderboard",
    );
  } catch (err) {
    renderShell(
      `<div class="page-narrow"><div class="status-banner error">${escapeHtml(err.message || "Could not load leaderboard.")}</div><p><a href="#/" class="back-link">← Open hunts</a></p></div>`,
      "leaderboard",
    );
  }
}

export function cleanup() {}
