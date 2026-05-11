/**
 * Lift chat composer inputs with the on-screen keyboard (visualViewport).
 */
const FLOATING_INPUT_IDS = ["hs-dispersal-chat-input", "hs-lobby-chat-input", "hs-team-chat-input"];
let floatingInputEl = null;

function floatingInputFromTarget(target) {
  if (!target || !target.id || !FLOATING_INPUT_IDS.includes(target.id)) return null;
  return target;
}

function setKeyboardOffset(value) {
  document.documentElement.style.setProperty("--hs-kb-offset", value + "px");
}

function floatingRowForInput(input) {
  return input.closest(".input-row, .composer");
}

export function installKeyboardFloater() {
  const vv = window.visualViewport;
  let rafId = 0;
  function readKeyboardOffset() {
    if (!vv || !floatingInputEl) return 0;
    return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  }
  function pushOffset() {
    setKeyboardOffset(readKeyboardOffset());
    if (floatingInputEl && (window.scrollY || window.pageYOffset)) window.scrollTo(0, 0);
  }
  function scheduleUpdate() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      pushOffset();
    });
  }
  document.addEventListener("focusin", (e) => handleFloatingFocusIn(e, pushOffset));
  document.addEventListener("focusout", handleFloatingFocusOut);
  bindViewportKeyboardListeners(vv, scheduleUpdate);
  function pulse() {
    if (floatingInputEl) pushOffset();
    requestAnimationFrame(pulse);
  }
  requestAnimationFrame(pulse);
}

function handleFloatingFocusIn(e, pushOffset) {
  const t = floatingInputFromTarget(e.target);
  if (!t) return;
  floatingInputEl = t;
  const row = floatingRowForInput(t);
  if (row) row.classList.add("kb-floating");
  document.body.classList.add("hs-keyboard-open");
  pushOffset();
}

function handleFloatingFocusOut(e) {
  const t = e.target;
  if (!t || t !== floatingInputEl) return;
  const row = floatingRowForInput(t);
  if (row) row.classList.remove("kb-floating");
  floatingInputEl = null;
  document.body.classList.remove("hs-keyboard-open");
  setKeyboardOffset(0);
}

function bindViewportKeyboardListeners(vv, scheduleUpdate) {
  if (!vv) return;
  vv.addEventListener("resize", scheduleUpdate);
  vv.addEventListener("scroll", scheduleUpdate);
}
