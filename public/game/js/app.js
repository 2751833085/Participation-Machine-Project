// Tourgo Friends · v5
// Mobile-portrait single page app. Manhunt with friends.

import { auth, db, storage } from "./firebase.js";
import {
  onAuthStateChanged,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { DEFAULT_SETTINGS, ROOM_TTL_MS, SETTINGS_KEY } from "./lib/constants.js";
import { tsMs } from "./lib/format-utils.js";
import { generateQrToken, generateRoomCode } from "./lib/id-generators.js";
import {
  bumpStat,
  getDisplayName,
  getOrCreateFriendCode,
  loadSession,
  saveJson,
  saveSession,
  setDisplayName,
} from "./lib/local-prefs.js";
import { createRoomSubscriptionManager } from "./lib/room-subscriptions.js";
import { gameNow } from "./lib/server-time.js";
import { state } from "./state.js";
import { getCameraSession } from "./camera-session.js";
import { renderQrInto } from "./camera-scanner.js";

const RENDER_VIEWS_PATH = "./render/views.js";
const RENDER_HELPERS_PATH = "./render/helpers.js";
const APP_HANDLERS_PATH = "./app-handlers.js";
const PHASE_TRANSITIONS_PATH = "./phase-transitions.js";
const KEYBOARD_FLOATER_PATH = "./keyboard-floater.js";
let renderViewsApi = null;
let renderHelpersApi = null;
let friendHandlersApi = null;
let phaseTransitionsApi = null;

async function loadFriendUiModules() {
  [renderViewsApi, renderHelpersApi, friendHandlersApi] = await Promise.all([
    import(RENDER_VIEWS_PATH),
    import(RENDER_HELPERS_PATH),
    import(APP_HANDLERS_PATH),
  ]);
}

async function runPhaseTransitions() {
  if (!phaseTransitionsApi) phaseTransitionsApi = import(PHASE_TRANSITIONS_PATH);
  const { handlePhaseTransitions } = await phaseTransitionsApi;
  await handlePhaseTransitions(db);
}

// ════════════════════════════════════════════════
// Room Firestore subscriptions (`lib/room-subscriptions.js`)
// ════════════════════════════════════════════════

const roomSubs = createRoomSubscriptionManager(db);

function subscribeRoom(code) {
  roomSubs.subscribeRoom(code, {
    onRoomDeleted() {
      state.roomCode = null;
      state.room = null;
      state.members = [];
      state.captures = [];
      state.chats = [];
      state.gameTab = "status";
      state.dispersalChosenSide = null;
      state.roleRevealUntil = null;
      state.roleRevealRole = null;
      saveSession(null);
      roomSubs.clearSubs();
      render();
      showToast("Room ended by host", "danger");
    },
    onRoomUpdate(data) {
      const prevStatus = state.room?.status;
      state.room = data;
      maybeStartRoleReveal(prevStatus, data.status);
      void runPhaseTransitions();
      render();
    },
    onMembers(members) {
      const teamWasUnknown = !state.members.some((m) => m.uid === state.user?.uid && m.team);
      const wasCaptured = state.members.some((m) => m.uid === state.user?.uid && m.capturedAt);
      state.members = members;
      const isCaptured = state.members.some((m) => m.uid === state.user?.uid && m.capturedAt);
      if (!isCaptured || (!wasCaptured && isCaptured)) state.capturedAcknowledged = false;
      if (teamWasUnknown) maybeStartRoleReveal(state.room?.status, state.room?.status);
      render();
    },
    onCaptures(captures) {
      state.captures = captures;
      void runPhaseTransitions();
      render();
    },
    onChats(chats) {
      state.chats = chats;
      render();
    },
  });
}

// Friend / friend-request listeners (independent of room subs)
const friendSubs = [];
function clearFriendSubs() {
  while (friendSubs.length) {
    const fn = friendSubs.pop();
    try { fn(); } catch (e) { /* ignore */ }
  }
}

function subscribeFriendsAndRequests() {
  if (!state.user) return;
  clearFriendSubs();
  const uid = state.user.uid;

  // Incoming friend requests (status pending, toUid = me)
  const reqQ = query(
    collection(db, "hideSeekFriendRequests"),
    where("toUid", "==", uid),
    where("status", "==", "pending"),
  );
  friendSubs.push(onSnapshot(reqQ, (snap) => {
    state.friendRequests = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt));
    render();
  }, (err) => console.error("req sub", err)));

  // Friend list
  friendSubs.push(onSnapshot(collection(db, "hideSeekFriends", uid, "friends"), (snap) => {
    state.friends = snap.docs.map((d) => ({ ...d.data() })).sort((a, b) => tsMs(b.since) - tsMs(a.since));
    render();
  }, (err) => console.error("friends sub", err)));
}

