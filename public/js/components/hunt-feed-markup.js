/**
 * Shared hunt row markup for Open hunts and Favorited feeds.
 */

import { escapeHtml } from "../lib/utils.js";

/**
 * @param {{
 *   id: string,
 *   title: string,
 *   spots: number,
 *   mins: string | number,
 *   areaLabel: string,
 *   thumb: string | null | undefined,
 *   createdBy: string,
 *   isFavorited: boolean,
 * }} row
 */
/** Reveal each row thumbnail only after decode/load. */
export function wireHuntListThumbnails(feedEl) {
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

export function huntListItemHtml(row) {
  const cid = escapeHtml(row.id);
  const titleRaw = row.title || "Untitled hunt";
  const titleAttr = escapeHtml(titleRaw);
  const createdBy = escapeHtml(row.createdBy || "");
  const spots = row.spots ?? 0;
  const mins = row.mins ?? "?";
  const thumb = row.thumb;
  const thumbBlock = thumb
    ? `<div class="hunt-row__thumb hunt-row__thumb--has-img"><img class="hunt-row__thumb-img" src="${escapeHtml(thumb)}" alt="" loading="lazy" width="120" height="120" decoding="async" /></div>`
    : `<div class="hunt-row__thumb hunt-row__thumb--empty" role="img" aria-label=""></div>`;
  const favClass = row.isFavorited ? " hunt-favorite-btn is-favorited" : " hunt-favorite-btn";
  const favLabel = row.isFavorited ? "Favorited" : "Favorite";
  return `
            <li class="hunt-list-item">
              <div class="hunt-list-item-wrap">
                <a class="hunt-row" href="#/challenge/${cid}" data-created-by="${createdBy}">
                  ${thumbBlock}
                  <div class="hunt-row__body">
                    <span class="badge hunt-row__badge">${spots} checkpoint${spots === 1 ? "" : "s"} · ${escapeHtml(String(mins))} min</span>
                    <h3 class="hunt-row__title">${escapeHtml(titleRaw)}</h3>
                    <p class="hunt-row__meta">${escapeHtml(row.areaLabel || "NYC")}</p>
                  </div>
                </a>
                <button type="button" class="${favClass.trim()}" aria-pressed="${row.isFavorited ? "true" : "false"}" data-challenge-id="${cid}" data-challenge-title="${titleAttr}">
                  <span class="hunt-favorite-btn__text">${favLabel}</span>
                </button>
                <button type="button" class="hunt-row__report" aria-label="Report this hunt" title="Report" data-challenge-id="${cid}" data-challenge-title="${titleAttr}">\u26A0\uFE0E</button>
              </div>
            </li>
          `;
}
