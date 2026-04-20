/**
 * Pin `.app-dock` to the bottom of the *visual* viewport when mobile browsers
 * resize the layout vs visual viewport (collapsing URL bar / bottom toolbars).
 */

let installed = false;

/**
 * Signed offset for `bottom`: positive moves the dock up (sit above in-layout
 * browser chrome); negative moves it down when the visual viewport extends
 * past the layout bottom (dynamic toolbars / iOS quirks).
 */
function measureBottomOffsetPx() {
  const vv = window.visualViewport;
  if (!vv) return 0;
  const layoutH = window.innerHeight;
  const visualBottom = vv.offsetTop + vv.height;
  const raw = layoutH - visualBottom;
  if (!Number.isFinite(raw)) return 0;
  const px = Math.round(raw);
  /* Ignore wild bounce / zoom values so the bar never flies off-screen. */
  return Math.max(-120, Math.min(160, px));
}

/** Re-run after every `renderShell` (dock node is recreated). */
export function syncDockVisualViewport() {
  const dock = document.querySelector(".app-dock");
  if (!dock) return;
  if (!window.visualViewport) {
    dock.style.bottom = "";
    return;
  }
  const px = measureBottomOffsetPx();
  dock.style.bottom = px === 0 ? "" : `${px}px`;
}

function onViewportChange() {
  syncDockVisualViewport();
}

/** Call once at app boot; listeners are global. */
export function installDockVisualViewportSync() {
  if (installed) return;
  installed = true;

  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener("resize", onViewportChange);
    vv.addEventListener("scroll", onViewportChange);
  }
  window.addEventListener("resize", onViewportChange);
  window.addEventListener("orientationchange", onViewportChange);

  syncDockVisualViewport();
}
