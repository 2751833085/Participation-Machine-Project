/**
 * Friends — full-screen overlay orchestrator.
 */
import { escapeHtml, state } from "./render-overlay-runtime.js";
import { getMyMember, needsRunnerStopAlert } from "./helpers.js";
import { renderRelocateScreen, renderRunnerStopAlert } from "./hunt-interruption-views.js";
import { renderCamera, renderPhotoPreview, renderScanner } from "./overlay-camera-views.js";
import { renderCreatedSuccessScreen, renderCreatingScreen } from "./overlay-create-views.js";
import { renderModal } from "./overlay-modal-views.js";

function renderOverlaysHtml() {
  let html = renderMediaOverlays();
  const me = getMyMember();
  html += renderRoomInterruptionOverlays(me);
  html += renderModalToastOverlays();
  return html;
}

function renderMediaOverlays() {
  let html = "";
  if (state.cameraOpen) html += renderCamera();
  if (state.photoPreview) html += renderPhotoPreview();
  if (state.scannerOpen) html += renderScanner();
  return html;
}

function renderRoomInterruptionOverlays(me) {
  if (!me || !state.room) return "";
  let html = "";
  if (state.room.status === "stalemate") html += renderRelocateScreen(me);
  if (needsRunnerStopAlert(me)) html += renderRunnerStopAlert(me);
  return html;
}

function renderModalToastOverlays() {
  let html = "";
  if (state.modal) html += renderModal();
  if (state.toast) {
    html += `<div class="hs-toast ${escapeHtml(state.toast.kind)}">${escapeHtml(state.toast.text)}</div>`;
  }
  return html;
}

export {
  renderOverlaysHtml,
  renderCreatingScreen,
  renderCreatedSuccessScreen,
};
