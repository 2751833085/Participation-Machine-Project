/**
 * Create-map form → Firestore publish path.
 */
import { openConfirmModal, showPublishSuccessOverlay, escapeHtml, nav, ensureUser, createChallenge } from "./create-map-utils.js";
import { setStatus } from "./status.js";

/**
 * @param {object} p
 * @param {HTMLFormElement} p.form
 * @param {HTMLElement} p.statusEl
 * @param {HTMLInputElement} p.photoInput
 * @param {{ selected: { lat: number, lng: number } | null }} p.st
 * @param {() => Promise<string>} p.resolveAreaLabelForPublish
 */
export function attachCreateMapPublishHandler(p) {
  p.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleCreateMapPublish(p);
  });
}

async function handleCreateMapPublish(p) {
  const file = publishReadyFile(p);
  if (!file) return;
  if (!(await confirmCreateMapPublish())) return;

  const btn = document.getElementById("create-map-submit");
  btn.disabled = true;
  setStatus(p.statusEl, "");

  try {
    const draft = await readCreateMapPublishDraft(p, file, btn);
    if (!draft) return;
    const newChallengeId = await createChallenge(draft);
    await showPublishSuccessOverlay({
      title: "Published!",
      message: "Opening photos & comments for your hunt…",
    });
    nav(`#/hunt-review/${newChallengeId}`);
  } catch (err) {
    setStatus(
      p.statusEl,
      `<div class="status-banner error">${escapeHtml(err.message || "Could not publish.")}</div>`,
    );
    btn.disabled = false;
  }
}

function publishReadyFile(p) {
  if (!p.st.selected) {
    setStatus(
      p.statusEl,
      '<div class="status-banner error">Choose a place from search (or a green suggestion) first.</div>',
    );
    return null;
  }
  const file = p.photoInput.files?.[0];
  if (file) return file;
  setStatus(
    p.statusEl,
    '<div class="status-banner error">Add a checkpoint photo.</div>',
  );
  return null;
}

function confirmCreateMapPublish() {
  return openConfirmModal({
    title: "Publish this hunt?",
    message:
      "Are you sure?\n\nOnce uploaded, your hunt cannot be undone for now.",
    confirmText: "Publish",
    cancelText: "Cancel",
    animate: true,
  });
}

async function readCreateMapPublishDraft(p, file, btn) {
  await ensureUser();
  setStatus(
    p.statusEl,
    '<div class="status-banner info">Publishing…</div>',
  );
  const areaLabel = await resolveCreateMapAreaLabel(p, btn);
  if (!areaLabel) return null;
  const selected = p.st.selected;
  return {
    title: document.getElementById("create-map-title").value.trim(),
    areaLabel,
    timeLimitMinutes: parseInt(document.getElementById("create-map-minutes").value, 10),
    files: [file],
    hints: [document.getElementById("create-map-hint").value.trim() || ""],
    huntHint: document.getElementById("create-map-challenge-hint")?.value.trim() || "",
    lat: selected.lat,
    lng: selected.lng,
    spotLatLngs: [{ lat: selected.lat, lng: selected.lng }],
  };
}

async function resolveCreateMapAreaLabel(p, btn) {
  try {
    return await p.resolveAreaLabelForPublish();
  } catch (areaErr) {
    setStatus(
      p.statusEl,
      `<div class="status-banner error">${escapeHtml(areaErr.message || "Area is required.")}</div>`,
    );
    btn.disabled = false;
    return "";
  }
}
