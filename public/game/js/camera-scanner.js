/**
 * Headshot / position camera flow, QR scan for hunters, and static QR render.
 * Kept free of `app.js` imports; callers pass runtime deps (state, render, friendCtx, …).
 */
import {
  CAM_COUNTDOWN_START,
  getCameraSession,
  setCameraSession,
} from "./camera-session.js";
import { actionUploadHeadshot, actionUploadPositionPhoto } from "./actions/room-media.js";

/** @typedef {{ state: object, render: () => void, showToast: (text: string, kind?: string) => void, friendCtx: () => object }} CamScannerDeps */

let scannerSession = null;
let qrLibLoading = null;

/**
 * @param {CamScannerDeps} deps
 * @param {"headshot" | "position"} kind
 */
export async function openCamera(deps, kind) {
  if (getCameraSession()) return;
  prepareCameraState(deps, kind);
  const session = createCameraSession(kind);
  setCameraSession(session);
  setTimeout(() => void startCameraSession(deps, session), 50);
}

function prepareCameraState(deps, kind) {
  deps.state.cameraOpen = true;
  deps.state.cameraKind = kind;
  deps.state.cameraError = "";
  deps.state.photoPreview = null;
  deps.render();
}

function createCameraSession(kind) {
  return {
    kind,
    stream: null,
    countdown: CAM_COUNTDOWN_START,
    timer: null,
    cancelled: false,
  };
}

async function startCameraSession(deps, session) {
  const video = document.getElementById("hs-cam-video");
  if (!video) return;
  try {
    session.stream = await openCameraStream(session.kind);
    video.srcObject = session.stream;
    await video.play();
  } catch (e) {
    handleCameraAccessError(deps, session, e);
    return;
  }
  startCameraCountdown(deps, session);
}

async function openCameraStream(kind) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("unavailable");
  const facingMode = kind === "position" ? "environment" : "user";
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1440 } },
    audio: false,
  });
}

function handleCameraAccessError(deps, session, e) {
  console.error("camera access", e);
  const denied = isCameraPermissionDenied(e);
  deps.state.permissionState = denied ? "denied" : deps.state.permissionState;
  deps.state.cameraError = denied ? "permission" : "unavailable";
  stopCameraStream(session);
  setCameraSession(null);
  deps.render();
}

function isCameraPermissionDenied(e) {
  return Boolean(e && (
    e.name === "NotAllowedError" ||
    e.name === "SecurityError" ||
    /denied|permission/i.test(String(e.message || ""))
  ));
}

function startCameraCountdown(deps, session) {
  updateCountdownDom(session.countdown);
  session.timer = setInterval(() => {
    if (session.cancelled) return;
    session.countdown -= 1;
    updateCountdownDom(session.countdown);
    if (session.countdown <= 0) finishCameraCountdown(deps, session);
  }, 1000);
}

function finishCameraCountdown(deps, session) {
  clearInterval(session.timer);
  session.timer = null;
  captureFromCamera(deps, session);
}

function updateCountdownDom(value) {
  const cd = document.getElementById("hs-cam-cd");
  if (cd) cd.textContent = value > 0 ? String(value) : "";
  const pill = document.getElementById("hs-cam-pill-label");
  if (pill) pill.textContent = value > 0 ? `Auto-capture in ${value}s` : "Capturing…";
}

/**
 * @param {CamScannerDeps} deps
 */
function captureFromCamera(deps, session) {
  const video = document.getElementById("hs-cam-video");
  const canvas = document.getElementById("hs-cam-canvas");
  if (!video || !canvas) {
    closeCamera(deps);
    return;
  }
  const vw = video.videoWidth || 720;
  const vh = video.videoHeight || 720;
  const size = Math.min(vw, vh);
  const sx = Math.max(0, Math.round((vw - size) / 2));
  const sy = Math.max(0, Math.round((vh - size) / 2));
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (session.kind === "headshot") {
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  stopCameraStream(session);
  setCameraSession(null);
  deps.state.cameraOpen = false;
  deps.state.photoPreview = { dataUrl, kind: session.kind };
  deps.render();
}

function stopCameraStream(session) {
  if (!session) return;
  if (session.timer) {
    clearInterval(session.timer);
    session.timer = null;
  }
  if (session.stream) {
    session.stream.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch (e) {}
    });
    session.stream = null;
  }
}

/** @param {CamScannerDeps} deps */
export function closeCamera(deps) {
  const s = getCameraSession();
  if (s) {
    s.cancelled = true;
    stopCameraStream(s);
  }
  setCameraSession(null);
  deps.state.cameraOpen = false;
  deps.state.cameraError = "";
  deps.state.cameraKind = null;
  deps.render();
}

