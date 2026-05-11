import { escapeHtml } from "./admin-utils.js";
import { CHALLENGE_REPORT_LABELS, formatTs } from "./helpers.js";

export function snapshotRows(snap) {
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    data: docSnap.data(),
  }));
}

export function setTableMessage(tableBody, colspan, message, className = "") {
  if (!tableBody) return;
  const classAttr = className ? ` class="${className}"` : "";
  tableBody.innerHTML = `<tr><td colspan="${colspan}"${classAttr}>${escapeHtml(message)}</td></tr>`;
}

function paintStats({ statsEl }, state) {
  if (!statsEl) return;
  const counts = attemptStatusCounts(state.attempts);
  statsEl.textContent = `${state.reports.length} hunt reports · ${state.users.length} users · ${state.challenges.length} hunts (loaded) · ${state.attempts.length} recent attempts — active ${counts.active} / won ${counts.won} / lost ${counts.lost}`;
}

function attemptStatusCounts(attempts) {
  return attempts.reduce(
    (counts, row) => {
      const status = row.data?.status || row.status;
      if (status === "active") counts.active += 1;
      if (status === "won") counts.won += 1;
      if (status === "lost") counts.lost += 1;
      return counts;
    },
    { active: 0, won: 0, lost: 0 },
  );
}

export function paintReports(elements, state) {
  if (!state.reports.length) {
    setTableMessage(elements.tbReports, 5, "No reports yet.", "admin-muted");
    paintStats(elements, state);
    return;
  }
  if (elements.tbReports) {
    elements.tbReports.innerHTML = state.reports.map(reportRowHtml).join("");
  }
  paintStats(elements, state);
}

function reportRowHtml(row) {
  const report = row.data;
  const view = reportRowView(report);
  return `<tr>
    <td>${escapeHtml(formatTs(report.createdAt))}</td>
    <td class="admin-cell-clip"><a href="#/challenge/${view.challengeId}" class="admin-inline-link" target="_blank" rel="noopener noreferrer">${view.title}</a><br /><span class="admin-mono admin-muted">${view.challengeId}</span></td>
    <td>${view.category}</td>
    <td class="admin-cell-clip" title="${view.details}">${view.details || "—"}</td>
    <td class="admin-mono admin-cell-clip" title="${view.reporterUid}">${view.reporterUid}</td>
  </tr>`;
}

function reportRowView(report) {
  return {
    category: reportCategoryLabel(report),
    challengeId: escapeHtml(report.challengeId || ""),
    details: reportDetailsLabel(report),
    reporterUid: escapeHtml(report.reporterUid || "—"),
    title: reportTitleLabel(report),
  };
}

function reportCategoryLabel(report) {
  return escapeHtml(CHALLENGE_REPORT_LABELS[report.category] || report.category || "—");
}

function reportDetailsLabel(report) {
  return escapeHtml(String(report.details || "").slice(0, 500));
}

function reportTitleLabel(report) {
  return escapeHtml(String(report.challengeTitleSnapshot || "").slice(0, 80) || "—");
}

export function paintUsers(elements, state) {
  const rows = state.users
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map(userRowHtml)
    .join("");
  if (elements.tbUsers) elements.tbUsers.innerHTML = rows;
  paintStats(elements, state);
}

function userRowHtml(row) {
  const user = row.data;
  const uid = escapeHtml(row.id);
  const meritPoints = escapeHtml(String(user.meritPoints ?? 0));
  return `<tr>
    <td class="admin-mono admin-cell-clip" title="${uid}">${uid}</td>
    <td>${escapeHtml(user.displayName || "—")}</td>
    <td class="admin-mono">${escapeHtml(user.usernameNorm || "—")}</td>
    <td>${meritPoints}</td>
    <td>${escapeHtml(formatTs(user.updatedAt))}</td>
    <td>${userStatusBadge(user)}</td>
    <td class="admin-actions-cell">
      <div class="admin-action-stack">
        <button type="button" class="btn btn-ghost btn-tiny" data-admin-user-del data-uid="${uid}">Delete user</button>
        <div class="admin-merit-row">
          <input type="number" min="0" step="1" class="login-field-input admin-merit-input" data-admin-merit-input data-uid="${uid}" value="${meritPoints}" />
          <button type="button" class="btn btn-primary btn-tiny" data-admin-merit-set data-uid="${uid}">Set</button>
        </div>
      </div>
    </td>
  </tr>`;
}

