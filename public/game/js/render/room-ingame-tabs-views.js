/**
 * Friends — in-game dock and non-status tabs.
 */
import { DEFAULT_SETTINGS, escapeHtml, fmtAgo, fmtClock, gameNow, getInitial, state, tsMs } from "./render-room-runtime.js";

const SEND_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>`;
const CAMERA_ICON = `<svg class="hs-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h4l2-3h6l2 3h4v11H3V8z"/><circle cx="12" cy="13" r="3.5"/></svg>`;

export function renderInGameDock(me) {
  const role = me.team === "hunter" ? "hunter" : (me.team === "runner" ? "runner" : "");
  const tabs = [
    { id: "status", label: "Status", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/></svg>` },
    { id: "team", label: "Team", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/></svg>` },
    { id: "qr", label: me.team === "hunter" ? "Scan" : "QR", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M20 14h1M21 17v3M14 18h3v3M20 21h1"/></svg>` },
    { id: "about", label: "About", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.6"/><path d="M4.5 20c1-3.5 4-5.4 7.5-5.4s6.5 1.9 7.5 5.4"/></svg>` },
  ];
  return `
    <nav class="hs-dock">
      <div class="hs-dock-inner cols-4">
        ${tabs.map((t) => `
          <button type="button" class="hs-dock-tab role-${role} ${t.id === state.gameTab ? "is-active" : ""}" data-game-tab="${t.id}">
            ${t.icon}
            <span>${t.label}</span>
          </button>
        `).join("")}
      </div>
    </nav>
  `;
}

export function renderGameTabBody(me) {
  if (state.gameTab === "team") return renderTeamChat(me);
  if (state.gameTab === "qr") return renderQrTab(me);
  if (state.gameTab === "about") return renderAboutTab(me);
  return "";
}

function renderTeamChat(me) {
  const myTeam = me.team; // "hunter" | "runner" | "spectator"
  const visibleScopes = myTeam === "spectator" ? ["all", "hunters", "runners"] : ["all", myTeam === "hunter" ? "hunters" : "runners"];
  const teammates = state.members.filter((m) => m.team === myTeam);
  const filtered = state.chats.filter((c) => visibleScopes.includes(c.scope || "all"));
  const teamLabel = myTeam === "hunter" ? "Hunters" : (myTeam === "runner" ? "Runners" : "Spectator");
  const scopeForSend = myTeam === "hunter" ? "hunters" : (myTeam === "runner" ? "runners" : "all");

  return `
    <div class="hs-team-chat">
      <div class="roster">
        <span class="label">${escapeHtml(teamLabel)}</span>
        ${teammates.map((m) => {
          const photoClass = m.avatarReady ? "has-photo" : "";
          const avatarHtml = m.avatarUrl ? `<img src="${escapeHtml(m.avatarUrl)}" alt="" />` : `<span>${escapeHtml(getInitial(m.name))}</span>`;
          return `<div class="hs-av hs-av-xs ${photoClass}">${avatarHtml}</div>`;
        }).join("")}
      </div>
      <div class="messages" id="hs-team-msgs">
        ${filtered.length ? filtered.map((c) => {
          const mine = c.senderUid === me.uid;
          return `
            <div class="hs-msg ${mine ? "me" : ""}">
              <div class="bubble"><b>${escapeHtml(mine ? "You" : c.senderName || "Anon")}</b>${escapeHtml(c.text)}</div>
            </div>
          `;
        }).join("") : `<div class="hs-empty-note">No messages yet — coordinate here</div>`}
      </div>
      <div class="composer">
        <input id="hs-team-chat-input" placeholder="Message your team..." value="${escapeHtml(state.teamChatDraft)}" data-bind="teamChatDraft" maxlength="200" />
        <button type="button" class="send" data-action="send-chat" data-scope="${scopeForSend}" data-source="team" aria-label="Send team message">${SEND_ICON}</button>
      </div>
      <div class="scope-hint">Visible to <b>${escapeHtml(teamLabel)}</b> only</div>
    </div>
  `;
}

function renderQrTab(me) {
  if (me.team === "hunter") {
    const recent = state.captures.slice(-5).reverse();
    const aliveRunners = state.members.filter((m) => m.team === "runner" && !m.capturedAt);
    return `
      <div class="hs-scanner-stage">
        <button type="button" class="hs-btn hs-btn-primary hs-btn-block hs-scan-launch" data-action="open-scanner">${CAMERA_ICON}Open QR scanner</button>
        ${state.scanError ? `<p class="hs-error-note">${escapeHtml(state.scanError)}</p>` : ""}

        ${renderAliveRunnerCaptureList(aliveRunners)}

        <div class="hs-cap-log">
          <h5>Capture log</h5>
          <ul>
            ${recent.length ? recent.map(renderCaptureLogRow).join("") : `<li><time>—</time><span>No captures yet — be the first.</span></li>`}
          </ul>
        </div>
      </div>
    `;
  }
  return `
    <div class="hs-qr-stage">
      <div class="hs-qr-pill">If caught · show this</div>
      <h3>Your capture code</h3>
      <div class="hs-qr-square" id="hs-qr-canvas"></div>
      <p>If a Hunter physically reaches you, they'll scan this QR. The capture is final.</p>
    </div>
  `;
}

