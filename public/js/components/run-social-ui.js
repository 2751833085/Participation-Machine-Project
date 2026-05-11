/**
 * DOM helpers for in-run shared photo feed (reactions + threaded comments).
 */

import { auth, db, openAlertModal, escapeHtml, isGuestBrowsing, promptGuestNeedsSignIn, addPhotoComment, aggregateVoteCounts, myPhotoReaction, setMyCommentVote, setMyPhotoVote, watchCommentVotes, watchPhotoComments, watchPhotoVotes } from "./component-utils.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

const ADMIN_PORTAL_UID = "__admin_portal__";

async function assertCanUseSocialFeatures() {
  if (auth.currentUser) return true;
  if (isGuestBrowsing()) {
    await promptGuestNeedsSignIn("Reactions and comments need a Google account.");
    return false;
  }
  await openAlertModal({
    title: "Sign in",
    message: "Please sign in with Google to react or comment.",
    okText: "OK",
  });
  return false;
}

function reactionButtonsHtml(prefix, counts, mine, disabled) {
  const d = disabled ? " disabled" : "";
  const upA = mine.vote === "up" ? " is-active" : "";
  const dnA = mine.vote === "down" ? " is-active" : "";
  const lA = mine.mood === "laugh" ? " is-active" : "";
  const cA = mine.mood === "cry" ? " is-active" : "";
  const aA = mine.mood === "awkward" ? " is-active" : "";
  return `
    <div class="run-react-row ds-react-row" role="group" aria-label="Reactions">
      <button type="button" class="run-react-btn ds-react-btn${upA}" data-${prefix}-act="vote-up"${d}><span class="ds-react-glyph" aria-hidden="true">▲</span><span class="run-react-n ds-react-n">${counts.up}</span></button>
      <button type="button" class="run-react-btn ds-react-btn${dnA}" data-${prefix}-act="vote-down"${d}><span class="ds-react-glyph" aria-hidden="true">▼</span><span class="run-react-n ds-react-n">${counts.down}</span></button>
      <button type="button" class="run-react-btn ds-react-btn${lA}" data-${prefix}-act="mood-laugh"${d}><span class="ds-react-glyph" aria-hidden="true">ha</span><span class="run-react-n ds-react-n">${counts.mood.laugh}</span></button>
      <button type="button" class="run-react-btn ds-react-btn${cA}" data-${prefix}-act="mood-cry"${d}><span class="ds-react-glyph" aria-hidden="true">oh</span><span class="run-react-n ds-react-n">${counts.mood.cry}</span></button>
      <button type="button" class="run-react-btn ds-react-btn${aA}" data-${prefix}-act="mood-awkward"${d}><span class="ds-react-glyph" aria-hidden="true">uh</span><span class="run-react-n ds-react-n">${counts.mood.awkward}</span></button>
    </div>
  `;
}

function nestComments(flat) {
  const map = new Map(flat.map((c) => [c.id, { ...c, replies: [] }]));
  const roots = [];
  flat.forEach((c) => {
    const node = map.get(c.id);
    const pid = c.parentCommentId;
    if (pid && map.has(pid)) map.get(pid).replies.push(node);
    else if (!pid) roots.push(node);
  });
  return roots;
}

function renderCommentTree(nodes, depth) {
  return nodes
    .map((c, idx) => {
      const pad = depth ? ` style="margin-left:${Math.min(depth, 4) * 0.75}rem"` : "";
      const staff = c.userId === ADMIN_PORTAL_UID ? " run-comment--staff" : "";
      const tintIdx = (idx + depth) % 4;
      const name = c.authorName || "Player";
      const initial = (name.trim()[0] || "?").toUpperCase();
      return `
      <div class="run-comment ds-comment ds-comment--tint-${tintIdx}${staff}"${pad} data-comment-id="${escapeHtml(c.id)}">
        <div class="run-comment-head ds-comment__head">
          <div class="ds-comment__avatar" aria-hidden="true">${escapeHtml(initial)}</div>
          <div class="ds-comment__byline">
            <strong class="ds-comment__name">${escapeHtml(name)}</strong>
            <span class="ds-comment__meta">Player</span>
          </div>
          <button type="button" class="btn btn-ghost btn-tiny run-comment-reply ds-comment__reply" data-reply-to="${escapeHtml(c.id)}">Reply</button>
        </div>
        <p class="run-comment-text ds-comment__text">${escapeHtml(c.text)}</p>
        <div class="run-comment-reactions ds-comment__reactions" id="run-cv-${escapeHtml(c.id)}"></div>
        ${c.replies?.length ? `<div class="ds-comment__replies">${renderCommentTree(c.replies, depth + 1)}</div>` : ""}
      </div>
    `;
    })
    .join("");
}

