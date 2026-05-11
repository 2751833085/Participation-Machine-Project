/**
 * Friends — in-game status tabs for hunters and runners.
 */
import { DEFAULT_SETTINGS, escapeHtml, fmtAgo, fmtClock, gameNow, state, tsMs } from "./render-room-runtime.js";
import { stalemateRemainMs } from "./helpers.js";
import { renderLoading } from "./loading-view.js";

export function renderGameStatus(me) {
  if (me.team === "hunter") return renderHunterStatus(me);
  if (me.team === "runner") return renderRunnerStatus(me);
  return renderLoading();
}

function renderHunterStatus(me) {
  const room = state.room;
  const runners = state.members.filter((m) => m.team === "runner");
  const aliveRunners = runners.filter((r) => !r.capturedAt);
  const lastCapMs = tsMs(room.lastCaptureAt) || tsMs(room.huntStartedAt);
  const stalemateMs = (room.stalemateMin || DEFAULT_SETTINGS.stalemateMin) * 60 * 1000;
  const sinceLast = gameNow() - lastCapMs;
  const stalemateIn = Math.max(0, stalemateMs - sinceLast);
  const myCaps = state.captures.filter((c) => c.captorUid === me.uid).length;

  return `
    <div class="hs-game-body">
      ${room.status === "stalemate"
        ? renderActionBanner("danger", "Hunters frozen", "Wait for the relocate window to end", fmtClock(stalemateRemainMs(room)), "pause")
        : renderActionBanner("warn", "Stalemate in", "Catch a runner to reset the timer", fmtClock(stalemateIn), "alert")
      }

      ${renderStatRow([
        ["Runners", `${aliveRunners.length} / ${runners.length}`],
        ["Stalemate in", fmtClock(stalemateIn), "alert"],
        ["Captures", myCaps],
      ])}

      ${runners.length === 0 ? `<div class="hs-empty">No runners assigned</div>` : runners.map((r) => renderHunterRunnerCard(r)).join("")}
    </div>
  `;
}

function renderHunterRunnerCard(r) {
  const captured = !!r.capturedAt;
  const lockMs = tsMs(r.lockExpiresAt);
  const _lockMaxMs = (state.room?.lockMin || DEFAULT_SETTINGS.lockMin) * 60 * 1000;
  const lockRemain = lockMs > 0 ? Math.max(0, Math.min(_lockMaxMs, lockMs - gameNow())) : 0;
  const cls = captured ? "captured" : (lockRemain > 0 ? "locked" : "relocating");
  const tag = captured ? "Caught" : (lockRemain > 0 ? "Locked" : "Moving");
  const ago = r.positionPhotoAt ? fmtAgo(gameNow() - tsMs(r.positionPhotoAt)) : null;
  const photoHtml = r.positionPhotoUrl
    ? `<img src="${escapeHtml(r.positionPhotoUrl)}" alt="${escapeHtml(r.name)} position" />`
    : `<div class="hs-runner-card-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7h4l2-3h6l2 3h4v12H3V7z"/><circle cx="12" cy="13" r="4"/></svg>
        <span>No photo yet</span>
      </div>`;
  const captor = captured ? state.captures.find((c) => c.targetUid === r.uid) : null;
  return `
    <div class="hs-hunter-runner-card ${cls}">
      <div class="photo">
        ${photoHtml}
        <div class="overlay">
          <div class="head">
            <span class="name">${escapeHtml(r.name)}</span>
            <span class="tag">${escapeHtml(tag)}</span>
          </div>
          ${captured
            ? `<div class="meta">Caught by <b>${escapeHtml(captor?.captorName || "?")}</b></div>`
            : `<div class="meta">${ago ? `Photo posted ${escapeHtml(ago)}` : "Waiting for photo"}</div>`
          }
        </div>
        ${captured ? "" : `<div class="clock">${escapeHtml(fmtClock(lockRemain))}<small>${lockRemain > 0 ? "until move" : "moving now"}</small></div>`}
      </div>
    </div>
  `;
}

function renderRunnerStatus(me) {
  const room = state.room;
  const lockMs = tsMs(me.lockExpiresAt);
  const _lockMaxMs = (state.room?.lockMin || DEFAULT_SETTINGS.lockMin) * 60 * 1000;
  const lockRemain = lockMs > 0 ? Math.max(0, Math.min(_lockMaxMs, lockMs - gameNow())) : 0;
  const isLocked = lockRemain > 0;
  const photoMissing = !me.positionPhotoUrl;
  const ago = me.positionPhotoAt ? fmtAgo(gameNow() - tsMs(me.positionPhotoAt)) : "";

  return `
    <div class="hs-game-body">
      ${photoMissing
        ? renderActionBanner("danger", "Take your position photo", `Stand still — photo locks for ${room.lockMin} min`, "", "camera")
        : (isLocked
          ? renderActionBanner("warn", "Stay still", "Don't move until this hits 0 — Hunters are using your photo", fmtClock(lockRemain), "lock")
          : renderActionBanner("danger", "Time to move", "Relocate and re-photo when you're settled", "", "move"))
      }

      <div class="hs-runner-photo-hero">
        <div class="frame">
          ${me.positionPhotoUrl ? `<img src="${escapeHtml(me.positionPhotoUrl)}" alt="" />` : ""}
          <div class="stamp">${photoMissing ? "No photo yet" : `Your position · ${escapeHtml(ago)}`}</div>
        </div>
        <div class="footnote">
          <div>${photoMissing ? "Hunters can't find you yet — take a photo to lock in" : "Hunters can see this image"}</div>
          <button type="button" class="hs-btn hs-btn-ghost hs-mini-action" data-action="take-position-photo" ${isLocked ? "disabled" : ""}>${photoMissing ? "Take photo" : "Retake"}</button>
        </div>
      </div>

      ${renderStatRow([
        ["Runners left", state.members.filter((m) => m.team === "runner" && !m.capturedAt).length],
        [isLocked ? "Move in" : "Lock in", isLocked ? fmtClock(lockRemain) : "—", "alert"],
        ["Hunters", state.members.filter((m) => m.team === "hunter").length],
      ])}
    </div>
  `;
}

function renderActionBanner(tone, title, subtitle, clock, icon) {
  return `
    <div class="hs-action-banner ${tone}">
      <div class="ico">${renderBannerIcon(icon)}</div>
      <div class="text"><b>${escapeHtml(title)}</b><small>${escapeHtml(subtitle)}</small></div>
      ${clock ? `<div class="clk">${escapeHtml(clock)}</div>` : ""}
    </div>
  `;
}

function renderBannerIcon(icon) {
  if (icon === "lock") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`;
  }
  if (icon === "camera") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h4l2-3h6l2 3h4v11H3V8z"/><circle cx="12" cy="13" r="3.5"/></svg>`;
  }
  if (icon === "pause") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="5" width="3" height="14" rx="1"/><rect x="14" y="5" width="3" height="14" rx="1"/></svg>`;
  }
  if (icon === "move") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18"/><path d="M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>`;
}

function renderStatRow(items) {
  return `
    <div class="hs-stat-row">
      ${items.map(([label, value, tone]) => `
        <div class="tile ${tone || ""}">
          <span class="lbl">${escapeHtml(label)}</span>
          <span class="val">${escapeHtml(String(value))}</span>
        </div>
      `).join("")}
    </div>
  `;
}
