import { escapeHtml } from "./admin-utils.js";
import { formatIso, formatReactionBar } from "./helpers.js";

export function renderHuntSocialPhotos(photos) {
  const root = document.getElementById("admin-social-root");
  if (!root) return;

  if (!photos.length) {
    root.innerHTML = '<p class="admin-muted">No run photos for this hunt.</p>';
    return;
  }

  root.innerHTML = photos
    .map((p) => {
      const photoVotes = formatReactionBar(p);
      const commentsHtml = (p.comments || [])
        .map(
          (c) => `
        <li class="admin-soc-comment" data-cid="${escapeHtml(c.id)}">
          <div class="admin-soc-comment-head">
            <strong>${escapeHtml(c.authorName || "Player")}</strong>
            <span class="admin-muted admin-soc-time">${escapeHtml(formatIso(c.createdAt))}</span>
            <span class="admin-soc-votes" title="Reactions on this comment">${escapeHtml(formatReactionBar(c))}</span>
          </div>
          <p class="admin-soc-comment-text">${escapeHtml(c.text || "")}</p>
          <div class="admin-soc-actions">
            <button type="button" class="btn btn-ghost btn-tiny" data-admin-del-comment data-photo-id="${escapeHtml(p.id)}" data-comment-id="${escapeHtml(c.id)}">Delete comment</button>
          </div>
          <div class="admin-staff-reply-box" data-photo-id="${escapeHtml(p.id)}" data-parent="${escapeHtml(c.id)}">
            <textarea class="login-field-input admin-staff-reply-text" rows="2" placeholder="Reply as administrator"></textarea>
            <button type="button" class="btn btn-primary btn-tiny" data-admin-post-reply>Send reply</button>
          </div>
        </li>`,
        )
        .join("");

      return `
      <article class="ds-card admin-photo-card" data-photo-id="${escapeHtml(p.id)}">
        <div class="admin-photo-card-top">
          <a href="${escapeHtml(p.imageUrl)}" target="_blank" rel="noopener noreferrer" class="admin-photo-thumb-link">
            <img class="admin-photo-thumb" src="${escapeHtml(p.imageUrl)}" alt="" loading="lazy" />
          </a>
          <div class="admin-photo-card-meta">
            <p class="admin-mono admin-photo-meta-line">Photo <strong>${escapeHtml(p.id)}</strong></p>
            <p class="admin-photo-meta-line">By UID <span class="admin-mono">${escapeHtml(p.userId || "—")}</span> · ${escapeHtml(formatIso(p.createdAt))}</p>
            <p class="admin-photo-reactions" title="Player reactions on this photo">${escapeHtml(photoVotes)}</p>
            <button type="button" class="btn btn-ghost btn-tiny" data-admin-del-photo data-photo-id="${escapeHtml(p.id)}">Delete photo + comments</button>
          </div>
        </div>
        <p class="admin-h3 admin-soc-h3">Comments</p>
        <ul class="admin-soc-list">${commentsHtml || '<li class="admin-muted">No comments.</li>'}</ul>
        <div class="admin-staff-reply-box admin-staff-reply-box--root" data-photo-id="${escapeHtml(p.id)}" data-parent="">
          <textarea class="login-field-input admin-staff-reply-text" rows="2" placeholder="Official comment (shown as administrator)"></textarea>
          <button type="button" class="btn btn-primary btn-tiny" data-admin-post-reply>Post</button>
        </div>
      </article>`;
    })
    .join("");
}
