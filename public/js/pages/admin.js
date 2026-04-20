/**
 * Admin dashboard — session login, Firestore overview, destructive ops via Callable adminPortal.
 */

import { db } from "../firebase-init.js";
import { escapeHtml } from "../lib/utils.js";
import {
  checkAdminCredentials,
  isAdminAuthed,
  setAdminAuthed,
} from "../lib/admin-session.js";
import { syncThemeFromStorage } from "../lib/state.js";
import { adminPortalRequest } from "../services/admin-portal.js";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

let unsubs = [];

/** Labels for `challengeReports.category` (same ids as client report modal). */
const CHALLENGE_REPORT_LABELS = {
  spam_misleading: "Spam / misleading",
  harassment: "Harassment / hate",
  illegal: "Illegal / dangerous",
  image_distressing: "Photos uncomfortable",
  copyright: "Copyright / impersonation",
  other: "Other",
};

function formatTs(ts) {
  if (!ts) return "—";
  try {
    const d = typeof ts.toDate === "function" ? ts.toDate() : ts;
    if (d instanceof Date && !Number.isNaN(d.getTime())) {
      return d.toLocaleString();
    }
  } catch {
    /* ignore */
  }
  return "—";
}

function formatIso(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/** Matches player run feed: 👍 👎 😂 😭 😅 (vote + mood from same vote doc). */
function formatReactionBar(row) {
  const u = Number(row?.voteUp) || 0;
  const d = Number(row?.voteDown) || 0;
  const l = Number(row?.moodLaugh) || 0;
  const c = Number(row?.moodCry) || 0;
  const a = Number(row?.moodAwkward) || 0;
  return `👍 ${u} · 👎 ${d} · 😂 ${l} · 😭 ${c} · 😅 ${a}`;
}

function mountFrame(titleHtml, innerHtml) {
  document.body.className = "admin-app";
  document.body.innerHTML = `
    <div class="admin-layout">
      <header class="admin-top">
        <div class="admin-top-inner">
          <h1 class="admin-title">${titleHtml}</h1>
          <div class="admin-top-actions">
            <a href="#/" class="admin-link-out">← App</a>
          </div>
        </div>
      </header>
      <main class="admin-main" id="admin-main">${innerHtml}</main>
    </div>
  `;
  syncThemeFromStorage();
}

function setPortalErr(msg) {
  const el = document.getElementById("admin-portal-err");
  if (!el) return;
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = msg;
}

function renderLogin() {
  mountFrame(
    "Admin",
    `
    <div class="admin-narrow">
      <p class="admin-lead">Sign in to view and manage user data, hunts, and run photos.</p>
      <p class="admin-lead admin-lead--small">Server actions require the same password in Firebase secret <code class="admin-code">ADMIN_DASHBOARD_PASSWORD</code> (see <code class="admin-code">functions/index.js</code>).</p>
      <div class="card admin-login-card stack">
        <div class="form-field">
          <label for="admin-user">Username</label>
          <input id="admin-user" type="text" class="input-grow" autocomplete="username" />
        </div>
        <div class="form-field">
          <label for="admin-pass">Password</label>
          <input id="admin-pass" type="password" class="input-grow" autocomplete="current-password" />
        </div>
        <p class="admin-login-err" id="admin-login-err" role="alert" hidden></p>
        <button type="button" class="btn btn-primary btn-block" id="admin-login-btn">Sign in</button>
      </div>
    </div>
  `,
  );

  const errEl = document.getElementById("admin-login-err");
  const go = () => {
    const u = document.getElementById("admin-user")?.value?.trim() ?? "";
    const p = document.getElementById("admin-pass")?.value ?? "";
    if (!checkAdminCredentials(u, p)) {
      errEl.hidden = false;
      errEl.textContent = "Invalid username or password.";
      return;
    }
    setAdminAuthed(true, p);
    renderDashboard();
  };

  document.getElementById("admin-login-btn")?.addEventListener("click", go);
  document.getElementById("admin-pass")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") go();
  });
}