function userStatusBadge(user) {
  const name = String(user.displayName || "").trim();
  const handle = String(user.usernameNorm || "").trim();
  if (!name && !handle) {
    return '<span class="admin-badge admin-badge--muted">no name</span>';
  }
  if (handle) {
    return '<span class="admin-badge admin-badge--ok">registered</span>';
  }
  return '<span class="admin-badge">guest name</span>';
}

export function paintChallenges(elements, state) {
  if (elements.tbChallenges) {
    elements.tbChallenges.innerHTML = state.challenges.map(challengeRowHtml).join("");
  }
  refillHuntSelect(elements.huntSelect, state.challenges);
  paintStats(elements, state);
}

function challengeRowHtml(row) {
  const challenge = row.data;
  const id = escapeHtml(row.id);
  const spots = Array.isArray(challenge.spots) ? challenge.spots.length : 0;
  return `<tr>
    <td class="admin-mono admin-cell-clip"><a href="#/challenge/${id}" class="admin-inline-link">${id}</a></td>
    <td>${escapeHtml(challenge.title || "—")}</td>
    <td class="admin-mono admin-cell-clip" title="${escapeHtml(challenge.createdBy || "")}">${escapeHtml(challenge.createdBy || "—")}</td>
    <td>${escapeHtml(challenge.areaLabel || "—")}</td>
    <td>${spots}</td>
    <td>${escapeHtml(formatTs(challenge.createdAt))}</td>
    <td class="admin-actions-cell">
      <button type="button" class="btn btn-ghost btn-tiny" data-admin-ch-del data-cid="${id}">Delete hunt</button>
    </td>
  </tr>`;
}

function refillHuntSelect(huntSelect, challenges) {
  if (!huntSelect) return;
  const current = huntSelect.value;
  huntSelect.innerHTML =
    '<option value="">Select a hunt…</option>' + huntOptionsHtml(challenges);
  if (current && challenges.some((challenge) => challenge.id === current)) {
    huntSelect.value = current;
  }
}

function huntOptionsHtml(challenges) {
  return challenges
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((row) => {
      const title = String(row.data.title || row.id).slice(0, 80);
      return `<option value="${escapeHtml(row.id)}">${escapeHtml(title)}</option>`;
    })
    .join("");
}

export function paintAttempts(elements, state) {
  if (elements.tbAttempts) {
    elements.tbAttempts.innerHTML = state.attempts.map(attemptRowHtml).join("");
  }
  paintStats(elements, state);
}

function attemptRowHtml(row) {
  const attempt = row.data;
  const status = String(attempt.status || "—");
  const attemptId = escapeHtml(row.id);
  const userId = escapeHtml(attempt.userId || "—");
  const challengeId = escapeHtml(attempt.challengeId || "—");
  return `<tr>
    <td class="admin-mono admin-cell-clip">${attemptId}</td>
    <td class="admin-mono admin-cell-clip" title="${escapeHtml(attempt.userId || "")}">${userId}</td>
    <td class="admin-mono admin-cell-clip"><a href="#/challenge/${escapeHtml(attempt.challengeId || "")}" class="admin-inline-link">${challengeId}</a></td>
    <td><span class="admin-badge ${attemptBadgeClass(status)}">${escapeHtml(status)}</span></td>
    <td>${escapeHtml(formatTs(attempt.startedAt))}</td>
    <td>${escapeHtml(formatTs(attempt.deadlineAt))}</td>
    <td class="admin-actions-cell">
      <button type="button" class="btn btn-ghost btn-tiny" data-admin-at-del data-aid="${attemptId}">Delete</button>
    </td>
  </tr>`;
}

function attemptBadgeClass(status) {
  if (status === "won") return "admin-badge--ok";
  if (status === "active") return "admin-badge--warn";
  if (status === "lost") return "admin-badge--bad";
  return "admin-badge--muted";
}
