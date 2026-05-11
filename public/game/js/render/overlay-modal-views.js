/**
 * Friends — modal overlay views.
 */
import { escapeHtml, getInitial, state } from "./render-overlay-runtime.js";
import { isInGame, roomStatus } from "./helpers.js";

export function renderModal() {
  const m = state.modal;
  if (!m) return "";
  const renderer = MODAL_RENDERERS[m.kind];
  return renderer ? renderer(m) : "";
}

function createConfirmModal() {
  const draft = state.createDraft;
  return modalHtml({
    icon: "+",
    title: "Create this room?",
    desc: "A 6-character invite code is generated immediately. You'll be the Host.",
    meta: [
      ["Room", draft.name || "Untitled"],
      ["Hunt", `${draft.huntMin} min`],
    ],
    actions: [
      { label: "Cancel", kind: "ghost", action: "close-modal" },
      { label: state.busy ? "Creating..." : "Confirm create", kind: "primary", action: "confirm-create-final" },
    ],
  });
}

function joinConfirmModal(m) {
  return modalHtml({
    icon: "→",
    title: `Join "${escapeHtml(m.payload.name)}"?`,
    desc: `Host: <b style="color:var(--ink)">${escapeHtml(m.payload.hostName)}</b>`,
    meta: [
      ["Code", m.payload.code],
      ["Players", `${m.payload.memberCount} in lobby`],
    ],
    actions: [
      { label: "Cancel", kind: "ghost", action: "close-modal" },
      { label: state.busy ? "Joining..." : "Confirm join", kind: "primary", action: "confirm-join-final" },
    ],
  });
}

function leaveConfirmModal() {
  const inGame = isInGame();
  return modalHtml({
    iconClass: "danger",
    icon: "⏻",
    title: inGame ? "Forfeit and leave?" : "Leave the room?",
    desc: inGame ? "You'll be removed from this game. Your captures stay on record." : "The room and your join will be removed.",
    actions: [
      { label: "Cancel", kind: "ghost", action: "close-modal" },
      { label: "Confirm leave", kind: "danger-solid", action: "leave-room-confirmed" },
    ],
  });
}

function disbandConfirmModal() {
  const inGame = isInGame() || roomStatus() === "dispersal" || roomStatus() === "ready_check";
  return modalHtml({
    iconClass: "danger",
    icon: "⚠",
    title: "Disband the room?",
    desc: `You're the <b style="color:var(--ink)">host</b>. ${inGame ? "Leaving will <b style=\"color:var(--danger)\">end the game for everyone</b> and the room will be deleted." : "The room will be deleted and any other players in it will be sent home."}`,
    actions: [
      { label: "Stay", kind: "ghost", action: "close-modal" },
      { label: "Disband room", kind: "danger-solid", action: "disband-room-confirmed" },
    ],
  });
}

function addFriendModal() {
  return modalHtml({
    icon: "+",
    title: "Add a friend",
    desc: "Enter your friend's 6-character code. They'll get a request to confirm.",
    content: `
      <input id="hs-add-friend-input" class="hs-input code-input" value="${escapeHtml(state.addFriendDraft || "")}" placeholder="ABCDEF" maxlength="8" autocomplete="off" autocapitalize="characters" inputmode="text" style="margin-bottom:10px" />
      ${state.addFriendError ? `<p style="color:var(--danger);font-size:12px;font-weight:600;margin-bottom:8px">${escapeHtml(state.addFriendError)}</p>` : ""}
    `,
    actions: [
      { label: "Cancel", kind: "ghost", action: "close-modal" },
      { label: state.busy ? "Sending..." : "Send request", kind: "primary", action: "send-friend-request" },
    ],
  });
}

function exitTourgoModal() {
  return modalHtml({
    iconClass: "danger",
    icon: "←",
    title: "Back to Tourgo?",
    desc: "Leave Friends and return to the main Tourgo app.",
    actions: [
      { label: "Stay", kind: "ghost", action: "close-modal" },
      { label: "Leave Friends", kind: "danger-solid", action: "exit-to-tourgo" },
    ],
  });
}

function captureConfirmModal(m) {
  const p = m.payload || {};
  const photo = p.avatarUrl
    ? `<img src="${escapeHtml(p.avatarUrl)}" alt="" style="width:84px;height:84px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 12px" />`
    : `<div style="width:84px;height:84px;border-radius:50%;background:rgba(0,0,0,0.06);display:grid;place-items:center;font-family:var(--font-display);font-size:34px;color:var(--ink);margin:0 auto 12px">${escapeHtml(getInitial(p.name))}</div>`;
  return modalHtml({
    iconClass: "danger",
    icon: "✓",
    title: "Confirm capture",
    desc: `You are about to mark <b style="color:var(--ink)">${escapeHtml(p.name || "this Runner")}</b> as caught. This is final.`,
    content: photo,
    actions: [
      { label: "Cancel", kind: "ghost", action: "close-modal" },
      { label: state.busy ? "Marking..." : "Confirm capture", kind: "danger-solid", action: "confirm-capture-final" },
    ],
  });
}

function nameEditModal() {
  return modalHtml({
    icon: "@",
    title: "Display name",
    desc: "Shown to players in your rooms.",
    content: `<input id="hs-name-input" class="hs-input" value="${escapeHtml(state.user?.name || "")}" maxlength="24" autofocus style="margin-bottom:12px" />`,
    actions: [
      { label: "Cancel", kind: "ghost", action: "close-modal" },
      { label: "Save", kind: "primary", action: "save-name" },
    ],
  });
}

const MODAL_RENDERERS = {
  "create-confirm": createConfirmModal,
  "join-confirm": joinConfirmModal,
  "leave-confirm": leaveConfirmModal,
  "disband-confirm": disbandConfirmModal,
  "add-friend": addFriendModal,
  "exit-tourgo": exitTourgoModal,
  "capture-confirm": captureConfirmModal,
  "name-edit": nameEditModal,
};

function modalHtml(opts) {
  const meta = modalMetaHtml(opts.meta || []);
  const actions = modalActionsHtml(opts.actions || []);
  return `
    <div class="hs-overlay" data-action="close-modal-bg">
      <div class="hs-modal" data-action="modal-stop">
        <div class="hs-modal-icon ${opts.iconClass || ""}">${opts.icon || ""}</div>
        <div class="hs-modal-title">${opts.title || ""}</div>
        ${opts.desc ? `<div class="hs-modal-desc">${opts.desc}</div>` : ""}
        ${opts.content || ""}
        ${meta ? `<div class="hs-modal-meta">${meta}</div>` : ""}
        <div class="hs-modal-actions ${opts.actions && opts.actions.length === 1 ? "single" : ""}">${actions}</div>
      </div>
    </div>
  `;
}

function modalMetaHtml(meta) {
  return meta.map((m) => `<span>${escapeHtml(m[0])} · <b>${escapeHtml(m[1])}</b></span>`).join("");
}

function modalActionsHtml(actions) {
  return actions.map(modalActionHtml).join("");
}

function modalActionHtml(action) {
  const disabled = state.busy && action.kind === "primary" ? "disabled" : "";
  return `<button type="button" class="hs-btn ${modalActionClass(action.kind)}" data-action="${action.action}" ${disabled}>${escapeHtml(action.label)}</button>`;
}

function modalActionClass(kind) {
  return {
    "ghost": "hs-btn-ghost",
    "primary": "hs-btn-primary",
    "danger": "hs-btn-danger",
    "danger-solid": "hs-btn-danger-solid",
  }[kind] || "hs-btn-ghost";
}
