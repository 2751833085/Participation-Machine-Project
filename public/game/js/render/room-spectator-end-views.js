/**
 * Friends — captured spectator shell + end screen.
 */
import { escapeHtml, fmtAgo, fmtClock, gameNow, getInitial, state, tsMs } from "./render-room-runtime.js";
import { renderCapturedOverlay } from "./captured-overlay-views.js";
import { getMyMember, huntRemainMs } from "./helpers.js";

export function renderSpectator() {
  const me = getMyMember();
  if (!state.capturedAcknowledged) return renderCapturedOverlay(me);

  return `
    <div class="hs-shell has-dock">
      <div class="hs-game">
        ${renderSpectatorHeader(me)}
        ${renderSpectatorBody(me)}
        ${renderSpectatorDock()}
      </div>
    </div>
  `;
}

function renderSpectatorHeader(me) {
  return `
    <div class="hs-game-top">
      <div class="hs-role-pill spectator">
        <span class="lbl">SPECTATOR</span>
        <span class="val">${escapeHtml(me.name)}</span>
      </div>
      <div class="hs-timer">
        <span class="lbl">Hunt</span>
        <span class="val" data-live="hunt-remain">${escapeHtml(fmtClock(huntRemainMs(state.room)))}</span>
      </div>
      <div class="hs-meta-tag">Caught<b data-live="caught-elapsed">${escapeHtml(fmtClock(gameNow() - tsMs(me.capturedAt)))}</b></div>
    </div>
  `;
}

function renderSpectatorBody(me) {
  if (state.specTab === "stats") return renderSpecStats(me);
  if (state.specTab === "all") return renderSpecChat();
  if (state.specTab === "exit") return renderSpecExit();
  return "";
}

