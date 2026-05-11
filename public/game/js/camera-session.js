/** Live camera UI session — owned by `app.js`, read by `render/overlay-views.js`. */
export const CAM_COUNTDOWN_START = 5;

let cameraSession = null;

export function getCameraSession() {
  return cameraSession;
}

export function setCameraSession(session) {
  cameraSession = session;
}
