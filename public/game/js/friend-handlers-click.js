/**
 * Friend shell — delegated click handler (`data-action` / tabs / steps).
 */
import {
  collection,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import {
  camPart,
  friendCopyToClipboard,
  friendRequestCameraPermission,
} from "./friend-handlers-utils.js";
import { getOrCreateFriendCode, loadSettings } from "./lib/local-prefs.js";

const ROOM_CREATE_PATH = "./actions/room-create.js";
const ROOM_PARTICIPATION_PATH = "./actions/room-participation.js";
const ROOM_PLAY_PATH = "./actions/room-play.js";
const SOCIAL_ACTIONS_PATH = "./actions/social.js";
const CAMERA_SCANNER_PATH = "./camera-scanner.js";
const CAMERA_SESSION_PATH = "./camera-session.js";

let roomCreateActions;
let roomParticipationActions;
let roomPlayActions;
let socialActions;
let cameraScanner;
let cameraSession;

async function loadRoomCreateActions() {
  if (!roomCreateActions) roomCreateActions = import(ROOM_CREATE_PATH);
  return roomCreateActions;
}

async function loadRoomParticipationActions() {
  if (!roomParticipationActions) {
    roomParticipationActions = import(ROOM_PARTICIPATION_PATH);
  }
  return roomParticipationActions;
}

async function loadRoomPlayActions() {
  if (!roomPlayActions) roomPlayActions = import(ROOM_PLAY_PATH);
  return roomPlayActions;
}

async function loadSocialActions() {
  if (!socialActions) socialActions = import(SOCIAL_ACTIONS_PATH);
  return socialActions;
}

async function loadCameraScanner() {
  if (!cameraScanner) cameraScanner = import(CAMERA_SCANNER_PATH);
  return cameraScanner;
}

async function loadCameraSession() {
  if (!cameraSession) cameraSession = import(CAMERA_SESSION_PATH);
  return cameraSession;
}

async function actionCreateRoom(...args) {
  const api = await loadRoomCreateActions();
  return api.actionCreateRoom(...args);
}

async function actionJoinRoom(...args) {
  const api = await loadRoomParticipationActions();
  return api.actionJoinRoom(...args);
}

async function actionDisbandRoom(...args) {
  const api = await loadRoomParticipationActions();
  return api.actionDisbandRoom(...args);
}

async function actionLeaveRoom(...args) {
  const api = await loadRoomParticipationActions();
  return api.actionLeaveRoom(...args);
}

async function actionSetReadyVote(...args) {
  const api = await loadRoomParticipationActions();
  return api.actionSetReadyVote(...args);
}

async function actionStartReadyCheck(...args) {
  const api = await loadRoomParticipationActions();
  return api.actionStartReadyCheck(...args);
}

async function actionCapturePlayer(...args) {
  const api = await loadRoomPlayActions();
  return api.actionCapturePlayer(...args);
}

async function actionSendChat(...args) {
  const api = await loadRoomPlayActions();
  return api.actionSendChat(...args);
}

async function actionAcceptFriendRequest(...args) {
  const api = await loadSocialActions();
  return api.actionAcceptFriendRequest(...args);
}

async function actionRejectFriendRequest(...args) {
  const api = await loadSocialActions();
  return api.actionRejectFriendRequest(...args);
}

async function actionRemoveFriend(...args) {
  const api = await loadSocialActions();
  return api.actionRemoveFriend(...args);
}

async function actionSendFriendRequest(...args) {
  const api = await loadSocialActions();
  return api.actionSendFriendRequest(...args);
}

async function actionUpdateName(...args) {
  const api = await loadSocialActions();
  return api.actionUpdateName(...args);
}

async function camOpen(...args) {
  const api = await loadCameraScanner();
  return api.openCamera(...args);
}

async function camClose(...args) {
  const api = await loadCameraScanner();
  return api.closeCamera(...args);
}

async function camConfirmPreview(...args) {
  const api = await loadCameraScanner();
  return api.confirmPreview(...args);
}

async function camRetakePreview(...args) {
  const api = await loadCameraScanner();
  return api.retakePreview(...args);
}

async function camOpenScanner(...args) {
  const api = await loadCameraScanner();
  return api.openScanner(...args);
}

async function camCloseScanner(...args) {
  const api = await loadCameraScanner();
  return api.closeScanner(...args);
}

async function resetCameraAndOpen(ctx, kind) {
  const [{ setCameraSession }] = await Promise.all([
    loadCameraSession(),
    loadCameraScanner(),
  ]);
  setCameraSession(null);
  await camOpen(camPart(ctx), kind);
}

async function restartScanner(ctx) {
  await camCloseScanner(camPart(ctx));
  await camOpenScanner(camPart(ctx));
}

/**
 * @param {object} ctx
 * @param {Event} e
 */
export async function friendOnClick(ctx, e) {
  const target = e.target.closest("[data-action], [data-tab], [data-game-tab], [data-spec-tab], [data-step]");
  if (!target) return;
  const action = target.dataset.action;
  if (handleFriendTabTarget(ctx, target)) return;
  if (handleFriendStepTarget(ctx, target)) return;
  if (!action) return;

  e.stopPropagation();
  await dispatchFriendAction(ctx, target, action, e);
}

function handleFriendTabTarget(ctx, target) {
  const { state, render } = ctx;
  const tab = target.dataset.tab;
  const gameTab = target.dataset.gameTab;
  const specTab = target.dataset.specTab;
  if (tab) {
    state.activeTab = tab;
    render();
    return true;
  }
  if (gameTab) {
    state.gameTab = gameTab;
    if (gameTab === "qr") setTimeout(() => render(), 0);
    render();
    return true;
  }
  if (specTab) {
    state.specTab = specTab;
    render();
    return true;
  }
  return false;
}

function handleFriendStepTarget(ctx, target) {
  const step = target.dataset.step;
  if (!step) return false;
  const { state, render } = ctx;
  const delta = parseInt(target.dataset.delta || "1", 10);
  const min = parseInt(target.dataset.min || "1", 10);
  const max = parseInt(target.dataset.max || "60", 10);
  const [bucket, key] = step.split(".");
  const cur = state[bucket]?.[key] ?? 0;
  const next = Math.max(min, Math.min(max, cur + delta));
  if (state[bucket]) state[bucket][key] = next;
  render();
  return true;
}

async function dispatchFriendAction(ctx, target, action, event) {
  const handler = FRIEND_ACTIONS[action];
  if (handler) await handler(ctx, target, event);
}

const FRIEND_ACTIONS = {
  "open-create": (ctx) => {
    const { state, render } = ctx;
    const settings = loadSettings();
    state.view = "create";
    state.createError = "";
    state.createDraft = { name: state.createDraft.name || "", ...settings };
    render();
  },
  "open-join": (ctx) => {
    ctx.state.view = "join";
    ctx.state.joinError = "";
    ctx.render();
  },
  "back-home": (ctx) => {
    ctx.state.view = "home";
    ctx.state.modal = null;
    ctx.render();
  },
  "confirm-create": (ctx) => {
    const { state, render } = ctx;
    if (!state.createDraft.name || !state.createDraft.name.trim()) {
      state.createError = "Give the room a name first";
      render();
      return;
    }
    state.modal = { kind: "create-confirm" };
    render();
  },
  "confirm-create-final": (ctx) => {
    void actionCreateRoom(ctx.friendCtx());
  },
  "confirm-join": async (ctx) => {
    await confirmJoin(ctx);
  },
  "confirm-join-final": (ctx) => {
    void actionJoinRoom(ctx.friendCtx(), ctx.state.modal?.payload?.code);
  },
  "close-modal": (ctx) => {
    closeModal(ctx);
  },
  "close-modal-bg": (ctx, _target, event) => {
    if (event.target.closest(".hs-modal")) return;
    closeModal(ctx);
  },
  "modal-stop": (_ctx, _target, event) => {
    event.stopPropagation();
  },
  "copy-room-code": (ctx) => {
    void friendCopyToClipboard(ctx, ctx.state.room?.code || "");
  },
  "copy-friend-code": (ctx) => {
    void friendCopyToClipboard(ctx, getOrCreateFriendCode());
  },
  "open-headshot": (ctx) => {
    void camOpen(camPart(ctx), "headshot");
  },
  "take-position-photo": (ctx) => {
    void camOpen(camPart(ctx), "position");
  },
  "cancel-camera": (ctx) => {
    void camClose(camPart(ctx));
  },
  "confirm-preview": (ctx) => {
    void camConfirmPreview(camPart(ctx));
  },
  "retake-preview": (ctx) => {
    void camRetakePreview(camPart(ctx));
  },
  "open-scanner": (ctx) => {
    void camOpenScanner(camPart(ctx));
  },
  "retry-camera": (ctx, target) => {
    const kind = target.dataset.kind || ctx.state.cameraKind || "headshot";
    ctx.state.cameraOpen = false;
    ctx.state.cameraError = "";
    void resetCameraAndOpen(ctx, kind);
  },
  "retry-scanner": (ctx) => {
    ctx.state.scanError = "";
    void restartScanner(ctx);
  },
  "retry-permission": (ctx) => {
    void friendRequestCameraPermission(ctx);
  },
  "manual-capture": (ctx, target) => {
    openManualCapture(ctx, target);
  },
  "confirm-capture-final": async (ctx) => {
    await confirmCapture(ctx);
  },
  "acknowledge-capture": (ctx) => {
    ctx.state.capturedAcknowledged = true;
    ctx.state.specTab = "stats";
    ctx.render();
  },
  "cancel-scanner": (ctx) => {
    void camCloseScanner(camPart(ctx));
  },
  "send-chat": (ctx, target) => {
    sendChat(ctx, target);
  },
  "start-ready-check": (ctx) => {
    void actionStartReadyCheck(ctx.friendCtx());
  },
  "ready-vote": (ctx, target) => {
    void actionSetReadyVote(ctx.friendCtx(), target.dataset.vote);
  },
  "dispersal-choose-side": (ctx, target) => {
    const side = target.dataset.side;
    if (side !== "runner" && side !== "hunter") return;
    ctx.state.dispersalChosenSide = ctx.state.dispersalChosenSide === side ? null : side;
    ctx.render();
  },
  "confirm-leave": (ctx) => {
    const meIsHost = ctx.state.room?.hostUid === ctx.state.user?.uid;
    ctx.state.modal = { kind: meIsHost ? "disband-confirm" : "leave-confirm" };
    ctx.render();
  },
  "leave-room": (ctx) => {
    void actionLeaveRoom(ctx.friendCtx());
  },
  "leave-room-confirmed": (ctx) => {
    void actionLeaveRoom(ctx.friendCtx());
  },
  "disband-room-confirmed": (ctx) => {
    void actionDisbandRoom(ctx.friendCtx());
  },
  "edit-name": (ctx) => {
    ctx.state.modal = { kind: "name-edit" };
    ctx.render();
    focusSoon("hs-name-input");
  },
  "save-name": (ctx) => {
    const input = document.getElementById("hs-name-input");
    if (input) void actionUpdateName(ctx.friendCtx(), input.value);
    ctx.state.modal = null;
    ctx.render();
  },
  "open-exit-tourgo": (ctx) => {
    ctx.state.modal = { kind: "exit-tourgo" };
    ctx.render();
  },
  "exit-to-tourgo": () => {
    window.location.href = "../NeoUI/";
  },
  "open-add-friend": (ctx) => {
    ctx.state.modal = { kind: "add-friend" };
    ctx.state.addFriendError = "";
    ctx.state.addFriendDraft = "";
    ctx.render();
    focusSoon("hs-add-friend-input");
  },
  "send-friend-request": (ctx) => {
    const input = document.getElementById("hs-add-friend-input");
    const code = input ? input.value : ctx.state.addFriendDraft;
    ctx.state.addFriendDraft = code;
    void actionSendFriendRequest(ctx.friendCtx(), code);
  },
  "accept-friend": (ctx, target) => {
    void actionAcceptFriendRequest(ctx.friendCtx(), target.dataset.id);
  },
  "reject-friend": (ctx, target) => {
    void actionRejectFriendRequest(ctx.friendCtx(), target.dataset.id);
  },
  "remove-friend": (ctx, target) => {
    void actionRemoveFriend(ctx.friendCtx(), target.dataset.uid);
  },
};

function closeModal({ state, render }) {
  state.modal = null;
  render();
}

async function confirmJoin({ state, render, friendCtx }) {
  const { db } = friendCtx();
  const code = String(state.joinDraft.code || "").trim().toUpperCase();
  if (code.length !== 6) {
    state.joinError = "Code must be 6 characters";
    render();
    return;
  }
  state.busy = true;
  state.joinError = "";
  render();
  try {
    const snap = await getDoc(doc(db, "hideSeekRooms", code));
    await handleJoinLookupSnap({ state, render }, db, code, snap);
  } catch (err) {
    state.busy = false;
    state.joinError = err?.message || "Lookup failed";
    render();
  }
}

async function handleJoinLookupSnap({ state, render }, db, code, snap) {
  state.busy = false;
  if (!snap.exists()) {
    state.joinError = "Room not found";
    render();
    return;
  }
  const room = snap.data();
  if (room.status !== "lobby") {
    state.joinError = "This game already started";
    render();
    return;
  }
  state.modal = {
    kind: "join-confirm",
    payload: {
      code,
      name: room.name || "Untitled",
      hostName: room.hostName || "Host",
      memberCount: await loadMemberCount(db, code),
    },
  };
  render();
}

async function loadMemberCount(db, code) {
  try {
    const firestore = await import("https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js");
    const snap = await firestore.getDocs(collection(db, "hideSeekRooms", code, "members"));
    return snap.size;
  } catch (err) {
    return 0;
  }
}

function openManualCapture({ state, render }, target) {
  const uid = target.dataset.uid;
  const token = target.dataset.token;
  const targetMember = state.members.find((member) => member.uid === uid);
  if (!targetMember) return;
  state.modal = {
    kind: "capture-confirm",
    payload: {
      uid,
      name: targetMember.name,
      token,
      avatarUrl: targetMember.avatarUrl,
      avatarReady: !!targetMember.avatarReady,
    },
  };
  render();
}

async function confirmCapture({ state, render, friendCtx }) {
  const payload = state.modal?.payload;
  state.modal = null;
  render();
  if (payload) {
    await actionCapturePlayer(friendCtx(), payload.uid, payload.token);
  }
}

function sendChat({ state, render, friendCtx }, target) {
  const scope = target.dataset.scope || "all";
  const source = target.dataset.source || "lobby";
  const { draftKey, inputId } = chatDraftTarget(source);
  const liveInput = document.getElementById(inputId);
  const text = (liveInput ? liveInput.value : state[draftKey] || "").trim();
  if (!text) return;
  state[draftKey] = "";
  if (liveInput) liveInput.value = "";
  void actionSendChat(friendCtx(), text, scope);
  render();
}

function chatDraftTarget(source) {
  if (source === "team") {
    return { draftKey: "teamChatDraft", inputId: "hs-team-chat-input" };
  }
  if (source === "dispersal") {
    return { draftKey: "dispersalChatDraft", inputId: "hs-dispersal-chat-input" };
  }
  return { draftKey: "chatDraft", inputId: "hs-lobby-chat-input" };
}

function focusSoon(id) {
  setTimeout(() => {
    const input = document.getElementById(id);
    if (input) input.focus();
  }, 100);
}
