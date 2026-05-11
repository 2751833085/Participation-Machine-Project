/**
 * Create entry — choose hunt mode (standard map hunt vs. experimental Hide & Seek).
 * Design: Neo color-block tile list (matches NeoCreate idiom, extras.jsx).
 */


import { renderAppShell } from "./page-shell.js";
const ROUTER_PATH = "../lib/router.js";
const MODAL_PATH = "../components/modal.js";
const AGENT_LOG_PATH = "../lib/agent-log.js";

let nav;
let openConfirmModal;
let agentDebugLog;
let createPickerDepsPromise;

async function loadCreatePickerDeps() {
  if (!createPickerDepsPromise) {
    createPickerDepsPromise = Promise.all([
      import(ROUTER_PATH),
      import(MODAL_PATH),
      import(AGENT_LOG_PATH),
    ]).then(([router, modal, agentLog]) => {
      nav = router.nav;
      openConfirmModal = modal.openConfirmModal;
      agentDebugLog = agentLog.agentDebugLog;
    });
  }
  return createPickerDepsPromise;
}

const BEAKER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v7l-5 9a2 2 0 0 0 1.73 3h10.54A2 2 0 0 0 19 19l-5-9V3"/><path d="M7.5 15h9"/></svg>`;

const NE_ARROW_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7 M8 7 H17 V16"/></svg>`;

export function cleanup() {}

export async function render() {
  await loadCreatePickerDeps();
  await renderAppShell(
    `
    <div class="create-mode-page">
      <section class="create-mode-head">
        <div class="create-mode-head__kicker">Choose a mode</div>
        <h1 class="create-mode-head__title">Start<br/>a hunt.</h1>
      </section>

      <div class="create-mode-list" role="list">
        <a class="create-mode-slab" data-tint="peach" href="#/create/classic" role="listitem">
          <div class="create-mode-slab__kicker">Classic &middot; ready</div>
          <div class="create-mode-slab__title">Map &amp;<br/>Timer.</div>
          <p class="create-mode-slab__desc">Manhattan checkpoint, timer, and hints &mdash; then publish.</p>
          <div class="create-mode-slab__cta">Continue ${NE_ARROW_ICON}</div>
        </a>
        <a class="create-mode-slab create-mode-slab--experimental" data-tint="lav" href="/game/" role="listitem" id="create-hideseek-tile">
          <span class="create-mode-slab__badge" aria-label="Experimental feature">${BEAKER_ICON} Experimental</span>
          <div class="create-mode-slab__kicker">Friends online &middot; beta</div>
          <div class="create-mode-slab__title">Hide &amp;<br/>Seek.</div>
          <p class="create-mode-slab__desc">Room for friends, roles, and clues &mdash; rough edges while we test.</p>
          <div class="create-mode-slab__cta">Try it ${NE_ARROW_ICON}</div>
        </a>
      </div>
    </div>
  `,
    "create",
    { hideHeader: true },
  );

  const backBtn = document.getElementById("create-mode-back");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (window.history.length > 1) window.history.back();
      else nav("#/");
    });
  }

  /* Hide & Seek is gated behind an experimental-warning confirm modal.
     On confirm we open the dedicated friends-mode interface at /game/. */
  const hsTile = document.getElementById("create-hideseek-tile");
  if (hsTile) {
    hsTile.addEventListener("click", async (e) => {
      e.preventDefault();
      const ok = await openConfirmModal({
        title: "Experimental mode",
        message:
          "Hide & Seek is an early experiment. Tapping Continue opens the dedicated friends interface. Expect rough edges and changes while we test.",
        confirmText: "Continue",
        cancelText: "Not now",
      });
      if (ok) window.location.assign("/game/");
    });
  }

  const firstSlab = document.querySelector(".create-mode-slab");
  const slabTitle = firstSlab?.querySelector(".create-mode-slab__title");
  if (firstSlab && slabTitle) {
    const slabCs = window.getComputedStyle(firstSlab);
    const titleCs = window.getComputedStyle(slabTitle);
    // #region agent log
    agentDebugLog("run3", "H8", "public/js/pages/create-picker.js:render", "create-dark-contrast-snapshot", {
      htmlClass: document.documentElement.className,
      dataTheme: document.documentElement.getAttribute("data-theme"),
      slabColor: slabCs.color,
      slabBg: slabCs.backgroundColor,
      titleColor: titleCs.color,
      titleWeight: titleCs.fontWeight,
    });
    // #endregion
  }
}
