/**
 * Friends — camera, scanner, and photo preview overlays.
 */
import { CAM_COUNTDOWN_START, escapeHtml, getCameraSession, state } from "./render-overlay-runtime.js";

export function renderCamera() {
  const session = getCameraSession();
  const kind = session?.kind || state.cameraKind || "headshot";
  const hint = kind === "headshot" ? "Center your face in the circle" : "Frame your surroundings";
  if (state.cameraError) return renderCameraDenied(kind);

  // The countdown digit and pill text are mutated via DOM ids
  // (updateCountdownDom). We MUST NOT bake them into this template, or
  // each tick would diff and replace the whole camera DOM, killing the
  // <video> stream and producing a black preview.
  return `
    <div class="hs-cam ${kind === "headshot" ? "is-selfie" : ""}">
      <button type="button" class="hs-cam-cancel" data-action="cancel-camera">Cancel</button>
      <div class="hs-cam-stage">
        <div class="hs-cam-hint">${escapeHtml(hint)}</div>
        <div class="hs-cam-frame">
          <video id="hs-cam-video" playsinline autoplay muted></video>
          ${kind === "headshot" ? `<div class="hs-cam-face-guide"></div>` : ""}
          <div class="hs-cam-countdown" id="hs-cam-cd"></div>
        </div>
        <canvas id="hs-cam-canvas"></canvas>
      </div>
      <div class="hs-cam-bottom">
        <div class="hs-cam-pill"><span class="dot"></span><span id="hs-cam-pill-label">Auto-capture in ${CAM_COUNTDOWN_START}s</span></div>
        <div class="hs-cam-tip">No shutter button. The camera fires automatically — you can retake on the next screen.</div>
      </div>
    </div>
  `;
}

function renderCameraDenied(kind) {
  const isPerm = state.cameraError === "permission";
  return `
    <div class="hs-cam">
      <button type="button" class="hs-cam-cancel" data-action="cancel-camera">Cancel</button>
      <div class="hs-cam-denied">
        <div class="ico">${cameraIcon()}</div>
        <h3>${isPerm ? "Camera access blocked" : "Camera unavailable"}</h3>
        <p>${isPerm
          ? "Tourgo needs your camera to take this photo. Tap Allow camera to ask again. If nothing happens, open Settings → Safari → Camera and set this site to Allow."
          : "We couldn't start the camera on this device. Try again, or use a different browser."}</p>
        <div class="hs-cam-denied-actions">
          <button type="button" class="hs-btn hs-btn-primary hs-btn-block hs-btn-lg" data-action="retry-camera" data-kind="${escapeHtml(kind)}">Allow camera</button>
          <button type="button" class="hs-btn hs-btn-block" data-action="cancel-camera">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

export function renderPhotoPreview() {
  const preview = state.photoPreview;
  if (!preview) return "";
  return `
    <div class="hs-photo-preview">
      <div class="photo-wrap">
        <div class="photo">
          <img src="${preview.dataUrl}" alt="Photo preview" />
          <div class="photo-tag">Just now</div>
        </div>
      </div>
      <div class="actions" style="width:100%">
        <button type="button" class="hs-btn hs-btn-primary hs-btn-block hs-btn-lg" data-action="confirm-preview" ${state.busy ? "disabled" : ""}>${state.busy ? "Uploading..." : (preview.kind === "position" ? "Save & lock" : "Save and ready ✓")}</button>
        <button type="button" class="hs-btn hs-btn-block retake" data-action="retake-preview">Retake</button>
      </div>
    </div>
  `;
}

export function renderScanner() {
  if (state.scanError === "permission") return renderScannerDenied();
  return `
    <div class="hs-cam">
      <button type="button" class="hs-cam-cancel" data-action="cancel-scanner">Cancel</button>
      <div class="hs-scanner-frame">
        <video id="hs-scan-video" playsinline autoplay muted></video>
        <span class="corner tl"></span><span class="corner tr"></span>
        <span class="corner bl"></span><span class="corner br"></span>
        <div class="scan-line"></div>
        <div class="hint">Point at a Runner's QR</div>
      </div>
      ${state.scanError ? `<div style="color:#fff;background:rgba(0,0,0,0.6);padding:14px;text-align:center;font-size:13px">${escapeHtml(state.scanError)}</div>` : ""}
    </div>
  `;
}

function renderScannerDenied() {
  return `
    <div class="hs-cam">
      <button type="button" class="hs-cam-cancel" data-action="cancel-scanner">Cancel</button>
      <div class="hs-cam-denied">
        <div class="ico">${cameraIcon()}</div>
        <h3>Camera access blocked</h3>
        <p>The QR scanner needs the camera. Tap Allow camera to ask again, or open Settings → Safari → Camera and set this site to Allow.</p>
        <div class="hs-cam-denied-actions">
          <button type="button" class="hs-btn hs-btn-primary hs-btn-block hs-btn-lg" data-action="retry-scanner">Allow camera</button>
          <button type="button" class="hs-btn hs-btn-block" data-action="cancel-scanner">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

function cameraIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h4l2-3h6l2 3h4v11H3V8z"/><circle cx="12" cy="13" r="3.5"/></svg>`;
}
