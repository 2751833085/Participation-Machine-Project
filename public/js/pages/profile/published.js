import { openAlertModal, openConfirmModal, escapeHtml, deleteUserChallenge, getChallenge, watchUserPublishedChallenges } from "./profile-utils.js";
import { openEditHuntDetailsModal } from "./modals.js";

let publishedUnsub = null;
let publishedClickHandler = null;
let publishedListHost = null;
let publishedSheetKeyHandler = null;

export function closePublishedSheet() {
  if (publishedSheetKeyHandler) {
    document.removeEventListener("keydown", publishedSheetKeyHandler);
    publishedSheetKeyHandler = null;
  }
  const sheet = document.getElementById("profile-published-sheet");
  if (sheet) {
    sheet.hidden = true;
    sheet.setAttribute("aria-hidden", "true");
  }
  delete document.body.dataset.modalOpen;
}

export function openPublishedSheet() {
  const sheet = document.getElementById("profile-published-sheet");
  if (!sheet || !sheet.hidden) return;
  sheet.hidden = false;
  sheet.setAttribute("aria-hidden", "false");
  document.body.dataset.modalOpen = "true";
  publishedSheetKeyHandler = (e) => {
    if (e.key === "Escape") closePublishedSheet();
  };
  document.addEventListener("keydown", publishedSheetKeyHandler);
  document.getElementById("profile-published-sheet-close")?.focus();
}

export function clearPublishedListBindings() {
  if (publishedListHost && publishedClickHandler) {
    publishedListHost.removeEventListener("click", publishedClickHandler);
  }
  publishedClickHandler = null;
  publishedListHost = null;
  if (publishedUnsub) {
    publishedUnsub();
    publishedUnsub = null;
  }
}

function formatPublishedDate(ts) {
  if (!ts || typeof ts.toDate !== "function") return "";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      ts.toDate(),
    );
  } catch {
    return "";
  }
}

export function paintPublishedHuntList(el, docs) {
  if (!el) return;
  if (!docs.length) {
    el.innerHTML =
      '<p class="profile-published-empty">You have not published any hunts yet. Tap <strong>Create</strong> below to add one.</p>';
    return;
  }
  el.innerHTML = `<ul class="profile-published-stack">${docs
    .map((d) => {
      const c = d.data();
      const id = escapeHtml(d.id);
      const title = escapeHtml(c.title || "Untitled hunt");
      const area = escapeHtml(c.areaLabel || "—");
      const n = c.spots?.length ?? 0;
      const mins = c.timeLimitMinutes ?? "?";
      const when = formatPublishedDate(c.createdAt);
      const metaBits = [
        `${n} checkpoint${n === 1 ? "" : "s"} · ${mins} min`,
        when ? `Published ${when}` : "",
      ].filter(Boolean);
      return `<li class="profile-published-row">
        <p class="profile-published-row-title">${title}</p>
        <p class="profile-published-row-meta">${area}</p>
        <p class="profile-published-row-meta">${escapeHtml(metaBits.join(" · "))}</p>
        <div class="profile-published-actions">
          <a class="btn btn-secondary btn-small" href="#/challenge/${id}">View</a>
          <button type="button" class="btn btn-secondary btn-small" data-published-action="edit" data-challenge-id="${id}">Edit details</button>
          <button type="button" class="btn btn-small profile-published-delete" data-published-action="delete" data-challenge-id="${id}">Delete</button>
        </div>
      </li>`;
    })
    .join("")}</ul>`;
}

/**
 * @param {import("firebase/auth").User} user
 * @param {{ signal: AbortSignal }} opts
 */
export function initPublishedHuntsWatch(user, opts) {
  const { signal } = opts;
  clearPublishedListBindings();

  document
    .getElementById("profile-published-open")
    ?.addEventListener("click", openPublishedSheet, { signal });
  document
    .getElementById("profile-published-sheet-close")
    ?.addEventListener("click", closePublishedSheet, { signal });

  publishedListHost = document.getElementById("profile-published-list");
  if (publishedListHost) {
    publishedClickHandler = handlePublishedListClick;
    publishedListHost.addEventListener("click", publishedClickHandler);

    publishedUnsub = watchUserPublishedChallenges(
      user.uid,
      (snap) => paintPublishedSnapshot(publishedListHost, snap),
      (err) => paintPublishedWatchError(publishedListHost, err),
    );
  }
}

async function handlePublishedListClick(e) {
  const t = e.target.closest("[data-published-action]");
  if (!t) return;
  const action = t.dataset.publishedAction;
  const id = t.dataset.challengeId;
  if (!id || !action) return;
  if (action === "edit") await editPublishedHunt(id);
  if (action === "delete") await deletePublishedHunt(id);
}

async function editPublishedHunt(id) {
  const fresh = await getChallenge(id);
  if (!fresh) {
    await openAlertModal({
      title: "Not found",
      message: "This hunt may have been deleted.",
      okText: "OK",
    });
    return;
  }
  await openEditHuntDetailsModal(fresh);
}

async function deletePublishedHunt(id) {
  const ok = await openConfirmModal({
    title: "Delete this hunt?",
    message:
      "This permanently removes the hunt from Tourgo. Stored checkpoint photos for it will be deleted. Shared links will stop working.",
    confirmText: "Delete",
    cancelText: "Cancel",
  });
  if (!ok) return;
  try {
    await deleteUserChallenge(id);
  } catch (err) {
    await openAlertModal({
      title: "Could not delete",
      message: err?.message || "Try again.",
      okText: "OK",
    });
  }
}

function paintPublishedSnapshot(host, snap) {
  paintPublishedHuntList(host, snap.docs);
  const huntsEl = document.querySelector("[data-merit-hunts]");
  if (huntsEl) huntsEl.textContent = String(snap.docs.length);
}

function paintPublishedWatchError(host, err) {
  console.warn("watchUserPublishedChallenges", err);
  if (host) {
    host.innerHTML = `<div class="status-banner error">${escapeHtml(err.message || "Could not load your hunts. If this is new, wait a minute for the database index to finish building, then refresh.")}</div>`;
  }
}