async function readMyPhotoVote(photoId, uid) {
  const snap = await getDoc(doc(db, "runPhotos", photoId, "votes", uid));
  const d = snap.data() || {};
  return { vote: d.vote || "", mood: d.mood || "" };
}

async function readMyCommentVote(photoId, commentId, uid) {
  const snap = await getDoc(
    doc(db, "runPhotos", photoId, "comments", commentId, "votes", uid),
  );
  const d = snap.data() || {};
  return { vote: d.vote || "", mood: d.mood || "" };
}

function bindPhotoRow(cardEl, photoId, uid) {
  cardEl.querySelectorAll(".run-react-row button[data-ph-act]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!(await assertCanUseSocialFeatures())) return;
      const act = btn.getAttribute("data-ph-act");
      const mine = await readMyPhotoVote(photoId, uid);
      try {
        const patch = reactionPatchForAction(act, mine);
        if (patch) await setMyPhotoVote(photoId, patch);
      } catch (err) {
        alert(err.message || "Could not update.");
      }
    });
  });
}

function bindCommentRow(photoId, commentId, uid, container) {
  container.querySelectorAll("button[data-cv-act]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!(await assertCanUseSocialFeatures())) return;
      const act = btn.getAttribute("data-cv-act");
      const mine = await readMyCommentVote(photoId, commentId, uid);
      try {
        const patch = reactionPatchForAction(act, mine);
        if (patch) await setMyCommentVote(photoId, commentId, patch);
      } catch (err) {
        alert(err.message || "Could not update.");
      }
    });
  });
}

function reactionPatchForAction(action, mine) {
  const target = REACTION_ACTIONS[action];
  if (!target) return null;
  return {
    [target.field]: mine[target.field] === target.value ? "" : target.value,
  };
}

const REACTION_ACTIONS = {
  "vote-up": { field: "vote", value: "up" },
  "vote-down": { field: "vote", value: "down" },
  "mood-laugh": { field: "mood", value: "laugh" },
  "mood-cry": { field: "mood", value: "cry" },
  "mood-awkward": { field: "mood", value: "awkward" },
};

export function buildPhotoCardHtml(photo, voteCounts, myUid, myReaction) {
  const mine = photo.userId === myUid;
  const label = mine ? "Your photo" : escapeHtml(photo.authorName || "Player");
  const cp =
    typeof photo.spotIndex === "number" &&
    Number.isInteger(photo.spotIndex) &&
    photo.spotIndex >= 0
      ? `<span class="run-photo-checkpoint">Checkpoint ${photo.spotIndex + 1}</span>`
      : "";
  return `
    <article class="run-photo-card ds-comments-card" data-photo-id="${escapeHtml(photo.id)}">
      <div class="run-photo-card-head ds-comments-card__head">
        <span class="badge ds-comments-card__author ${mine ? "run-photo-mine" : ""}">${label}</span>
        ${cp}
      </div>
      <div class="run-photo-img-wrap ds-comments-card__img-wrap">
        <img src="${escapeHtml(photo.imageUrl)}" alt="" loading="lazy" class="run-photo-img ds-comments-card__img" />
      </div>
      <div class="ds-comments-card__reactions">
        ${reactionButtonsHtml("ph", voteCounts, myReaction, false)}
      </div>
      <div class="ds-comments-card__divider" aria-hidden="true"></div>
      <div class="ds-comments-card__kicker">Reviews &amp; remarks</div>
      <div class="run-photo-comments ds-comments-card__list" data-comments-for="${escapeHtml(photo.id)}"></div>
      <div class="run-photo-comment-compose ds-compose">
        <label class="sr-only" for="run-cmt-${escapeHtml(photo.id)}">Add a comment</label>
        <textarea id="run-cmt-${escapeHtml(photo.id)}" class="input-grow run-comment-input ds-compose__input" rows="2" maxlength="500" placeholder="Drop a review…"></textarea>
        <input type="hidden" class="run-comment-parent" value="" aria-hidden="true" />
        <div class="run-comment-actions ds-compose__actions">
          <button type="button" class="btn btn-ghost btn-small run-comment-cancel-reply ds-compose__cancel" hidden>Cancel reply</button>
          <button type="button" class="btn btn-primary btn-small run-comment-send ds-compose__send">Post</button>
        </div>
      </div>
    </article>
  `;
}

