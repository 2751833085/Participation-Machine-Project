/**
 * Live run page — timer and checkpoint photo uploads.
 * Template mirrors ClassicalRun / NeoRun in _design-v2.
 */


import { escapeHtml, formatCountdown } from "./page-html.js";
import { renderAppShell } from "./page-shell.js";
const FIREBASE_PATH = "../firebase-init.js";
const STATE_PATH = "../lib/state.js";
const CHALLENGES_PATH = "../services/challenges.js";
const ATTEMPTS_PATH = "../services/attempts.js";
const GEO_FLAGS_PATH = "../lib/geo-flags.js";
const GEO_RULES_PATH = "../lib/geo-hunt-rules.js";
const RUN_SOCIAL_PATH = "../services/run-social.js";
const USERS_PATH = "../services/users.js";
const LOGIN_PAGE_PATH = "./login.js";

let auth;
let saveAuthReturn;
let getChallenge;
let getAttempt;
let watchAttempt;
let markLost;
let REQUIRE_PHOTO_GPS_PROOF;
let PHOTO_PROOF_MAX_AGE_MINUTES;
let PHOTO_PROOF_MAX_DISTANCE_M;
let uploadRunPhoto;
let awardMerit;
let loginPage;
let runDepsPromise;

async function loadRunDeps() {
  if (!runDepsPromise) {
    runDepsPromise = Promise.all([
      import(FIREBASE_PATH),
      import(STATE_PATH),
      import(CHALLENGES_PATH),
      import(ATTEMPTS_PATH),
      import(GEO_FLAGS_PATH),
      import(GEO_RULES_PATH),
      import(RUN_SOCIAL_PATH),
      import(USERS_PATH),
      import(LOGIN_PAGE_PATH),
    ]).then(([firebase, state, challenges, attempts, geoFlags, geoRules, runSocial, users, login]) => {
      auth = firebase.auth;
      saveAuthReturn = state.saveAuthReturn;
      getChallenge = challenges.getChallenge;
      getAttempt = attempts.getAttempt;
      watchAttempt = attempts.watchAttempt;
      markLost = attempts.markLost;
      REQUIRE_PHOTO_GPS_PROOF = geoFlags.REQUIRE_PHOTO_GPS_PROOF;
      PHOTO_PROOF_MAX_AGE_MINUTES = geoRules.PHOTO_PROOF_MAX_AGE_MINUTES;
      PHOTO_PROOF_MAX_DISTANCE_M = geoRules.PHOTO_PROOF_MAX_DISTANCE_M;
      uploadRunPhoto = runSocial.uploadRunPhoto;
      awardMerit = users.awardMerit;
      loginPage = login;
    });
  }
  return runDepsPromise;
}

let runAttemptUnsub = null;
let runTimerId = null;

function wireRunCheckpointUploads(attemptId, challengeId) {
  const host = document.getElementById("run-checks");
  if (!host || host.dataset.uploadWired === "1") return;
  host.dataset.uploadWired = "1";
  host.addEventListener("change", async (e) => {
    await handleRunCheckpointUpload(e.target, attemptId, challengeId);
  });
}

async function handleRunCheckpointUpload(input, attemptId, challengeId) {
  if (!isCheckpointPhotoInput(input)) return;
  const file = input.files?.[0];
  const spotIndex = checkpointInputSpotIndex(input);
  if (!file || spotIndex < 0) return;
  try {
    const { won } = await uploadRunPhoto({
      challengeId,
      attemptId,
      file,
      spotIndex,
    });
    input.value = "";
    if (won) await awardMerit();
  } catch (err) {
    alert(err.message || "Upload failed.");
  }
}

function isCheckpointPhotoInput(input) {
  return Boolean(input?.classList?.contains("run-check-photo-input"));
}

function checkpointInputSpotIndex(input) {
  const spotIndex = parseInt(input.dataset.spotIndex, 10);
  return Number.isInteger(spotIndex) && spotIndex >= 0 ? spotIndex : -1;
}

/**
 * Split the deadline-remaining millis into "MM:SS" parts so we can
 * render big tabular numerals with a muted colon between them.
 */
function splitCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return { mm, ss };
}