function renderAliveRunnerCaptureList(aliveRunners) {
  if (!aliveRunners.length) return "";
  return `
    <div class="hs-section-head">Catch by tap<small>${aliveRunners.length} runner${aliveRunners.length === 1 ? "" : "s"} active</small></div>
    <div class="hs-players-list">
      ${aliveRunners.map(renderAliveRunnerRow).join("")}
    </div>
  `;
}

function renderAliveRunnerRow(r) {
  const photoClass = r.avatarReady ? "has-photo" : "";
  const av = r.avatarUrl ? `<img src="${escapeHtml(r.avatarUrl)}" alt="" />` : `<span>${escapeHtml(getInitial(r.name))}</span>`;
  const lockMs = tsMs(r.lockExpiresAt);
  const _lockMaxMs = (state.room?.lockMin || DEFAULT_SETTINGS.lockMin) * 60 * 1000;
  const lockRemain = lockMs > 0 ? Math.max(0, Math.min(_lockMaxMs, lockMs - gameNow())) : 0;
  const tag = lockRemain > 0 ? `Locked ${fmtClock(lockRemain)}` : "Moving";
  return `
    <div class="hs-player-row">
      <div class="hs-av hs-av-sm ${photoClass}">${av}</div>
      <div class="info">
        <div class="name">${escapeHtml(r.name)}</div>
        <div class="meta">${escapeHtml(tag)}</div>
      </div>
      <button type="button" class="hs-btn hs-btn-primary hs-mini-action" data-action="manual-capture" data-uid="${escapeHtml(r.uid)}" data-token="${escapeHtml(r.qrToken)}">Catch</button>
    </div>
  `;
}

function renderCaptureLogRow(c) {
  return `
    <li>
      <time>${escapeHtml(fmtAgo(gameNow() - tsMs(c.capturedAt)))}</time>
      <span><b class="hs-capture-name">${escapeHtml(c.captorName)}</b> caught <b>${escapeHtml(c.targetName)}</b></span>
    </li>
  `;
}

function renderAboutTab(me) {
  const room = state.room;
  const roleTag = me.team === "hunter" ? "Hunter" : (me.team === "runner" ? "Runner" : "Player");
  const roleClass = me.team === "hunter" ? "hunter" : (me.team === "runner" ? "runner" : "unknown");
  const others = state.members.filter((m) => m.uid !== me.uid);
  const myCaps = state.captures.filter((c) => c.captorUid === me.uid).length;

  return `
    <div class="hs-game-body">
      <div class="hs-me-card">
        <div class="hs-av hs-av-lg ${me.avatarReady ? "has-photo" : ""}">
          ${me.avatarUrl ? `<img src="${escapeHtml(me.avatarUrl)}" alt="" />` : `<span>${escapeHtml(getInitial(me.name))}</span>`}
        </div>
        <div class="info">
          <div class="name">${escapeHtml(me.name)} · You <span class="hs-role-tag ${roleClass}">${escapeHtml(roleTag)}</span>${me.isHost ? `<span class="hs-role-tag host">Host</span>` : ""}</div>
          <div class="meta">${myCaps} captures · <span data-live="hunt-elapsed">${escapeHtml(fmtClock(gameNow() - tsMs(room.huntStartedAt)))}</span> played</div>
        </div>
      </div>

      <div class="hs-section-head">Other players<small>${others.length} in game</small></div>
      <div class="hs-players-list">
        ${others.map((m) => renderAboutPlayerRow(m, me)).join("")}
      </div>

      <div class="hs-section-head">Settings</div>
      <div class="hs-set-list">
        <button type="button" class="hs-set-row danger" data-action="confirm-leave">
          <span class="lbl">Exit game (forfeit)</span>
          <span class="chev">›</span>
        </button>
      </div>
    </div>
  `;
}

function renderAboutPlayerRow(member, me) {
  const role = visibleAboutRole(member, me);
  const photoClass = member.avatarReady ? "has-photo" : "";
  const avatarHtml = member.avatarUrl
    ? `<img src="${escapeHtml(member.avatarUrl)}" alt="" />`
    : `<span>${escapeHtml(getInitial(member.name))}</span>`;
  return `
    <div class="hs-player-row">
      <div class="hs-av hs-av-sm ${photoClass}">${avatarHtml}</div>
      <div class="info">
        <div class="name">${escapeHtml(member.name)}${member.isHost ? " ★" : ""}</div>
        <div class="meta">${aboutPlayerMetaHtml(member)}</div>
      </div>
      <span class="hs-role-tag ${role.tagClass}">${escapeHtml(role.visibleRole)}</span>
    </div>
  `;
}

function visibleAboutRole(member, me) {
  if (member.capturedAt) return { visibleRole: "Caught", tagClass: "caught" };
  if (member.team === "hunter") return { visibleRole: "Hunter", tagClass: "hunter" };
  if (member.team === "runner" && (me.team === "runner" || me.team === "spectator")) {
    return { visibleRole: "Runner", tagClass: "runner" };
  }
  return { visibleRole: "?", tagClass: "unknown" };
}

function aboutPlayerMetaHtml(member) {
  // Lock countdown updates every tick — render as a stable
  // <span data-live> placeholder so the parent diff doesn't
  // trip on it and trigger a full DOM re-mount (which was the
  // source of the About-tab flicker on every tick).
  if (member.capturedAt) return "Captured";
  const lockMs = tsMs(member.lockExpiresAt);
  if (member.team === "runner" && lockMs > 0) {
    return `Locked · <span data-live="lock-remain" data-lock-ms="${lockMs}"></span>`;
  }
  return "Active";
}