function renderHuntSocialPhotos(photos) {
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
            <span class="admin-soc-votes admin-reaction-bar" title="Reactions on this comment">${escapeHtml(formatReactionBar(c))}</span>
          </div>
          <p class="admin-soc-comment-text">${escapeHtml(c.text || "")}</p>
          <div class="admin-soc-actions">
            <button type="button" class="btn btn-ghost btn-tiny" data-admin-del-comment data-photo-id="${escapeHtml(p.id)}" data-comment-id="${escapeHtml(c.id)}">Delete comment</button>
          </div>
          <div class="admin-staff-reply-box" data-photo-id="${escapeHtml(p.id)}" data-parent="${escapeHtml(c.id)}">
            <textarea class="input-grow admin-staff-reply-text" rows="2" placeholder="Reply as administrator"></textarea>
            <button type="button" class="btn btn-primary btn-tiny" data-admin-post-reply>Send reply</button>
          </div>
        </li>`,
        )
        .join("");

      return `
      <article class="admin-photo-card" data-photo-id="${escapeHtml(p.id)}">
        <div class="admin-photo-card-top">
          <a href="${escapeHtml(p.imageUrl)}" target="_blank" rel="noopener noreferrer" class="admin-photo-thumb-link">
            <img class="admin-photo-thumb" src="${escapeHtml(p.imageUrl)}" alt="" loading="lazy" />
          </a>
          <div class="admin-photo-card-meta">
            <p class="admin-mono admin-photo-meta-line">Photo <strong>${escapeHtml(p.id)}</strong></p>
            <p class="admin-photo-meta-line">By UID <span class="admin-mono">${escapeHtml(p.userId || "—")}</span> · ${escapeHtml(formatIso(p.createdAt))}</p>
            <p class="admin-photo-reactions admin-reaction-bar" title="Player reactions on this photo">${escapeHtml(photoVotes)}</p>
            <button type="button" class="btn btn-ghost btn-small" data-admin-del-photo data-photo-id="${escapeHtml(p.id)}">Delete photo + comments</button>
          </div>
        </div>
        <p class="admin-h3 admin-soc-h3">Comments</p>
        <ul class="admin-soc-list">${commentsHtml || '<li class="admin-muted">No comments.</li>'}</ul>
        <div class="admin-staff-reply-box admin-staff-reply-box--root" data-photo-id="${escapeHtml(p.id)}" data-parent="">
          <textarea class="input-grow admin-staff-reply-text" rows="2" placeholder="Official comment (shown as administrator)"></textarea>
          <button type="button" class="btn btn-primary btn-tiny" data-admin-post-reply>Post</button>
        </div>
      </article>`;
    })
    .join("");
}

function renderDashboard() {
  mountFrame(
    "Admin · Dashboard",
    `
    <p class="admin-portal-err" id="admin-portal-err" role="alert" hidden></p>
    <div class="admin-toolbar">
      <button type="button" class="btn btn-ghost" id="admin-logout">Sign out admin</button>
      <p class="admin-stats" id="admin-stats-line">Loading…</p>
    </div>
    <section class="admin-section">
      <h2 class="admin-h2">Hunt reports (Open hunts)</h2>
      <p class="admin-help">Submitted from the home feed \u26A0\uFE0E button. Reporter UID is the signed-in user who filed the report.</p>
      <div class="admin-table-wrap">
        <table class="admin-table" id="admin-tb-reports">
          <thead><tr>
            <th>Time</th><th>Hunt</th><th>Category</th><th>Details</th><th>Reporter UID</th>
          </tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </section>
    <section class="admin-section">
      <h2 class="admin-h2">Users</h2>
      <p class="admin-help">Delete removes Firestore profile, handle, attempts, run photos, and the Firebase Auth account.</p>
      <div class="admin-table-wrap">
        <table class="admin-table" id="admin-tb-users">
          <thead><tr>
            <th>UID</th><th>Display name</th><th>Handle</th><th>Merits</th><th>Updated</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </section>
    <section class="admin-section">
      <h2 class="admin-h2">Hunts (challenges)</h2>
      <p class="admin-help">Delete removes the hunt, all attempts, run photos (and Storage files), and comments.</p>
      <div class="admin-table-wrap">
        <table class="admin-table" id="admin-tb-challenges">
          <thead><tr>
            <th>ID</th><th>Title</th><th>Creator UID</th><th>Area</th><th>CPs</th><th>Created</th><th>Actions</th>
          </tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </section>
    <section class="admin-section admin-section--social">
      <h2 class="admin-h2">Hunt photos &amp; comments</h2>
      <p class="admin-help">Load photos for a hunt. Staff posts appear to players as <strong>administrator</strong>.</p>
      <div class="admin-social-bar stack">
        <div class="admin-flex-row">
          <label class="admin-inline-label" for="admin-hunt-social-select">Hunt</label>
          <select id="admin-hunt-social-select" class="input-grow admin-select-wide">
            <option value="">Select a hunt…</option>
          </select>
          <button type="button" class="btn btn-primary" id="admin-load-social">Load</button>
        </div>
      </div>
      <div id="admin-social-root" class="admin-social-root"></div>
    </section>
    <section class="admin-section">
      <h2 class="admin-h2">Attempts (recent)</h2>
      <p class="admin-help">Delete removes the attempt and its run photos (and Storage).</p>
      <div class="admin-table-wrap">
        <table class="admin-table" id="admin-tb-attempts">
          <thead><tr>
            <th>ID</th><th>User</th><th>Hunt</th><th>Status</th><th>Started</th><th>Deadline</th><th>Actions</th>
          </tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </section>
  `,
  );

  document.getElementById("admin-logout")?.addEventListener("click", () => {
    setAdminAuthed(false);
    renderLogin();
  });

  const tbUsers = document.querySelector("#admin-tb-users tbody");
  const tbReports = document.querySelector("#admin-tb-reports tbody");
  const tbCh = document.querySelector("#admin-tb-challenges tbody");
  const tbAt = document.querySelector("#admin-tb-attempts tbody");
  const statsEl = document.getElementById("admin-stats-line");
  const huntSelect = document.getElementById("admin-hunt-social-select");
  const socialRoot = document.getElementById("admin-social-root");

  const state = { users: [], challenges: [], attempts: [], reports: [] };

  function refillHuntSelect() {
    if (!huntSelect) return;
    const cur = huntSelect.value;
    huntSelect.innerHTML =
      '<option value="">Select a hunt…</option>' +
      state.challenges
        .slice()
        .sort((a, b) => (a.id < b.id ? -1 : 1))
        .map((row) => {
          const t = String(row.data.title || row.id).slice(0, 80);
          return `<option value="${escapeHtml(row.id)}">${escapeHtml(t)}</option>`;
        })
        .join("");
    if (cur && state.challenges.some((c) => c.id === cur)) {
      huntSelect.value = cur;
    }
  }

  async function loadSocialForSelected() {
    const challengeId = huntSelect?.value || "";
    setPortalErr("");
    if (!challengeId) {
      setPortalErr("Choose a hunt first.");
      return;
    }
    if (socialRoot) {
      socialRoot.innerHTML = '<p class="admin-muted">Loading…</p>';
    }
    try {
      const data = await adminPortalRequest("listRunPhotosForChallenge", {
        challengeId,
      });
      renderHuntSocialPhotos(data?.photos || []);
    } catch (e) {
      const code = e?.code || "";
      let msg = e?.message || "Could not load photos.";
      if (String(code).includes("permission-denied")) {
        msg =
          "Unauthorized — set Functions secret ADMIN_DASHBOARD_PASSWORD to match this admin password, deploy functions, then sign in again.";
      }
      if (String(code).includes("not-found")) {
        msg =
          "adminPortal function not found. Deploy: firebase deploy --only functions";
      }
      setPortalErr(msg);
      if (socialRoot) socialRoot.innerHTML = "";
    }
  }

  document.getElementById("admin-load-social")?.addEventListener("click", () => {
    void loadSocialForSelected();
  });

  document.getElementById("admin-main")?.addEventListener("click", async (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;

    if (t.matches("[data-admin-del-photo]")) {
      const photoId = t.getAttribute("data-photo-id");
      if (!photoId || !confirm(`Delete photo ${photoId} and all its comments?`)) return;
      setPortalErr("");
      try {
        await adminPortalRequest("deleteRunPhoto", { photoId });
        await loadSocialForSelected();
      } catch (err) {
        setPortalErr(err?.message || "Delete failed.");
      }
      return;
    }

    if (t.matches("[data-admin-del-comment]")) {
      const photoId = t.getAttribute("data-photo-id");
      const commentId = t.getAttribute("data-comment-id");
      if (!photoId || !commentId || !confirm("Delete this comment?")) return;
      setPortalErr("");
      try {
        await adminPortalRequest("deleteComment", { photoId, commentId });
        await loadSocialForSelected();
      } catch (err) {
        setPortalErr(err?.message || "Delete failed.");
      }
      return;
    }

    if (t.matches("[data-admin-post-reply]")) {
      const box = t.closest(".admin-staff-reply-box");
      if (!(box instanceof HTMLElement)) return;
      const photoId = box.dataset.photoId;
      const parentCommentId = box.dataset.parent || "";
      const ta = box.querySelector(".admin-staff-reply-text");
      const text = ta && "value" in ta ? String(ta.value).trim() : "";
      if (!photoId || text.length < 1) {
        setPortalErr("Enter comment text.");
        return;
      }
      setPortalErr("");
      try {
        await adminPortalRequest("postAdminComment", {
          photoId,
          text,
          ...(parentCommentId ? { parentCommentId } : {}),
        });
        if (ta && "value" in ta) ta.value = "";
        await loadSocialForSelected();
      } catch (err) {
        setPortalErr(err?.message || "Post failed.");
      }
    }
  });

  function paintStats() {
    const active = state.attempts.filter((a) => a.status === "active").length;
    const won = state.attempts.filter((a) => a.status === "won").length;
    const lost = state.attempts.filter((a) => a.status === "lost").length;
    statsEl.textContent = `${state.reports.length} hunt reports · ${state.users.length} users · ${state.challenges.length} hunts (loaded) · ${state.attempts.length} recent attempts — active ${active} / won ${won} / lost ${lost}`;
  }

  function paintReports() {
    if (!tbReports) return;
    if (!state.reports.length) {
      tbReports.innerHTML =
        '<tr><td colspan="5" class="admin-muted">No reports yet.</td></tr>';
      paintStats();
      return;
    }
    tbReports.innerHTML = state.reports
      .map((row) => {
        const r = row.data;
        const cat = escapeHtml(
          CHALLENGE_REPORT_LABELS[r.category] || r.category || "—",
        );
        const hid = escapeHtml(r.challengeId || "");
        const title = escapeHtml(
          String(r.challengeTitleSnapshot || "").slice(0, 80) || "—",
        );
        const details = escapeHtml(String(r.details || "").slice(0, 500));
        const uid = escapeHtml(r.reporterUid || "—");
        return `<tr>
          <td>${escapeHtml(formatTs(r.createdAt))}</td>
          <td class="admin-cell-clip"><a href="#/challenge/${hid}" class="admin-inline-link" target="_blank" rel="noopener noreferrer">${title}</a><br /><span class="admin-mono admin-muted">${hid}</span></td>
          <td>${cat}</td>
          <td class="admin-cell-clip" title="${details}">${details || "—"}</td>
          <td class="admin-mono admin-cell-clip" title="${uid}">${uid}</td>
        </tr>`;
      })
      .join("");
    paintStats();
  }

  function userStatusRow(d) {
    const name = String(d.displayName || "").trim();
    const norm = String(d.usernameNorm || "").trim();
    if (!name && !norm) return '<span class="admin-badge admin-badge--muted">no name</span>';
    if (norm) return '<span class="admin-badge admin-badge--ok">registered</span>';
    return '<span class="admin-badge">guest name</span>';
  }

  async function onDeleteUser(uid) {
    if (
      !confirm(
        `PERMANENTLY delete user ${uid} (Auth + Firestore + attempts + photos)?`,
      )
    ) {
      return;
    }
    setPortalErr("");
    try {
      await adminPortalRequest("deleteUser", { uid });
      setPortalErr("");
    } catch (e) {
      setPortalErr(e?.message || "deleteUser failed.");
    }
  }

  async function onSetMerits(uid, raw) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      setPortalErr("Merits must be a non-negative number.");
      return;
    }
    setPortalErr("");
    try {
      await adminPortalRequest("setUserMeritPoints", { uid, meritPoints: n });
    } catch (e) {
      setPortalErr(e?.message || "setUserMeritPoints failed.");
    }
  }

  function paintUsers() {
    tbUsers.innerHTML = state.users
      .slice()
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((row) => {
        const d = row.data;
        const uid = escapeHtml(row.id);
        return `<tr>
          <td class="admin-mono admin-cell-clip" title="${uid}">${uid}</td>
          <td>${escapeHtml(d.displayName || "—")}</td>
          <td class="admin-mono">${escapeHtml(d.usernameNorm || "—")}</td>
          <td>${escapeHtml(String(d.meritPoints ?? 0))}</td>
          <td>${escapeHtml(formatTs(d.updatedAt))}</td>
          <td>${userStatusRow(d)}</td>
          <td class="admin-actions-cell">
            <div class="admin-action-stack">
              <button type="button" class="btn btn-ghost btn-tiny" data-admin-user-del data-uid="${uid}">Delete user</button>
              <div class="admin-merit-row">
                <input type="number" min="0" step="1" class="input-grow admin-merit-input" data-admin-merit-input data-uid="${uid}" value="${escapeHtml(String(d.meritPoints ?? 0))}" />
                <button type="button" class="btn btn-primary btn-tiny" data-admin-merit-set data-uid="${uid}">Set merits</button>
              </div>
            </div>
          </td>
        </tr>`;
      })
      .join("");
    paintStats();
  }

  async function onDeleteChallenge(challengeId) {
    if (
      !confirm(
        `PERMANENTLY delete hunt ${challengeId} and all attempts, photos, and Storage files?`,
      )
    ) {
      return;
    }
    setPortalErr("");
    try {
      await adminPortalRequest("deleteChallenge", { challengeId });
    } catch (e) {
      setPortalErr(e?.message || "deleteChallenge failed.");
    }
  }

  function paintChallenges() {
    tbCh.innerHTML = state.challenges
      .map((row) => {
        const c = row.data;
        const spots = Array.isArray(c.spots) ? c.spots.length : 0;
        const id = escapeHtml(row.id);
        return `<tr>
          <td class="admin-mono admin-cell-clip"><a href="#/challenge/${id}" class="admin-inline-link">${id}</a></td>
          <td>${escapeHtml(c.title || "—")}</td>
          <td class="admin-mono admin-cell-clip" title="${escapeHtml(c.createdBy || "")}">${escapeHtml(c.createdBy || "—")}</td>
          <td>${escapeHtml(c.areaLabel || "—")}</td>
          <td>${spots}</td>
          <td>${escapeHtml(formatTs(c.createdAt))}</td>
          <td class="admin-actions-cell">
            <button type="button" class="btn btn-ghost btn-tiny" data-admin-ch-del data-cid="${id}">Delete hunt</button>
          </td>
        </tr>`;
      })
      .join("");
    refillHuntSelect();
    paintStats();
  }

  async function onDeleteAttempt(attemptId) {
    if (!confirm(`Delete attempt ${attemptId} and its run photos?`)) return;
    setPortalErr("");
    try {
      await adminPortalRequest("deleteAttempt", { attemptId });
    } catch (e) {
      setPortalErr(e?.message || "deleteAttempt failed.");
    }
  }

  function paintAttempts() {
    tbAt.innerHTML = state.attempts
      .map((row) => {
        const a = row.data;
        const st = String(a.status || "—");
        let badge = "admin-badge--muted";
        if (st === "won") badge = "admin-badge--ok";
        if (st === "active") badge = "admin-badge--warn";
        if (st === "lost") badge = "admin-badge--bad";
        const aid = escapeHtml(row.id);
        return `<tr>
          <td class="admin-mono admin-cell-clip">${aid}</td>
          <td class="admin-mono admin-cell-clip" title="${escapeHtml(a.userId || "")}">${escapeHtml(a.userId || "—")}</td>
          <td class="admin-mono admin-cell-clip"><a href="#/challenge/${escapeHtml(a.challengeId || "")}" class="admin-inline-link">${escapeHtml(a.challengeId || "—")}</a></td>
          <td><span class="admin-badge ${badge}">${escapeHtml(st)}</span></td>
          <td>${escapeHtml(formatTs(a.startedAt))}</td>
          <td>${escapeHtml(formatTs(a.deadlineAt))}</td>
          <td class="admin-actions-cell">
            <button type="button" class="btn btn-ghost btn-tiny" data-admin-at-del data-aid="${aid}">Delete</button>
          </td>
        </tr>`;
      })
      .join("");
    paintStats();
  }

  tbUsers.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.matches("[data-admin-user-del]")) {
      const uid = t.getAttribute("data-uid");
      if (uid) void onDeleteUser(uid);
      return;
    }
    if (t.matches("[data-admin-merit-set]")) {
      const uid = t.getAttribute("data-uid");
      if (!uid) return;
      const stack = t.closest(".admin-action-stack");
      const inp = stack?.querySelector("[data-admin-merit-input]");
      const raw = inp && "value" in inp ? inp.value : "0";
      void onSetMerits(uid, raw);
    }
  });

  tbCh.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.matches("[data-admin-ch-del]")) {
      const cid = t.getAttribute("data-cid");
      if (cid) void onDeleteChallenge(cid);
    }
  });

  tbAt.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.matches("[data-admin-at-del]")) {
      const aid = t.getAttribute("data-aid");
      if (aid) void onDeleteAttempt(aid);
    }
  });

  unsubs.push(
    onSnapshot(
      query(
        collection(db, "challengeReports"),
        orderBy("createdAt", "desc"),
        limit(100),
      ),
      (snap) => {
        state.reports = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          data: docSnap.data(),
        }));
        paintReports();
      },
      () => {
        if (tbReports) {
          tbReports.innerHTML =
            '<tr><td colspan="5">Could not load hunt reports (check Firestore index on <code>challengeReports.createdAt</code>).</td></tr>';
        }
      },
    ),
  );

  unsubs.push(
    onSnapshot(
      collection(db, "users"),
      (snap) => {
        state.users = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          data: docSnap.data(),
        }));
        paintUsers();
      },
      () => {
        tbUsers.innerHTML =
          '<tr><td colspan="7">Could not load users (check rules / network).</td></tr>';
      },
    ),
  );

  unsubs.push(
    onSnapshot(
      query(
        collection(db, "challenges"),
        orderBy("createdAt", "desc"),
        limit(80),
      ),
      (snap) => {
        state.challenges = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          data: docSnap.data(),
        }));
        paintChallenges();
      },
      () => {
        tbCh.innerHTML =
          '<tr><td colspan="7">Could not load challenges. If this is new, create a Firestore index for <code>createdAt</code> on <code>challenges</code>.</td></tr>';
      },
    ),
  );

  unsubs.push(
    onSnapshot(
      query(
        collection(db, "attempts"),
        orderBy("startedAt", "desc"),
        limit(150),
      ),
      (snap) => {
        state.attempts = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          data: docSnap.data(),
        }));
        paintAttempts();
      },
      () => {
        tbAt.innerHTML =
          '<tr><td colspan="7">Could not load attempts. Add a single-field index on <code>startedAt</code> for <code>attempts</code> if prompted.</td></tr>';
      },
    ),
  );
}

export function render() {
  if (!isAdminAuthed()) {
    renderLogin();
    return;
  }
  renderDashboard();
}

export function cleanup() {
  unsubs.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
  unsubs = [];
}
