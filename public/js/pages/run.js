/**
 * Live run page — timer and checkpoint photo uploads.
 */

import { auth } from "../firebase-init.js";
import { renderShell } from "../components/shell.js";
import { escapeHtml, formatCountdown } from "../lib/utils.js";
import { saveAuthReturn } from "../lib/state.js";
import { getChallenge } from "../services/challenges.js";
import {
  getAttempt,
  watchAttempt,
  markLost,
} from "../services/attempts.js";
import { REQUIRE_PHOTO_GPS_PROOF } from "../lib/geo-flags.js";
import {
  PHOTO_PROOF_MAX_AGE_MINUTES,
  PHOTO_PROOF_MAX_DISTANCE_M,
} from "../lib/geo-hunt-rules.js";
import { uploadRunPhoto } from "../services/run-social.js";
import { awardMerit } from "../services/users.js";
import * as loginPage from "./login.js";

let runAttemptUnsub = null;
let runTimerId = null;

function wireRunCheckpointUploads(attemptId, challengeId) {
  const host = document.getElementById("run-checks");
  if (!host || host.dataset.uploadWired === "1") return;
  host.dataset.uploadWired = "1";
  host.addEventListener("change", async (e) => {
    const inp = e.target;
    if (!inp?.classList?.contains("run-check-photo-input")) return;
    const f = inp.files?.[0];
    if (!f) return;
    const spotIndex = parseInt(inp.dataset.spotIndex, 10);
    if (!Number.isInteger(spotIndex) || spotIndex < 0) return;
    try {
      const { won } = await uploadRunPhoto({
        challengeId,
        attemptId,
        file: f,
        spotIndex,
      });
      inp.value = "";
      if (won) await awardMerit();
    } catch (err) {
      alert(err.message || "Upload failed.");
    }
  });
}

function layoutHtml({ challenge, banner, pct, checks, huntHint }) {
  const hintBlock = huntHint
    ? `<p class="card-meta run-hunt-hint">${escapeHtml(huntHint)}</p>`
    : "";
  return `
    <a href="#/" class="back-link">← Home</a>
    <h1 class="h1">${escapeHtml(challenge.title || "Hunt")}</h1>
    ${hintBlock}
    <div id="run-banner">${banner}</div>
    <div class="timer-bar" id="run-timer-bar"><div id="run-timer-inner" style="width:${pct}%"></div></div>
    <div class="card" id="run-checks">${checks}</div>
    <p class="card-meta run-review-hint">After your run, open this hunt and tap <strong>Review — photos from this hunt</strong> to see the shared gallery (other players appear after you submit at least one checkpoint photo).</p>
  `;
}

export async function render(attemptId) {
  if (!auth.currentUser) {
    saveAuthReturn(`#/run/${attemptId}`);
    loginPage.render();
    return;
  }

  renderShell('<p class="loading">Starting run…</p>', "home");

  try {
    const attempt = await getAttempt(attemptId);
    if (!attempt) {
      renderShell(
        '<div class="page-narrow"><div class="status-banner error">Run not found.</div><p><a href="#/" class="back-link">← Home</a></p></div>',
      );
      return;
    }

    if (attempt.userId !== auth.currentUser.uid) {
      renderShell(
        '<div class="page-narrow"><div class="status-banner error">This run belongs to another player.</div><p><a href="#/" class="back-link">← Home</a></p></div>',
      );
      return;
    }

    const challenge = await getChallenge(attempt.challengeId);
    if (!challenge) {
      renderShell(
        '<div class="page-narrow"><div class="status-banner error">Challenge missing.</div><p><a href="#/" class="back-link">← Home</a></p></div>',
      );
      return;
    }

    const spots = challenge.spots ?? [];
    const challengeId = challenge.id;
    const huntHint = String(challenge.huntHint || "").trim();
    const runProofHint = REQUIRE_PHOTO_GPS_PROOF
      ? `Use the camera (gallery usually fails). Photo needs GPS, must be within the last ${PHOTO_PROOF_MAX_AGE_MINUTES} minutes and within ${PHOTO_PROOF_MAX_DISTANCE_M} m of this checkpoint.`
      : "GPS proof is temporarily off — you can use the camera or choose a photo from your gallery.";
    const captureAttr = REQUIRE_PHOTO_GPS_PROOF ? ' capture="environment"' : "";

    let layoutMounted = false;

    const renderSlice = (data) => {
      if (runTimerId) {
        clearInterval(runTimerId);
        runTimerId = null;
      }

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

      const checks = spots
        .map((s, i) => {
          const done = found.includes(i);
          const frozen = status !== "active";
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
              '<p class="run-check-done"><span class="badge">Photo submitted</span></p>';
          } else if (frozen && !done) {
            action = '<p class="card-meta">Not completed</p>';
          }
          return `
            <div class="spot-check spot-check--run">
              <img src="${escapeHtml(s.imageUrl)}" alt="" loading="lazy" />
              <div class="body">
                <strong>Checkpoint ${i + 1}</strong>
                ${s.hint ? `<p class="card-meta">${escapeHtml(s.hint)}</p>` : ""}
                ${action}
              </div>
            </div>
          `;
        })
        .join("");

      let banner = "";
      if (status === "won") {
        banner =
          '<div class="status-banner ok">You finished in time. Merits added to your profile.</div>';
      } else if (status === "lost") {
        banner =
          '<div class="status-banner error">Time is up. Try another hunt!</div>';
      } else {
        banner = `<div class="status-banner info">Time left: <strong id="time-left">${formatCountdown(left)}</strong></div>`;
      }

      if (!layoutMounted) {
        renderShell(
          layoutHtml({
            challenge,
            banner,
            pct,
            checks,
            huntHint,
          }),
          "home",
        );
        layoutMounted = true;
        wireRunCheckpointUploads(attemptId, challengeId);
      } else {
        document.getElementById("run-banner").innerHTML = banner;
        const inner = document.getElementById("run-timer-inner");
        if (inner) inner.style.width = `${pct}%`;
        document.getElementById("run-checks").innerHTML = checks;
      }

      if (status === "active") {
        const deadline = deadlineMs;
        runTimerId = setInterval(async () => {
          const t = document.getElementById("time-left");
          if (t) {
            const l = Math.max(0, deadline - Date.now());
            t.textContent = formatCountdown(l);
          }
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
    };

    runAttemptUnsub = watchAttempt(attemptId, (data) => {
      renderSlice(data);
    });
  } catch (err) {
    renderShell(
      `<div class="page-narrow"><div class="status-banner error">${escapeHtml(err.message)}</div><p><a href="#/" class="back-link">← Home</a></p></div>`,
    );
  }
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