async function publishFriendCode() {
  if (!state.user) return;
  const code = getOrCreateFriendCode();
  try {
    await setDoc(doc(db, "hideSeekFriendIndex", code), {
      uid: state.user.uid,
      friendCode: code,
      name: state.user.name,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("publish friend code", e);
  }
}

// Detect a fresh dispersal → hunt edge for THIS client and start the
// 5-second role-reveal screen. Skipped for mid-join (huntStartedAt > 6 s
// ago) so we don't replay the reveal when re-entering a running room.
function maybeStartRoleReveal(_prevStatus, nextStatus) {
  if (nextStatus !== "hunt") return;
  const myTeam = currentMyTeam();
  if (!isFreshHuntStart() || !myTeam) return;
  state.roleRevealUntil = gameNow() + 5000;
  state.roleRevealRole = myTeam;
}

function currentMyTeam() {
  const me = state.members.find((m) => m.uid === state.user?.uid);
  const team = me?.team;
  return team === "hunter" || team === "runner" ? team : null;
}

function isFreshHuntStart() {
  if (state.roleRevealUntil && state.roleRevealUntil > gameNow()) return false;
  const startedAt = tsMs(state.room?.huntStartedAt);
  return !!startedAt && gameNow() - startedAt <= 6000;
}

// Drive 1Hz tick to re-render countdowns + check transitions
let tickTimer = null;
function startTick() {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    if (state.room && state.user) {
      if (state.roleRevealUntil && state.roleRevealUntil <= gameNow()) {
        state.roleRevealUntil = null;
        state.roleRevealRole = null;
      }
      void runPhaseTransitions();
      render();
    }
  }, 1000);
}

// ════════════════════════════════════════════════
// Auth
// ════════════════════════════════════════════════

async function initAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        state.user = { uid: user.uid, name: getDisplayName() || `Friend-${user.uid.slice(0, 4)}` };
        // Lazy save name if first time
        if (!getDisplayName()) setDisplayName(state.user.name);
        getOrCreateFriendCode();
        publishFriendCode();
        subscribeFriendsAndRequests();
        render();
        resolve();
      } else {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          state.bootError = err?.message || "Sign-in failed";
          render();
          resolve();
        }
      }
    });
  });
}

// ════════════════════════════════════════════════
// Toast
// ════════════════════════════════════════════════

let toastTimer = null;
function showToast(text, kind = "") {
  state.toast = { text, kind, until: Date.now() + 2400 };
  render();
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    state.toast = null;
    render();
  }, 2400);
}

/** Context for `actions/*` — built per call so it always sees current `state` / closures. */
function friendCtx() {
  return {
    state,
    db,
    storage,
    render,
    showToast,
    roomSubs,
    saveSession,
    subscribeRoom,
    publishFriendCode,
    generateQrToken,
    generateRoomCode,
    bumpStat,
    saveJson,
    SETTINGS_KEY,
    ROOM_TTL_MS,
    DEFAULT_SETTINGS,
    Timestamp,
    serverTimestamp,
    setDoc,
    doc,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getOrCreateFriendCode,
    setDisplayName,
    gameNow,
  };
}

const friendUiCtx = { state, render, friendCtx, showToast };

// ════════════════════════════════════════════════
// View routing & rendering
// ════════════════════════════════════════════════

// Cache last-rendered HTML strings so we only touch the DOM when it
// actually changes. The 1Hz tick used to re-set innerHTML every second
// even when state hadn't moved — that restarted any modal/transition
// CSS animations and caused visible flicker.
let _lastShellHtml = "";
let _lastOverlaysHtml = "";

function isTextEntryFocused() {
  const focusedEl = document.activeElement;
  return focusedEl
    && (focusedEl.tagName === "INPUT" || focusedEl.tagName === "TEXTAREA")
    && focusedEl.type !== "button"
    && focusedEl.type !== "submit"
    && focusedEl.type !== "checkbox"
    && focusedEl.type !== "radio";
}

function patchShellHtml(root, renderShellHtml, stripLive, isTyping) {
  const newShell = renderShellHtml();
  const newShellKey = stripLive(newShell);
  if (newShellKey === _lastShellHtml || isTyping) return;
  root.innerHTML = newShell;
  _lastShellHtml = newShellKey;
  attachShellHandlers(root);
}