export function mountPhotoCard(cardEl, photo, uid) {
  const cleanups = [];
  let commentVoteUnsubs = [];
  const photoId = photo.id;

  cleanups.push(
    watchPhotoVotes(photoId, (byUser) => syncPhotoVoteRow(cardEl, photoId, uid, byUser)),
  );

  const commentsEl = cardEl.querySelector(`[data-comments-for="${photoId}"]`);
  cleanups.push(
    watchPhotoComments(photoId, (list) => {
      commentVoteUnsubs.forEach((u) => u());
      commentVoteUnsubs = [];
      commentsEl.innerHTML = photoCommentsHtml(list);
      commentVoteUnsubs = watchVisibleCommentVotes(list, photoId, uid);
    }),
  );

  commentsEl.addEventListener("click", (e) => handleCommentReplyClick(e, commentsEl, cardEl));

  const ta = cardEl.querySelector(".run-comment-input");
  const parentIn = cardEl.querySelector(".run-comment-parent");
  const cancel = cardEl.querySelector(".run-comment-cancel-reply");
  cancel?.addEventListener("click", () => clearReplyTarget(parentIn, cancel));
  cardEl
    .querySelector(".run-comment-send")
    ?.addEventListener("click", () => submitPhotoComment(photoId, ta, parentIn, cancel));

  return () => {
    commentVoteUnsubs.forEach((u) => u());
    cleanups.forEach((u) => u());
  };
}

function syncPhotoVoteRow(cardEl, photoId, uid, byUser) {
  const counts = aggregateVoteCounts(byUser);
  const mine = myPhotoReaction(uid, byUser);
  const row = cardEl.querySelector(".run-react-row");
  if (!row) return;
  row.outerHTML = reactionButtonsHtml("ph", counts, mine, false);
  bindPhotoRow(cardEl, photoId, uid);
}

function photoCommentsHtml(list) {
  const tree = nestComments(list);
  return tree.length === 0
    ? '<p class="run-comments-empty ds-comments-empty">No reviews yet. Be the first.</p>'
    : renderCommentTree(tree, 0);
}

function watchVisibleCommentVotes(list, photoId, uid) {
  return list
    .map((c) => {
      const holder = document.getElementById(`run-cv-${c.id}`);
      if (!holder) return null;
      return watchCommentVotes(photoId, c.id, (byUser) => {
        const counts = aggregateVoteCounts(byUser);
        const mine = myPhotoReaction(uid, byUser);
        holder.innerHTML = reactionButtonsHtml("cv", counts, mine, false);
        bindCommentRow(photoId, c.id, uid, holder);
      });
    })
    .filter(Boolean);
}

function handleCommentReplyClick(e, commentsEl, cardEl) {
  const btn = e.target.closest(".run-comment-reply");
  if (!btn || !commentsEl.contains(btn)) return;
  const pid = btn.getAttribute("data-reply-to");
  const parentIn = cardEl.querySelector(".run-comment-parent");
  const cancel = cardEl.querySelector(".run-comment-cancel-reply");
  const ta = cardEl.querySelector(".run-comment-input");
  if (parentIn) parentIn.value = pid || "";
  if (cancel) cancel.hidden = false;
  ta?.focus();
}

function clearReplyTarget(parentIn, cancel) {
  if (parentIn) parentIn.value = "";
  if (cancel) cancel.hidden = true;
}

async function submitPhotoComment(photoId, ta, parentIn, cancel) {
  if (!(await assertCanUseSocialFeatures())) return;
  const text = ta?.value || "";
  const parentId = parentIn?.value?.trim() || null;
  try {
    await addPhotoComment(photoId, text, parentId || null);
    if (ta) ta.value = "";
    clearReplyTarget(parentIn, cancel);
  } catch (err) {
    alert(err.message || "Could not post.");
  }
}
