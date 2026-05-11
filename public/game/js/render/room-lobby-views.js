/**
 * Friends — lobby shell (room code, grid, chat strip).
 */
import { escapeHtml, getInitial, state } from "./render-room-runtime.js";
import { getMyMember } from "./helpers.js";

function renderPlayerGrid() {
  const items = state.members.map((m) => {
    const isMe = m.uid === state.user.uid;
    const photoClass = m.avatarReady ? "has-photo" : "";
    const readyClass = m.avatarReady ? "is-ready" : "";
    const hostClass = m.isHost ? "is-host" : "";
    const status = m.avatarReady ? "Ready" : (m.isHost ? "No photo" : "Waiting");
    const statusClass = m.avatarReady ? "ready" : (m.isHost ? "host" : "");
    const avatarHtml = m.avatarUrl
      ? `<img src="${escapeHtml(m.avatarUrl)}" alt="" />`
      : `<span>${escapeHtml(getInitial(m.name))}</span>`;
    return `
      <div class="hs-player-tile ${isMe ? "me" : ""}">
        <div class="hs-av hs-av-lg ${photoClass} ${readyClass} ${hostClass}">${avatarHtml}</div>
        <div class="name">${escapeHtml(isMe ? "You" : m.name)}${m.isHost && !isMe ? " (Host)" : ""}${m.isHost && isMe ? " (Host)" : ""}</div>
        <div class="status ${statusClass}">${escapeHtml(status)}</div>
      </div>
    `;
  });
  // Pad to multiple of 3 for grid alignment up to 9 visible
  return items.join("");
}

function renderLobbyChat() {
  const recent = state.chats.slice(-5);
  return `
    <div class="hs-chat-strip">
      <div class="messages">
        ${recent.length ? recent.map((c) => `
          <div class="row">
            <div class="msg"><b>${escapeHtml(c.senderName || "Anon")}</b><span>${escapeHtml(c.text)}</span></div>
          </div>
        `).join("") : `<div style="color:var(--ink-3);font-size:11px;padding:4px 0;text-align:center">Say hi 👋</div>`}
      </div>
      <div class="input-row">
        <input id="hs-lobby-chat-input" placeholder="Type a message..." value="${escapeHtml(state.chatDraft)}" data-bind="chatDraft" maxlength="200" />
        <button type="button" class="send" data-action="send-chat" data-scope="all">↑</button>
      </div>
    </div>
  `;
}

export function renderLobby() {
  const room = state.room;
  const me = getMyMember();
  const isHost = room.hostUid === state.user.uid;
  const totalReady = state.members.filter((m) => m.avatarReady).length;
  const allReady = totalReady === state.members.length && state.members.length >= 2;
  const myReady = !!me?.avatarReady;

  return `
    <div class="hs-shell">
      <header class="hs-gh">
        <button type="button" class="hs-gh-back" data-action="confirm-leave" aria-label="Leave">←</button>
        <div style="flex:1;min-width:0">
          <div class="hs-gh-sub">Lobby${isHost ? " · Host" : ""}</div>
          <div class="hs-gh-title">${escapeHtml(room.name || "Room")}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">
          <span style="font-size:10px;letter-spacing:0.18em;color:var(--ink-3);font-weight:700">Players</span>
          <span style="font-family:var(--font-display);font-size:18px;color:var(--accent);font-weight:500">${totalReady} / ${state.members.length}</span>
        </div>
      </header>
      <div class="hs-lobby-body">
        <div class="hs-lobby-room">
          <div class="label">Room Code</div>
          <div class="code">${escapeHtml(room.code)}</div>
          <button type="button" class="copy" data-action="copy-room-code">⧉ Tap to copy</button>
        </div>

        <div class="hs-player-grid">
          ${renderPlayerGrid()}
        </div>

        ${renderLobbyChat()}

        ${myReady
          ? (isHost
            ? `<button type="button" class="hs-cta-card ready" data-action="start-ready-check" ${allReady ? "" : "disabled"}>
                 <div class="ico">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/></svg>
                 </div>
                 <div class="text">
                   <h4>${allReady ? "Start the game" : `Waiting on ${state.members.length - totalReady} photo${state.members.length - totalReady === 1 ? "" : "s"}`}</h4>
                   <p>${allReady ? "Everyone's ready" : "All players must tap-and-shoot first"}</p>
                 </div>
                 <div class="arrow">→</div>
               </button>`
            : `<div class="hs-cta-card ready">
                 <div class="ico">
                   <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                 </div>
                 <div class="text">
                   <h4>You're ready</h4>
                   <p>${allReady ? "Waiting on host to start..." : `Waiting on ${state.members.length - totalReady} photo${state.members.length - totalReady === 1 ? "" : "s"}...`}</p>
                 </div>
               </div>`
          )
          : `<button type="button" class="hs-cta-card" data-action="open-headshot">
              <div class="ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M3 7h4l2-3h6l2 3h4v12H3V7z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
              <div class="text">
                <h4>Capture to ready up</h4>
                <p>Photo upload = ready · 5-second auto-capture</p>
              </div>
              <div class="arrow">→</div>
            </button>`
        }
      </div>
    </div>
  `;
}
