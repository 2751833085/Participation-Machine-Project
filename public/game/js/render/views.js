/**
 * Friends app — `#hs-app` shell router + re-export of overlay markup.
 */
import { escapeHtml, gameNow, state } from "./render-shell-runtime.js";
import {
  isCapturedSelf,
  isInRoom,
  roomStatus,
} from "./helpers.js";
import {
  renderCreateForm,
  renderHomeShell,
  renderJoinForm,
} from "./home-views.js";
import {
  renderCreatedSuccessScreen,
  renderCreatingScreen,
  renderOverlaysHtml,
} from "./overlay-views.js";
import { renderRoleReveal } from "./role-reveal-views.js";
import {
  renderDispersal,
  renderEnd,
  renderInGame,
  renderLobby,
  renderReadyCheck,
  renderSpectator,
} from "./room-views.js";

function renderShellHtml() {
  if (!state.user) {
    return `<div class="hs-loading"><div class="hs-spinner"></div><div>${state.bootError ? escapeHtml(state.bootError) : "Connecting..."}</div></div>`;
  }
  if (state.createPhase === "creating") return renderCreatingScreen();
  if (state.createPhase === "success") return renderCreatedSuccessScreen();
  if (state.roomCode && !state.room) {
    return `<div class="hs-shell"><div class="hs-loading"><div class="hs-spinner"></div><div>Entering room ${escapeHtml(state.roomCode)}…</div></div></div>`;
  }
  if (!isInRoom()) {
    return renderOutOfRoomView();
  }
  return renderRoomView();
}

function renderOutOfRoomView() {
  const viewRenderers = {
    create: renderCreateForm,
    join: renderJoinForm,
  };
  return (viewRenderers[state.view] || renderHomeShell)();
}

function renderRoomView() {
  const status = roomStatus();
  const roomRenderers = {
    lobby: renderLobby,
    ready_check: renderReadyCheck,
    dispersal: renderDispersal,
    ended: renderEnd,
  };
  if (status === "hunt" || status === "stalemate") return renderActiveRoomView();
  return (roomRenderers[status] || renderLobby)();
}

function renderActiveRoomView() {
  if (state.roleRevealUntil && state.roleRevealUntil > gameNow()) return renderRoleReveal();
  return isCapturedSelf() ? renderSpectator() : renderInGame();
}

export { renderShellHtml, renderOverlaysHtml };
