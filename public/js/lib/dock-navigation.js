/**
 * Bottom dock hash links: force SPA route flush (WebKit / in-app browsers).
 */

import { requestRoute } from "./route-events.js";
import { agentDebugLog } from "./agent-log.js";

let lastDockPointerDownTs = 0;
let lastDockPointerDownHref = "";

function setOptimisticDockActive(targetTab) {
  if (!(targetTab instanceof HTMLElement)) return;
  const dock = targetTab.closest(".app-dock");
  if (!dock) return;
  dock.querySelectorAll(".mobile-tab.is-active").forEach((el) => {
    if (el !== targetTab) el.classList.remove("is-active");
  });
  targetTab.classList.add("is-active");
  dock.querySelectorAll(".mobile-tab").forEach((tabEl) => {
    if (!(tabEl instanceof HTMLElement)) return;
    const iconHost = tabEl.querySelector(".mobile-tab-icon, .mobile-tab-plus-circle");
    if (!(iconHost instanceof HTMLElement)) return;
    const idle = iconHost.getAttribute("data-icon-idle");
    const active = iconHost.getAttribute("data-icon-active");
    if (!idle || !active) return;
    const nextHtml = tabEl.classList.contains("is-active") ? decodeURIComponent(active) : decodeURIComponent(idle);
    iconHost.innerHTML = nextHtml;
  });
}

function logDockIconState(tab, phase) {
  if (!(tab instanceof HTMLElement)) return;
  const iconWrap = tab.querySelector(".mobile-tab-icon");
  const iconSvg = iconWrap?.querySelector("svg");
  if (!(iconWrap instanceof HTMLElement) || !(iconSvg instanceof SVGElement)) return;
  const wrapCs = window.getComputedStyle(iconWrap);
  const svgCs = window.getComputedStyle(iconSvg);
  // #region agent log
  agentDebugLog("run8", "H18", "public/js/lib/dock-navigation.js:logDockIconState", "dock-icon-state", {
    phase,
    href: tab.getAttribute("href") || "",
    tabClass: tab.className,
    isActive: tab.classList.contains("is-active"),
    wrapTransition: wrapCs.transitionDuration,
    wrapTransform: wrapCs.transform,
    wrapBoxShadow: wrapCs.boxShadow,
    svgTransition: svgCs.transitionDuration,
    svgColor: svgCs.color,
    svgFillComputed: svgCs.fill,
    svgStroke: iconSvg.getAttribute("stroke") || "",
    svgFill: iconSvg.getAttribute("fill") || "",
  });
  // #endregion
}

function dockHashLinkFromEvent(e) {
  const a = e.target.closest?.("a[href^='#/']");
  if (!a || !a.closest(".app-dock")) return null;
  const href = a.getAttribute("href");
  if (!href || !href.startsWith("#/")) return null;
  return { a, href };
}

function handleDockPointerDown(e) {
  const link = dockHashLinkFromEvent(e);
  if (!link) return;
  lastDockPointerDownTs = Date.now();
  lastDockPointerDownHref = link.href;
  // #region agent log
  agentDebugLog("run10", "H24", "public/js/lib/dock-navigation.js:pointerdown", "dock-pointerdown", {
    href: link.href,
    hashBefore: location.hash || "#/",
    pointerType: e.pointerType || "",
  });
  // #endregion
}

function shouldHandleDockClick(e) {
  return !e.defaultPrevented
    && e.button === 0
    && !e.metaKey
    && !e.ctrlKey
    && !e.shiftKey
    && !e.altKey;
}

function logDockClick(a, href, pointerToClickMs) {
  // #region agent log
  agentDebugLog("run10", "H24", "public/js/lib/dock-navigation.js:click", "dock-click-delay", {
    href,
    pointerToClickMs,
    hadMatchingPointerDown: lastDockPointerDownHref === href,
  });
  // #endregion
  logDockIconState(a, "before-active");
  setOptimisticDockActive(a);
  logDockIconState(a, "after-active");
  requestAnimationFrame(() => logDockIconState(a, "after-1raf"));
  // #region agent log
  agentDebugLog("run7", "H17", "public/js/lib/dock-navigation.js:click", "dock-click-routed", {
    href,
    hashBefore: location.hash || "#/",
    tabClass: a.className,
  });
  // #endregion
}

function handleDockClick(e) {
  if (!shouldHandleDockClick(e)) return;
  const link = dockHashLinkFromEvent(e);
  if (!link) return;
  e.preventDefault();
  const { a, href } = link;
  const pointerToClickMs =
    lastDockPointerDownHref === href && lastDockPointerDownTs > 0
      ? Date.now() - lastDockPointerDownTs
      : -1;
  logDockClick(a, href, pointerToClickMs);
  /* Every dock tap force-flushes the route — including taps on the
     already-active tab — so the page always reloads (matches the
     create behavior the user pointed at). Without `force`, tapping
     the active tab is a no-op because the hash doesn't change and
     no hashchange event fires. The cross-tab branch also goes
     through `force` for consistency with the original WebKit /
     in-app-browser fallback this file was written for. */
  if (location.hash !== href) {
    location.hash = href;
  }
  requestRoute(true);
  scrollAppToTop();
}

export function installDockHashNavigation() {
  document.addEventListener(
    "pointerdown",
    handleDockPointerDown,
    true,
  );

  document.addEventListener(
    "click",
    handleDockClick,
    false,
  );
}

/**
 * Scroll the main content area back to the top. The NeoUI shell uses
 * window scrolling (no overflow on #app-main), so window + documentElement
 * both need a nudge. Uses instant behaviour so the reset feels snappy on
 * dock taps rather than animating a long scroll on tall pages.
 */
function scrollAppToTop() {
  const doIt = () => {
    try {
      // instant: Safari occasionally ignores behavior:"smooth" during
      // hashchange, and this is a navigation-style reset, not a gesture.
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch {
      window.scrollTo(0, 0);
    }
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    // If any inner scroll container exists, reset it too.
    const main = document.getElementById("app-main");
    if (main) main.scrollTop = 0;
  };
  doIt();
  // Re-apply after the router re-renders on next frame so we land at top
  // even when requestRoute() swaps the DOM after we first reset.
  requestAnimationFrame(doIt);
}