function renderSpectatorDock() {
  const tabs = [
    { id: "stats", label: "Stats", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l3-2 4 3 5-5 6 5"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>` },
    { id: "all", label: "All chat", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/></svg>` },
    { id: "exit", label: "Exit", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>` },
  ];
  return `
    <nav class="hs-dock">
      <div class="hs-dock-inner cols-3">
        ${tabs.map((t) => `
          <button type="button" class="hs-dock-tab role-spectator ${t.id === state.specTab ? "is-active" : ""}" data-spec-tab="${t.id}">
            ${t.icon}
            <span>${t.label}</span>
          </button>
        `).join("")}
      </div>
    </nav>
  `;
}

function renderSpecStats(me) {
  const captor = state.captures.find((c) => c.targetUid === me.uid);
  const aliveRunners = state.members.filter((m) => m.team === "runner" && !m.capturedAt);
  const totalRunners = state.members.filter((m) => m.team === "runner").length;
  return `
    <div class="hs-game-body">
      <div class="hs-spec-hero">
        <span class="kicker">You were caught</span>
        <span class="name">Caught by <em>${escapeHtml(captor?.captorName || "?")}</em></span>
        <span class="meta">You held out for ${escapeHtml(fmtClock(tsMs(me.capturedAt) - tsMs(state.room.huntStartedAt)))}.</span>
      </div>
      ${renderSpecStatRow(aliveRunners.length, totalRunners)}
      ${renderCaptureLog()}
    </div>
  `;
}

function renderSpecStatRow(aliveCount, totalCount) {
  return `
    <div class="hs-stat-row">
      <div class="tile"><span class="lbl">Runners left</span><span class="val">${aliveCount} / ${totalCount}</span></div>
      <div class="tile"><span class="lbl">Hunters</span><span class="val">${state.members.filter((m) => m.team === "hunter").length}</span></div>
      <div class="tile alert"><span class="lbl">Time left</span><span class="val">${escapeHtml(fmtClock(huntRemainMs(state.room)))}</span></div>
    </div>
  `;
}

function renderCaptureLog() {
  return `
    <div class="hs-cap-log">
      <h5>Capture log · live</h5>
      <ul>
        ${state.captures.slice().reverse().map(renderCaptureRow).join("") || `<li><time>—</time><span>No captures yet</span></li>`}
      </ul>
    </div>
  `;
}

function renderCaptureRow(c) {
  return `
    <li>
      <time>${escapeHtml(fmtAgo(gameNow() - tsMs(c.capturedAt)))}</time>
      <span><b class="hs-capture-name">${escapeHtml(c.captorName)}</b> caught <b>${escapeHtml(c.targetName)}</b></span>
    </li>
  `;
}

function renderSpecChat() {
  return `
    <div class="hs-game-body">
      ${renderHistoryBlock("Hunters", "h", "hunters")}
      ${renderHistoryBlock("Runners", "r", "runners")}
      ${renderHistoryBlock("Lobby", "", "all")}
    </div>
  `;
}

function renderHistoryBlock(title, tagClass, scope) {
  const rows = state.chats.filter((c) => (c.scope || "all") === scope);
  return `
    <div class="hs-history-block">
      <h5><span class="tag ${tagClass}">${escapeHtml(title)}</span> Team chat</h5>
      ${rows.length ? rows.map((c) => `
        <div class="row"><time>${escapeHtml(fmtClock(gameNow() - tsMs(c.sentAt)))}</time><span class="text"><span class="nm ${tagClass}">${escapeHtml(c.senderName)}</span> ${escapeHtml(c.text)}</span></div>
      `).join("") : `<div class="hs-empty-note">No messages</div>`}
    </div>
  `;
}

function renderSpecExit() {
  return `
    <div class="hs-spec-exit-stage">
      <div class="crest">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
      </div>
      <h3>Leave the game?</h3>
      <p>Your stats are already saved. Stay to watch the rest, or leave now and skip the recap.</p>
      <div class="group">
        <button type="button" class="hs-btn hs-btn-dark" data-spec-tab="stats">Stay and spectate</button>
        <button type="button" class="hs-btn hs-btn-danger" data-action="leave-room">Leave now</button>
      </div>
    </div>
  `;
}

export function renderEnd() {
  const room = state.room;
  const winner = room.winner; // "hunters" | "runners"
  const ranked = rankedEndMembers();
  const mvp = ranked.length ? ranked[0] : null;
  const finalTime = tsMs(room.endedAt) ? fmtClock(tsMs(room.endedAt) - tsMs(room.huntStartedAt)) : fmtClock(0);

  return `
    <div class="hs-end ${winner === "hunters" ? "hunters" : "runners"}">
      ${renderEndHero(winner, finalTime)}
      ${renderEndStats(ranked, mvp)}
      ${renderEndActions()}
    </div>
  `;
}

function renderEndHero(winner, finalTime) {
  const won = didCurrentPlayerWin(winner);
  return `
    <div class="hero">
      <div class="crest">${winner === "hunters" ? "H" : "R"}</div>
      <div class="kicker">Final · ${escapeHtml(finalTime)}</div>
      <h1><em>${winner === "hunters" ? "Hunters" : "Runners"}</em><br>Win</h1>
      <p>${winner === "hunters" ? "All Runners caught." : "Time's up — Runners survived."} ${won ? "You won." : ""}</p>
    </div>
  `;
}

function didCurrentPlayerWin(winner) {
  const me = getMyMember();
  const myTeam = me?.team;
  return (winner === "hunters" && myTeam === "hunter") || (winner === "runners" && myTeam === "runner" && !me.capturedAt);
}

function renderEndStats(ranked, mvp) {
  return `
    <div class="hs-end-stats">
      <h4>Leaderboard</h4>
      ${ranked.map((member) => renderEndRankRow(member, mvp)).join("")}
    </div>
  `;
}

function renderEndActions() {
  return `
    <div class="hs-end-actions">
      <button type="button" class="hs-btn ghost" data-action="leave-room">Back</button>
      <button type="button" class="hs-btn primary" data-action="leave-room">New game →</button>
    </div>
  `;
}

function rankedEndMembers() {
  return [...state.members].map(withCaptureCount).sort(compareEndMembers);
}

function withCaptureCount(member) {
  const captures = state.captures.filter((c) => c.captorUid === member.uid).length;
  return { ...member, captures };
}

function compareEndMembers(a, b) {
  if (a.team === "hunter" && b.team !== "hunter") return -1;
  if (a.team !== "hunter" && b.team === "hunter") return 1;
  return b.captures - a.captures;
}

function renderEndRankRow(member, mvp) {
  const isMvp = mvp && member.uid === mvp.uid && member.captures > 0;
  return `
    <div class="row ${isMvp ? "mvp" : ""}">
      <div class="hs-av hs-av-sm ${member.avatarReady ? "has-photo" : ""}">
        ${renderEndAvatar(member)}
      </div>
      <div class="name">${escapeHtml(member.name)}${renderMvpBadge(isMvp)}</div>
      <div class="role">${escapeHtml(endMemberRole(member))}${endCaughtLabel(member)}</div>
      <div class="score">${escapeHtml(String(endMemberScore(member)))}</div>
    </div>
  `;
}

function renderEndAvatar(member) {
  return member.avatarUrl
    ? `<img src="${escapeHtml(member.avatarUrl)}" alt="" />`
    : `<span>${escapeHtml(getInitial(member.name))}</span>`;
}

function renderMvpBadge(isMvp) {
  return isMvp ? `<span class="hs-mvp-badge">MVP</span>` : "";
}

function endMemberRole(member) {
  if (member.team === "hunter") return "Hunter";
  return member.team === "runner" ? "Runner" : "Player";
}

function endCaughtLabel(member) {
  return member.capturedAt && member.team === "runner" ? " · caught" : "";
}

function endMemberScore(member) {
  if (member.team === "hunter") return member.captures;
  return member.capturedAt ? "—" : "✓";
}
