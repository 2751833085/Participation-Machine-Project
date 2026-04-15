/**
 * Create-a-hunt page — multi-spot form with image upload.
 */

import { auth } from "../firebase-init.js";
import { renderShell } from "../components/shell.js";
import { openConfirmModal, showPublishSuccessOverlay } from "../components/modal.js";
import { escapeHtml } from "../lib/utils.js";
import { nav } from "../lib/router.js";
import { saveAuthReturn } from "../lib/state.js";
import { ensureUser } from "../services/auth.js";
import {
  MAX_SPOTS,
  MIN_SPOTS,
  createChallenge,
  inferManhattanPoint,
} from "../services/challenges.js";
import * as loginPage from "./login.js";

function spotRowHtml(i) {
  return `
    <div class="spot-row" data-spot-index="${i}">
      <div class="form-field">
        <label>Checkpoint photo ${i + 1}</label>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required />
      </div>
      <div class="form-field">
        <label>Hint (optional)</label>
        <input type="text" name="hint" placeholder="Landmark or street clue" />
      </div>
    </div>
  `;
}

export function render() {
  if (!auth.currentUser) {
    saveAuthReturn("#/create-list");
    loginPage.render();
    return;
  }

  let spotCount = MIN_SPOTS;
  const rows = () =>
    Array.from({ length: spotCount }, (_, i) => spotRowHtml(i)).join("");

  renderShell(
    `
    <div class="page-narrow">
      <a href="#/" class="back-link" aria-label="Back to all hunts">← All hunts</a>
      <h1 class="h1">Multiple checkpoints</h1>
      <p class="lead">Upload at least one photo per checkpoint. Images are stored as JPEG. We still try to place the hunt from your area text on the map for player check-ins. For an exact pin, use <a href="#/create/classic">Create a hunt</a> with the map.</p>
      <div id="create-status"></div>
      <form id="create-form" class="card stack">
      <div class="form-field">
        <label for="title">Title</label>
        <input id="title" name="title" type="text" required maxlength="80" placeholder="Union Square sprint" />
      </div>
      <div class="form-field">
        <label for="area">Area / neighborhood</label>
        <input id="area" name="area" type="text" required maxlength="80" placeholder="Union Square, Manhattan" />
      </div>
      <div class="form-field">
        <label for="minutes">Time limit (minutes)</label>
        <input id="minutes" name="minutes" type="number" min="5" max="180" value="30" required />
      </div>
      <div class="form-field">
        <label for="hunt-hint">Whole hunt hint <span class="label-optional">(optional)</span></label>
        <input id="hunt-hint" name="huntHint" type="text" maxlength="300" placeholder="Optional clue for the entire hunt" />
      </div>
      <div id="spot-rows" class="spot-rows">${rows()}</div>
      <div class="stack" style="flex-direction: row; flex-wrap: wrap;">
        <button type="button" class="btn btn-ghost" id="add-spot">Add checkpoint</button>
        <button type="button" class="btn btn-ghost" id="remove-spot">Remove last</button>
      </div>
      <button type="submit" class="btn btn-primary btn-block" id="submit-create">Publish hunt</button>
    </form>
    </div>
  `,
    "create-list",
  );

  const spotRowsEl = document.getElementById("spot-rows");
  const statusEl = document.getElementById("create-status");
  const form = document.getElementById("create-form");

  document.getElementById("add-spot").addEventListener("click", () => {
    if (spotCount >= MAX_SPOTS) return;
    spotCount += 1;
    spotRowsEl.innerHTML = rows();
  });

  document.getElementById("remove-spot").addEventListener("click", () => {
    if (spotCount <= MIN_SPOTS) return;
    spotCount -= 1;
    spotRowsEl.innerHTML = rows();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.innerHTML = "";
    const btn = document.getElementById("submit-create");

    try {
      const title = document.getElementById("title").value.trim();
      const areaLabel = document.getElementById("area").value.trim();
      const timeLimitMinutes = parseInt(
        document.getElementById("minutes").value,
        10,
      );

      const rowEls = spotRowsEl.querySelectorAll(".spot-row");
      if (rowEls.length < MIN_SPOTS) {
        throw new Error(
          `Add at least ${MIN_SPOTS} checkpoint${MIN_SPOTS > 1 ? "s" : ""}.`,
        );
      }

      const files = [];
      const hints = [];
      rowEls.forEach((row) => {
        const input = row.querySelector('input[type="file"]');
        const hint =
          row.querySelector('input[name="hint"]')?.value.trim() ?? "";
        if (!input?.files?.[0])
          throw new Error("Each checkpoint needs a photo.");
        files.push(input.files[0]);
        hints.push(hint);
      });

      const huntHint =
        document.getElementById("hunt-hint")?.value.trim() || "";

      const confirmed = await openConfirmModal({
        title: "Publish this hunt?",
        message:
          "Are you sure?\n\nOnce uploaded, your hunt cannot be undone for now.",
        confirmText: "Publish",
        cancelText: "Cancel",
        animate: true,
      });
      if (!confirmed) return;

      btn.disabled = true;

      await ensureUser();
      statusEl.innerHTML =
        '<div class="status-banner info">Publishing…</div>';

      const anchor = inferManhattanPoint({ areaLabel });
      const spotLatLngs = anchor
        ? files.map(() => ({ lat: anchor.lat, lng: anchor.lng }))
        : undefined;
      const newChallengeId = await createChallenge({
        title,
        areaLabel,
        timeLimitMinutes,
        files,
        hints,
        huntHint,
        ...(anchor
          ? { lat: anchor.lat, lng: anchor.lng, spotLatLngs }
          : {}),
      });

      await showPublishSuccessOverlay({
        title: "Published!",
        message: "Opening photos & comments for your hunt…",
      });
      nav(`#/hunt-review/${newChallengeId}`);
    } catch (err) {
      statusEl.innerHTML = `<div class="status-banner error">${escapeHtml(err.message || "Could not publish.")}</div>`;
      btn.disabled = false;
    }
  });
}

export function cleanup() {}
