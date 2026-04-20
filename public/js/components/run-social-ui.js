/**
 * DOM helpers for in-run shared photo feed (reactions + threaded comments).
 */

import { auth, db } from "../firebase-init.js";
import { openAlertModal } from "./modal.js";
import { escapeHtml } from "../lib/utils.js";
import { isGuestBrowsing, promptGuestNeedsSignIn } from "../services/auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import {
  addPhotoComment,
  aggregateVoteCounts,
  myPhotoReaction,
  setMyCommentVote,
  setMyPhotoVote,
  watchCommentVotes,
  watchPhotoComments,
  watchPhotoVotes,
} from "../services/run-social.js";

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
    <div class="run-react-row" role="group" aria-label="Reactions">
      <button type="button" class="run-react-btn${upA}" data-${prefix}-act="vote-up"${d}>👍 <span class="run-react-n">${counts.up}</span></button>
      <button type="button" class="run-react-btn${dnA}" data-${prefix}-act="vote-down"${d}>👎 <span class="run-react-n">${counts.down}</span></button>
      <button type="button" class="run-react-btn${lA}" data-${prefix}-act="mood-laugh"${d}>😂 <span class="run-react-n">${counts.mood.laugh}</span></button>
      <button type="button" class="run-react-btn${cA}" data-${prefix}-act="mood-cry"${d}>😭 <span class="run-react-n">${counts.mood.cry}</span></button>
      <button type="button" class="run-react-btn${aA}" data-${prefix}-act="mood-awkward"${d}>😅 <span class="run-react-n">${counts.mood.awkward}</span></button>
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
    .map((c) => {
      const pad = depth ? ` style="margin-left:${Math.min(depth, 4) * 0.75}rem"` : "";
      const staff = c.userId === ADMIN_PORTAL_UID ? " run-comment--staff" : "";
      return `
      <div class="run-comment${staff}"${pad} data-comment-id="${escapeHtml(c.id)}">
        <div class="run-comment-head">
          <strong>${escapeHtml(c.authorName || "Player")}</strong>
          <button type="button" class="btn btn-ghost btn-tiny run-comment-reply" data-reply-to="${escapeHtml(c.id)}">Reply</button>
        </div>
        <p class="run-comment-text">${escapeHtml(c.text)}</p>
        <div class="run-comment-reactions" id="run-cv-${escapeHtml(c.id)}"></div>
        ${c.replies?.length ? renderCommentTree(c.replies, depth + 1) : ""}
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
        if (act === "vote-up") {
          await setMyPhotoVote(photoId, { vote: mine.vote === "up" ? "" : "up" });
        } else if (act === "vote-down") {
          await setMyPhotoVote(photoId, { vote: mine.vote === "down" ? "" : "down" });
        } else if (act === "mood-laugh") {
          await setMyPhotoVote(photoId, { mood: mine.mood === "laugh" ? "" : "laugh" });
        } else if (act === "mood-cry") {
          await setMyPhotoVote(photoId, { mood: mine.mood === "cry" ? "" : "cry" });
        } else if (act === "mood-awkward") {
          await setMyPhotoVote(photoId, { mood: mine.mood === "awkward" ? "" : "awkward" });
        }
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
        if (act === "vote-up") {
          await setMyCommentVote(photoId, commentId, {
            vote: mine.vote === "up" ? "" : "up",
          });
        } else if (act === "vote-down") {
          await setMyCommentVote(photoId, commentId, {
            vote: mine.vote === "down" ? "" : "down",
          });
        } else if (act === "mood-laugh") {
          await setMyCommentVote(photoId, commentId, {
            mood: mine.mood === "laugh" ? "" : "laugh",
          });
        } else if (act === "mood-cry") {
          await setMyCommentVote(photoId, commentId, {
            mood: mine.mood === "cry" ? "" : "cry",
          });
        } else if (act === "mood-awkward") {
          await setMyCommentVote(photoId, commentId, {
            mood: mine.mood === "awkward" ? "" : "awkward",
          });
        }
      } catch (err) {
        alert(err.message || "Could not update.");
      }
    });
  });
}

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
    <article class="run-photo-card" data-photo-id="${escapeHtml(photo.id)}">
      <div class="run-photo-card-head">
        <span class="badge ${mine ? "run-photo-mine" : ""}">${label}</span>
        ${cp}
      </div>
      <div class="run-photo-img-wrap">
        <img src="${escapeHtml(photo.imageUrl)}" alt="" loading="lazy" class="run-photo-img" />
      </div>
      ${reactionButtonsHtml("ph", voteCounts, myReaction, false)}
      <div class="run-photo-comments" data-comments-for="${escapeHtml(photo.id)}"></div>
      <div class="run-photo-comment-compose">
        <label class="sr-only" for="run-cmt-${escapeHtml(photo.id)}">Add a comment</label>
        <textarea id="run-cmt-${escapeHtml(photo.id)}" class="input-grow run-comment-input" rows="2" maxlength="500" placeholder="Write a comment…"></textarea>
        <input type="hidden" class="run-comment-parent" value="" aria-hidden="true" />
        <div class="run-comment-actions">
          <button type="button" class="btn btn-ghost btn-small run-comment-cancel-reply" hidden>Cancel reply</button>
          <button type="button" class="btn btn-primary btn-small run-comment-send">Post</button>
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
    watchPhotoVotes(photoId, (byUser) => {
      const counts = aggregateVoteCounts(byUser);
      const mine = myPhotoReaction(uid, byUser);
      const row = cardEl.querySelector(".run-react-row");
      if (row) {
        row.outerHTML = reactionButtonsHtml("ph", counts, mine, false);
        bindPhotoRow(cardEl, photoId, uid);
      }
    }),
  );

  const commentsEl = cardEl.querySelector(`[data-comments-for="${photoId}"]`);
  cleanups.push(
    watchPhotoComments(photoId, (list) => {
      commentVoteUnsubs.forEach((u) => u());
      commentVoteUnsubs = [];
      const tree = nestComments(list);
      commentsEl.innerHTML =
        tree.length === 0
          ? '<p class="run-comments-empty">No comments yet.</p>'
          : renderCommentTree(tree, 0);

      list.forEach((c) => {
        const holder = document.getElementById(`run-cv-${c.id}`);
        if (!holder) return;
        const unsub = watchCommentVotes(photoId, c.id, (byUser) => {
          const counts = aggregateVoteCounts(byUser);
          const mine = myPhotoReaction(uid, byUser);
          holder.innerHTML = reactionButtonsHtml("cv", counts, mine, false);
          bindCommentRow(photoId, c.id, uid, holder);
        });
        commentVoteUnsubs.push(unsub);
      });
    }),
  );

  commentsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".run-comment-reply");
    if (!btn || !commentsEl.contains(btn)) return;
    const pid = btn.getAttribute("data-reply-to");
    const parentIn = cardEl.querySelector(".run-comment-parent");
    const cancel = cardEl.querySelector(".run-comment-cancel-reply");
    const ta = cardEl.querySelector(".run-comment-input");
    if (parentIn) parentIn.value = pid || "";
    if (cancel) cancel.hidden = false;
    ta?.focus();
  });

  const ta = cardEl.querySelector(".run-comment-input");
  const parentIn = cardEl.querySelector(".run-comment-parent");
  const cancel = cardEl.querySelector(".run-comment-cancel-reply");
  cancel?.addEventListener("click", () => {
    if (parentIn) parentIn.value = "";
    if (cancel) cancel.hidden = true;
  });
  cardEl.querySelector(".run-comment-send")?.addEventListener("click", async () => {
    if (!(await assertCanUseSocialFeatures())) return;
    const text = ta?.value || "";
    const parentId = parentIn?.value?.trim() || null;
    try {
      await addPhotoComment(photoId, text, parentId || null);
      if (ta) ta.value = "";
      if (parentIn) parentIn.value = "";
      if (cancel) cancel.hidden = true;
    } catch (err) {
      alert(err.message || "Could not post.");
    }
  });

  return () => {
    commentVoteUnsubs.forEach((u) => u());
    cleanups.forEach((u) => u());
  };
}