function patchOverlaysHtml(renderOverlaysHtml, stripLive, isTyping) {
  const overlays = document.getElementById("hs-overlays");
  if (!overlays) return;
  const newOverlays = renderOverlaysHtml();
  const newOverlaysKey = stripLive(newOverlays);
  if (newOverlaysKey === _lastOverlaysHtml || isTyping) return;
  overlays.innerHTML = newOverlays;
  _lastOverlaysHtml = newOverlaysKey;
  attachOverlayHandlers();
}

function syncCameraVideo() {
  const cam = getCameraSession();
  if (!state.cameraOpen || !cam) return;
  const v = document.getElementById("hs-cam-video");
  if (v && cam.stream && !v.srcObject) v.srcObject = cam.stream;
}

function syncRunnerQr(getMyMember, isInGame) {
  const me = getMyMember();
  if (state.gameTab !== "qr" || !isInGame() || me?.team !== "runner" || !me.qrToken) return;
  const target = document.getElementById("hs-qr-canvas");
  // Only re-render the QR SVG if it isn't already drawn; the token
  // is stable for the whole game.
  if (target && !target.firstChild) {
    renderQrInto("hs-qr-canvas", JSON.stringify({ uid: me.uid, token: me.qrToken }));
  }
}

function syncRenderSideEffects(getMyMember, isInGame) {
  syncCameraVideo();
  syncRunnerQr(getMyMember, isInGame);
}

function render() {
  if (!renderViewsApi || !renderHelpersApi) return;
  const { renderShellHtml, renderOverlaysHtml } = renderViewsApi;
  const { stripLive, applyLiveTimers, getMyMember, isInGame } = renderHelpersApi;
  const root = document.getElementById("hs-app");
  if (!root) return;
  // Don't rip-and-replace the DOM while the user is typing in an input —
  // it kills focus, which on iOS dismisses the keyboard mid-message. We
  // pick up the latest state on the next render call (after blur, send,
  // or the next tick if the user is idle).
  const isTyping = isTextEntryFocused();
  patchShellHtml(root, renderShellHtml, stripLive, isTyping);
  patchOverlaysHtml(renderOverlaysHtml, stripLive, isTyping);
  // Apply live-timer text into the static skeleton AFTER the diff so the
  // diff cache doesn't churn each tick.
  applyLiveTimers();
  // Side-effects after render — run every tick because they touch
  // imperative DOM (video stream, async QR svg) that the diff above
  // can't reason about.
  syncRenderSideEffects(getMyMember, isInGame);
}

// ════════════════════════════════════════════════
// EVENT HANDLERS (delegation)
// ════════════════════════════════════════════════

function attachShellHandlers(root) {
  const { friendOnClick, friendOnInput, friendOnKeyDown } = friendHandlersApi;
  root.addEventListener("click", (e) => void friendOnClick(friendUiCtx, e));
  root.addEventListener("input", (e) => friendOnInput(friendUiCtx, e));
  root.addEventListener("change", (e) => friendOnInput(friendUiCtx, e));
  root.addEventListener("keydown", (e) => void friendOnKeyDown(friendUiCtx, e));
}

function attachOverlayHandlers() {
  const root = document.getElementById("hs-overlays");
  if (!root) return;
  const { friendOnClick, friendOnInput, friendOnKeyDown } = friendHandlersApi;
  root.addEventListener("click", (e) => void friendOnClick(friendUiCtx, e));
  root.addEventListener("input", (e) => friendOnInput(friendUiCtx, e));
  root.addEventListener("keydown", (e) => void friendOnKeyDown(friendUiCtx, e));
}

// ════════════════════════════════════════════════
// Boot
// ════════════════════════════════════════════════

async function boot() {
  await loadFriendUiModules();
  startTick();
  const { installKeyboardFloater } = await import(KEYBOARD_FLOATER_PATH);
  installKeyboardFloater();
  render();
  await initAuth();
  // Ask for camera up front so the player isn't blocked at headshot time.
  // If denied, a banner stays visible inviting them to grant.
  void friendHandlersApi.friendRequestCameraPermission(friendUiCtx);
  // Resume the last room the player was in, if any. This is what makes a
  // mid-game refresh / reconnect drop the player back into their game.
  const savedCode = loadSession();
  if (savedCode && state.user) {
    try {
      const snap = await getDoc(doc(db, "hideSeekRooms", savedCode));
      if (snap.exists()) {
        const memberSnap = await getDoc(doc(db, "hideSeekRooms", savedCode, "members", state.user.uid));
        if (memberSnap.exists()) {
          state.roomCode = savedCode;
          subscribeRoom(savedCode);
          render();
          return;
        }
      }
    } catch (e) {
      console.error("resume session", e);
    }
    saveSession(null);
  }
  render();
}

boot();