function trailChipsHtml(spots, found, activeIdx, status) {
  return spots
    .map((s, i) => {
      const done = found.includes(i);
      const isActive = status === "active" && i === activeIdx;
      const cls = [
        "run-trail-chip",
        done ? "is-done" : "",
        isActive ? "is-active" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const badge = done
        ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>'
        : String(i + 1);
      return `
        <div class="${cls}">
          <span class="run-trail-chip__num">${badge}</span>
          <span class="run-trail-chip__label">Checkpoint ${i + 1}</span>
          ${isActive ? '<span class="run-trail-chip__now">NOW</span>' : ""}
        </div>
      `;
    })
    .join("");
}

function checkpointListHtml({ spots, found, status, activeIdx, captureAttr, runProofHint }) {
  return spots
    .map((s, i) => {
      const done = found.includes(i);
      const frozen = status !== "active";
      const isActive = status === "active" && i === activeIdx;
      let action = "";
      if (status === "active" && !done) {
        action = `
          <div class="run-check-upload-row">
            <input type="file" id="run-cp-${i}" class="sr-only run-check-photo-input" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"${captureAttr} data-spot-index="${i}" aria-label="Take photo for checkpoint ${i + 1}" />
            <label for="run-cp-${i}" class="btn btn-secondary btn-small run-check-upload-label">Take checkpoint photo</label>
            <p class="run-check-upload-hint">${runProofHint}</p>
          </div>`;
      } else if (done) {
        action =
          '<p class="run-check-done"><span class="run-done-pill">Photo submitted</span></p>';
      } else if (frozen && !done) {
        action = '<p class="run-check-missed">Not completed</p>';
      }
      const cardCls = [
        "run-spot",
        done ? "run-spot--done" : "",
        isActive ? "run-spot--active" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `
        <div class="${cardCls}">
          <div class="run-spot__head">
            <div class="run-spot__num">${done
              ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>'
              : String(i + 1)}</div>
            <div class="run-spot__thumb"><img src="${escapeHtml(s.imageUrl)}" alt="" loading="lazy" /></div>
            <div class="run-spot__meta">
              <div class="run-spot__label">Checkpoint ${i + 1}</div>
              ${s.hint ? `<div class="run-spot__hint">${escapeHtml(s.hint)}</div>` : ""}
            </div>
            ${isActive ? '<span class="run-spot__now">NOW</span>' : ""}
          </div>
          ${action ? `<div class="run-spot__action">${action}</div>` : ""}
        </div>
      `;
    })
    .join("");
}

function runPageErrorHtml(message) {
  return `<div class="page-narrow"><div class="status-banner error">${escapeHtml(message)}</div><p><a href="#/" class="back-link">← Home</a></p></div>`;
}

function activeCheckpointIndex(spots, found) {
  for (let i = 0; i < spots.length; i++) {
    if (!found.includes(i)) return i;
  }
  return -1;
}

function runStatusBannerHtml(status) {
  if (status === "won") {
    return '<div class="status-banner ok run-state-banner">You finished in time. Merits added to your profile.</div>';
  }
  if (status === "lost") {
    return '<div class="status-banner error run-state-banner">Time is up. Try another hunt.</div>';
  }
  return "";
}

function runStatePill(status, activeIdx, activeNum, totalSpots) {
  if (status === "won") return "Finished";
  if (status === "lost") return "Time up";
  if (activeIdx >= 0) return `Live · Checkpoint ${activeNum} of ${totalSpots}`;
  return `Live · ${totalSpots} of ${totalSpots}`;
}

function runNextHeading(status, activeIdx, activeNum, activeHint) {
  if (status !== "active" || activeIdx < 0) {
    return escapeHtml(status === "won" ? "All checkpoints cleared" : "Run ended");
  }
  return activeHint
    ? escapeHtml(activeHint)
    : `Capture<br/>Checkpoint ${activeNum}`;
}

function runUploadTargetHtml(status, activeIdx, activeNum, nextHeadingStack, runProofHint) {
  if (status !== "active" || activeIdx < 0) return "";
  return `
    <div class="run-next">
      <div class="run-next__kicker">Next · Checkpoint ${activeNum}</div>
      <div class="run-next__title">${nextHeadingStack}</div>
      <div class="run-next-card">
        <div class="run-next-card__camera-icon" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="4"/></svg>
        </div>
        <div class="run-next-card__camera-title">Snap the photo</div>
        <div class="run-next-card__camera-sub">Scroll to the checkpoint below · ${escapeHtml(runProofHint)}</div>
      </div>
    </div>`;
}

function buildRunViewModel(ctx, data) {
  const { spots, totalSpots, runProofHint, captureAttr, huntHint, title, area } = ctx;
  const found = data.foundSpotIndices ?? [];
  const status = data.status || "active";
  const deadlineMs = data.deadlineAt.toMillis();
  const startedMs = data.startedAt.toMillis();
  const left = Math.max(0, deadlineMs - Date.now());
  const totalMs = Math.max(1, deadlineMs - startedMs);
  const pct =
    status === "active"
      ? Math.min(100, (left / totalMs) * 100)
      : status === "won"
        ? 100
        : 0;
  const activeIdx = activeCheckpointIndex(spots, found);
  const activeNum = activeIdx >= 0 ? activeIdx + 1 : totalSpots;
  const activeHint = activeIdx >= 0 ? (spots[activeIdx]?.hint || "") : "";
  const { mm, ss } = splitCountdown(left);
  const stateBanner = runStatusBannerHtml(status);
  const statePill = runStatePill(status, activeIdx, activeNum, totalSpots);
  const nextHeadingStack = runNextHeading(status, activeIdx, activeNum, activeHint);
  const uploadTargetHtml = runUploadTargetHtml(
    status,
    activeIdx,
    activeNum,
    nextHeadingStack,
    runProofHint,
  );
  const checks = checkpointListHtml({
    spots,
    found,
    status,
    activeIdx,
    captureAttr,
    runProofHint,
  });
  const trail = trailChipsHtml(spots, found, activeIdx, status);
  const hintBlock = huntHint
    ? `<p class="run-hunt-hint">${escapeHtml(huntHint)}</p>`
    : "";

  return {
    area,
    checks,
    deadlineMs,
    hintBlock,
    mm,
    pct,
    ss,
    stateBanner,
    statePill,
    status,
    title,
    trail,
    uploadTargetHtml,
  };
}

function runLayoutHtml(vm) {
  const {
    area,
    checks,
    hintBlock,
    mm,
    pct,
    ss,
    stateBanner,
    statePill,
    status,
    title,
    trail,
    uploadTargetHtml,
  } = vm;
  return `
    <div class="run-page run-status--${escapeHtml(status)}">
      <div class="run-topbar">
        <a href="#/" class="run-topbar__back" aria-label="Back to home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </a>
        <div class="run-topbar__kicker">${escapeHtml(statePill)}</div>
        <div class="run-topbar__spacer" aria-hidden="true"></div>
      </div>

      <div class="run-timer-card">
        <div class="run-timer-card__head">
          <div class="run-timer-card__k">
            <span class="run-timer-card__dot" aria-hidden="true"></span>
            <span>${escapeHtml(statePill)}</span>
          </div>
          <div class="run-timer-card__state">${status === "active" ? "Time remaining" : status === "won" ? "Completed" : "Ended"}</div>
        </div>
        <div class="run-timer-card__clock" id="run-timer-clock">
          <span id="run-timer-mm">${mm}</span><span class="run-timer-card__sep">:</span><span id="run-timer-ss">${ss}</span>
        </div>
        <div class="run-timer-card__bar"><div id="run-timer-inner" class="run-timer-card__fill" style="width:${pct}%"></div></div>
      </div>

      <div id="run-banner" class="run-banner-slot">${stateBanner}</div>

      <div class="run-heading">
        <div class="run-heading__kicker">${escapeHtml(title)}${area ? ` · ${escapeHtml(area)}` : ""}</div>
        ${hintBlock}
      </div>

      ${uploadTargetHtml}

      <div class="run-trail">
        <div class="run-trail__title">Trail</div>
        <div class="run-trail__chips" id="run-trail">${trail}</div>
      </div>

      <div class="run-checkpoints">
        <div class="run-checkpoints__title">Checkpoints</div>
        <div id="run-checks" class="run-checkpoints__list">${checks}</div>
      </div>

      <p class="run-review-hint">After your run, open this hunt and tap <strong>Review — photos from this hunt</strong> to see the shared gallery.</p>
    </div>
  `;
}

async function mountOrPatchRunLayout(ctx, vm) {
  if (!ctx.layoutMounted) {
    await renderAppShell(runLayoutHtml(vm), "home");
    ctx.layoutMounted = true;
    wireRunCheckpointUploads(ctx.attemptId, ctx.challengeId);
    return;
  }
  patchRunLayoutDom(vm);
}

function patchRunLayoutDom(vm) {
  const bannerEl = document.getElementById("run-banner");
  if (bannerEl) bannerEl.innerHTML = vm.stateBanner;
  const inner = document.getElementById("run-timer-inner");
  if (inner) inner.style.width = `${vm.pct}%`;
  const mmEl = document.getElementById("run-timer-mm");
  const ssEl = document.getElementById("run-timer-ss");
  if (mmEl) mmEl.textContent = vm.mm;
  if (ssEl) ssEl.textContent = vm.ss;
  const checksEl = document.getElementById("run-checks");
  if (checksEl) checksEl.innerHTML = vm.checks;
  const trailEl = document.getElementById("run-trail");
  if (trailEl) trailEl.innerHTML = vm.trail;
  const page = document.querySelector(".run-page");
  if (page) page.className = `run-page run-status--${vm.status}`;
}

function startRunDeadlineTimer(attemptId, status, deadlineMs) {
  if (status !== "active") return;
  const deadline = deadlineMs;
  runTimerId = setInterval(async () => {
    const l = Math.max(0, deadline - Date.now());
    const parts = splitCountdown(l);
    const mmEl = document.getElementById("run-timer-mm");
    const ssEl = document.getElementById("run-timer-ss");
    if (mmEl) mmEl.textContent = parts.mm;
    if (ssEl) ssEl.textContent = parts.ss;
    // Keep the legacy #time-left element absent; downstream consumers
    // should use formatCountdown via watchers. Kept formatCountdown
    // import for parity with prior behaviour/tests.
    void formatCountdown;
    if (Date.now() > deadline) {
      clearInterval(runTimerId);
      runTimerId = null;
      try {
        await markLost(attemptId);
      } catch {
        /* ignore */
      }
    }
  }, 1000);
}

async function renderRunSlice(ctx, data) {
  if (runTimerId) {
    clearInterval(runTimerId);
    runTimerId = null;
  }
  const vm = buildRunViewModel(ctx, data);
  await mountOrPatchRunLayout(ctx, vm);
  startRunDeadlineTimer(ctx.attemptId, vm.status, vm.deadlineMs);
}

export async function render(attemptId) {
  await loadRunDeps();
  if (!renderRunRequiresUser(attemptId)) return;

  await renderAppShell('<p class="loading">Starting run…</p>', "home");

  try {
    const runCtx = await buildRunContext(attemptId);
    if (!runCtx) return;
    runAttemptUnsub = watchAttempt(attemptId, (data) => {
      void renderRunSlice(runCtx, data);
    });
  } catch (err) {
    await renderAppShell(runPageErrorHtml(err.message));
  }
}

function renderRunRequiresUser(attemptId) {
  if (auth.currentUser) return true;
  saveAuthReturn(`#/run/${attemptId}`);
  loginPage.render();
  return false;
}

async function buildRunContext(attemptId) {
  const attempt = await getAttempt(attemptId);
  if (!attempt) {
    await renderAppShell(runPageErrorHtml("Run not found."));
    return null;
  }
  if (attempt.userId !== auth.currentUser.uid) {
    await renderAppShell(runPageErrorHtml("This run belongs to another player."));
    return null;
  }
  const challenge = await getChallenge(attempt.challengeId);
  if (!challenge) {
    await renderAppShell(runPageErrorHtml("Challenge missing."));
    return null;
  }
  return runContextFromChallenge(attemptId, challenge);
}

function runContextFromChallenge(attemptId, challenge) {
  const spots = challenge.spots ?? [];
  return {
    area: challenge.areaLabel || "",
    attemptId,
    captureAttr: REQUIRE_PHOTO_GPS_PROOF ? ' capture="environment"' : "",
    challengeId: challenge.id,
    huntHint: String(challenge.huntHint || "").trim(),
    layoutMounted: false,
    runProofHint: runProofHintText(),
    spots,
    title: challenge.title || "Hunt",
    totalSpots: spots.length,
  };
}

function runProofHintText() {
  return REQUIRE_PHOTO_GPS_PROOF
    ? `Use the camera (gallery usually fails). Photo needs GPS, within the last ${PHOTO_PROOF_MAX_AGE_MINUTES} minutes and within ${PHOTO_PROOF_MAX_DISTANCE_M} m of this checkpoint.`
    : "GPS proof is temporarily off — camera or gallery both work.";
}

export function cleanup() {
  if (runAttemptUnsub) {
    runAttemptUnsub();
    runAttemptUnsub = null;
  }
  if (runTimerId) {
    clearInterval(runTimerId);
    runTimerId = null;
  }
}
