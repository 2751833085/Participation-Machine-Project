/**
 * Friends — ready-check countdown + dispersal phase UI.
 */
import { DEFAULT_SETTINGS, READY_COUNTDOWN_MS, escapeHtml, fmtClock, gameNow, getInitial, state, tsMs } from "./render-room-runtime.js";
import { getMyMember } from "./helpers.js";

export function renderReadyCheck() {
  const me = getMyMember();
  const myVote = me?.readyVote || null;
  const total = state.members.length;
  const readys = state.members.filter((m) => m.readyVote === "ready").length;
  const cancels = state.members.filter((m) => m.readyVote === "cancel").length;
  const allReady = readys === total && total >= 1;
  const cancelled = cancels > 0;
  const cdStart = tsMs(state.room?.readyCountdownStartedAt);
  // Clamp at the original duration so clock drift can't make the
  // displayed countdown jump past the ceiling (e.g. 60s when local
  // clock is 50s behind server).
  const cdRawRemain = cdStart ? READY_COUNTDOWN_MS - (gameNow() - cdStart) : READY_COUNTDOWN_MS;
  const cdRemainMs = Math.max(0, Math.min(READY_COUNTDOWN_MS, cdRawRemain));
  const cdSec = Math.ceil(cdRemainMs / 1000);

  return `
    <div class="hs-ready">
      <div class="hs-ready-top">
        <div class="kicker">${cancelled ? "Cancelled" : (allReady ? "All ready · starting soon" : `${readys} / ${total} ready`)}</div>
        <h2>${allReady ? "Launch" : "Ready up"}</h2>
        <div class="room">${escapeHtml(state.room.code)} · ${escapeHtml(state.room.name || "")}</div>
      </div>
      <div class="hs-ready-stage">
        <div class="hs-ready-roster">
          ${state.members.map((m) => {
            const slotClass = m.readyVote === "ready" ? "is-ready" : (m.readyVote === "cancel" ? "is-cancel" : "waiting");
            const badge = m.readyVote === "ready" ? "Ready" : (m.readyVote === "cancel" ? "Cancelled" : "Waiting");
            const isMe = m.uid === state.user.uid;
            const avatarHtml = m.avatarUrl ? `<img src="${escapeHtml(m.avatarUrl)}" alt="" />` : `<span>${escapeHtml(getInitial(m.name))}</span>`;
            return `
              <div class="hs-ready-slot ${slotClass}">
                ${m.isHost ? `<div class="ribbon">HOST</div>` : ""}
                <div class="av-frame"><div class="hs-av">${avatarHtml}</div></div>
                <div class="label">${escapeHtml(isMe ? "You" : m.name)}</div>
                <div class="badge">${escapeHtml(badge)}</div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
      <div class="hs-ready-foot">
        ${allReady && !cancelled
          ? `<div class="countdown">
              <div class="num">${cdSec}</div>
              <div class="lbl">Game starts in</div>
            </div>`
          : `<div class="grid">
              <button type="button" class="hs-btn cancel" data-action="ready-vote" data-vote="cancel" ${myVote ? "disabled" : ""}>${myVote === "cancel" ? "Cancelled" : "Cancel"}</button>
              <button type="button" class="hs-btn go" data-action="ready-vote" data-vote="ready" ${myVote ? "disabled" : ""}>${myVote === "ready" ? "Ready ✓" : "Ready"}</button>
            </div>`
        }
      </div>
      ${cancelled ? `
        <div class="hs-cancelled-banner">
          <div class="x">×</div>
          <h3>Start aborted</h3>
          <p><b style="color:#ffe066">${escapeHtml(state.room.cancelledBy || "Someone")}</b> cancelled. Returning to Lobby.</p>
        </div>
      ` : ""}
    </div>
  `;
}

export function renderDispersal() {
  const room = state.room;
  const dispMs = (room.dispersalMin || DEFAULT_SETTINGS.dispersalMin) * 60 * 1000;
  const elapsed = Math.max(0, gameNow() - tsMs(room.dispersalStartedAt));
  const remain = Math.max(0, Math.min(dispMs, dispMs - elapsed));
  const recent = state.chats.slice(-6);
  const chosen = state.dispersalChosenSide;
  const sideHint = chosen
    ? `<div class="hs-dispersal-side-hint ${escapeHtml(chosen)}"><span class="dot"></span>Bracing for ${escapeHtml(chosen)}</div>`
    : `<div class="hs-dispersal-side-hint"><span class="dot"></span>Tap a side to brace yourself</div>`;
  return `
    <div class="hs-dispersal">
      <button type="button" class="hs-dispersal-side-tap left ${chosen === "runner" ? "is-chosen" : ""}" data-action="dispersal-choose-side" data-side="runner" aria-label="Brace as runner"></button>
      <button type="button" class="hs-dispersal-side-tap right ${chosen === "hunter" ? "is-chosen" : ""}" data-action="dispersal-choose-side" data-side="hunter" aria-label="Brace as hunter"></button>
      <div class="hs-dispersal-content">
        <div class="hs-dispersal-top">
          <div>
            <div class="label">Phase 1 · Dispersal</div>
            <h2>Disperse now</h2>
          </div>
          <div class="hs-dispersal-pill">Roles hidden</div>
        </div>
        <div class="hs-dispersal-clock">
          <div class="ring">
            <div class="num" data-live="disp-remain">${escapeHtml(fmtClock(remain))}</div>
            <div class="unit">remaining</div>
          </div>
        </div>
        <div class="hs-dispersal-instr">
          <h3>Get apart.<br>Stay out of sight.</h3>
          <p>Roles are randomly assigned when the timer hits 0. Tap left for runner, right for hunter — pure superstition, but feel free.</p>
          ${sideHint}
        </div>
        <div class="hs-dispersal-chat">
          <div class="messages">
            ${recent.length ? recent.map((c) => `
              <div class="row"><span class="name">${escapeHtml(c.senderName || "Anon")}</span><span class="text">${escapeHtml(c.text)}</span></div>
            `).join("") : `<div style="opacity:0.5;font-size:11px;text-align:center">Coordinate with everyone here</div>`}
          </div>
          <div class="input-row">
            <input id="hs-dispersal-chat-input" placeholder="Type a message..." value="${escapeHtml(state.dispersalChatDraft)}" data-bind="dispersalChatDraft" maxlength="200" />
            <button type="button" class="send" data-action="send-chat" data-scope="all" data-source="dispersal">↑</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