/** @param {CamScannerDeps} deps */
export async function confirmPreview(deps) {
  const preview = deps.state.photoPreview;
  if (!preview) return;
  deps.state.busy = true;
  deps.render();
  try {
    if (preview.kind === "headshot") {
      await actionUploadHeadshot(deps.friendCtx(), preview.dataUrl);
    } else if (preview.kind === "position") {
      await actionUploadPositionPhoto(deps.friendCtx(), preview.dataUrl);
    }
    deps.state.photoPreview = null;
  } catch (e) {
    /* toast already shown */
  } finally {
    deps.state.busy = false;
    deps.render();
  }
}

/** @param {CamScannerDeps} deps */
export function retakePreview(deps) {
  const kind = deps.state.photoPreview?.kind;
  deps.state.photoPreview = null;
  deps.render();
  if (kind) void openCamera(deps, kind);
}

/** @param {CamScannerDeps} deps */
export async function openScanner(deps) {
  if (scannerSession) return;
  deps.state.scannerOpen = true;
  deps.state.scanError = "";
  deps.render();
  setTimeout(() => void startScannerSession(deps), 80);
}

async function startScannerSession(deps) {
  const video = document.getElementById("hs-scan-video");
  if (!video) return;
  const session = { stream: null, detector: null, cancelled: false, raf: null };
  scannerSession = session;
  try {
    session.stream = await openScannerStream();
    video.srcObject = session.stream;
    await video.play();
    startQrDetector(deps, session, video);
  } catch (e) {
    handleScannerCameraError(deps, e);
  }
}

async function openScannerStream() {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment", width: { ideal: 1080 } },
    audio: false,
  });
}

function startQrDetector(deps, session, video) {
  if (typeof BarcodeDetector !== "undefined") {
    session.detector = new BarcodeDetector({ formats: ["qr_code"] });
    loopScan(deps, session, video);
    return;
  }
  deps.state.scanError = "QR scanner not supported on this device. Use the manual code option below.";
  deps.render();
}

function handleScannerCameraError(deps, e) {
  console.error("scanner camera", e);
  const denied = isCameraPermissionDenied(e);
  if (denied) deps.state.permissionState = "denied";
  deps.state.scanError = denied ? "permission" : "Camera unavailable on this device.";
  deps.render();
}

/**
 * @param {CamScannerDeps} deps
 */
async function loopScan(deps, session, video) {
  if (session.cancelled || !session.detector) return;
  try {
    const codes = await session.detector.detect(video);
    if (codes && codes.length) {
      const raw = codes[0].rawValue || "";
      await handleScanResult(deps, raw);
      return;
    }
  } catch (e) {
    /* ignore */
  }
  session.raf = requestAnimationFrame(() => loopScan(deps, session, video));
}

/**
 * @param {CamScannerDeps} deps
 */
async function handleScanResult(deps, raw) {
  let parsed = null;
  try {
    if (raw && raw.startsWith("{")) parsed = JSON.parse(raw);
    else parsed = { uid: "", token: raw };
  } catch (e) {
    parsed = { uid: "", token: raw };
  }
  const token = parsed.token || raw;
  const target = deps.state.members.find((m) => m.qrToken === token);
  if (!target) {
    deps.showToast("Unknown QR", "danger");
    return;
  }
  closeScanner(deps);
  deps.state.modal = {
    kind: "capture-confirm",
    payload: {
      uid: target.uid,
      name: target.name,
      token: target.qrToken,
      avatarUrl: target.avatarUrl,
      avatarReady: !!target.avatarReady,
    },
  };
  deps.render();
}

/** @param {CamScannerDeps} deps */
export function closeScanner(deps) {
  if (scannerSession) {
    scannerSession.cancelled = true;
    if (scannerSession.raf) cancelAnimationFrame(scannerSession.raf);
    if (scannerSession.stream) {
      scannerSession.stream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {}
      });
    }
  }
  scannerSession = null;
  deps.state.scannerOpen = false;
  deps.state.scanError = "";
  deps.render();
}

export function ensureQrLib() {
  if (typeof window.qrcode === "function") return Promise.resolve();
  if (qrLibLoading) return qrLibLoading;
  qrLibLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("QR library failed to load"));
    document.head.appendChild(script);
  });
  return qrLibLoading;
}

export async function renderQrInto(elId, text) {
  try {
    await ensureQrLib();
    const el = document.getElementById(elId);
    if (!el) return;
    const qr = window.qrcode(0, "M");
    qr.addData(text);
    qr.make();
    el.innerHTML = qr.createSvgTag({ scalable: true, margin: 0 });
  } catch (e) {
    console.error("qr render", e);
  }
}
