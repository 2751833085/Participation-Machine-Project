/**
 * Join / leave / disband / ready-check actions.
 * @param {object} ctx
 */
export async function actionJoinRoom(ctx, rawCode) {
  const {
    state,
    db,
    render,
    roomSubs,
    saveSession,
    subscribeRoom,
    generateQrToken,
    setDoc,
    doc,
    serverTimestamp,
  } = ctx;

  if (!state.user) return;
  const code = String(rawCode || "").trim().toUpperCase();
  if (code.length !== 6) {
    state.joinError = "Code must be 6 characters";
    render();
    return;
  }
  state.joinError = "";
  state.roomCode = code;
  state.view = "home";
  state.modal = null;
  state.busy = false;
  saveSession(code);
  render();
  try {
    const playerName = state.user.name;
    await setDoc(doc(db, "hideSeekRooms", code, "members", state.user.uid), {
      uid: state.user.uid,
      name: playerName,
      isHost: false,
      avatarUrl: "",
      avatarReady: false,
      qrToken: generateQrToken(),
      readyVote: null,
      team: null,
      capturedAt: null,
      capturedBy: null,
      positionPhotoUrl: "",
      positionPhotoAt: null,
      lockExpiresAt: null,
      joinedAt: serverTimestamp(),
    });
    subscribeRoom(code);
  } catch (err) {
    console.error("join room", err);
    roomSubs.clearSubs();
    state.roomCode = null;
    state.room = null;
    state.view = "join";
    state.joinError = err?.message || "Failed to join";
    render();
  }
}

export async function actionDisbandRoom(ctx, silently = false) {
  const { state, db, render, showToast, roomSubs, saveSession, deleteDoc, doc } = ctx;
  const code = state.roomCode;
  if (!code || !state.user) return;
  try {
    await deleteDoc(doc(db, "hideSeekRooms", code));
    await Promise.all(roomDeleteTasks(ctx, code));
  } catch (e) {
    console.error("disband room", e);
    if (!silently) showToast("Couldn't disband room", "danger");
  }
  clearRoomSession({ state, saveSession, roomSubs });
  if (!silently) showToast("Room disbanded", "");
  render();
}

export async function actionLeaveRoom(ctx, silently = false) {
  const { state, db, render, showToast, roomSubs, saveSession, deleteDoc, doc } = ctx;
  const code = state.roomCode;
  if (!code || !state.user) return;
  const meIsHost = state.room?.hostUid === state.user.uid;
  if (meIsHost) {
    await actionDisbandRoom(ctx, silently);
    return;
  }
  try {
    await deleteDoc(doc(db, "hideSeekRooms", code, "members", state.user.uid));
  } catch (e) {
    console.error("leave room", e);
  }
  clearRoomSession({ state, saveSession, roomSubs });
  if (!silently) showToast("Left the room", "");
  render();
}

function roomDeleteTasks(ctx, code) {
  const { state, db, deleteDoc, doc } = ctx;
  return [
    ...state.members.map((m) =>
      deleteDoc(doc(db, "hideSeekRooms", code, "members", m.uid)).catch(() => {}),
    ),
    ...state.captures.map((c) =>
      deleteDoc(doc(db, "hideSeekRooms", code, "captures", c.targetUid)).catch(() => {}),
    ),
    ...state.chats.map((ch) =>
      deleteDoc(doc(db, "hideSeekRooms", code, "chats", ch.id)).catch(() => {}),
    ),
  ];
}

function clearRoomSession({ state, saveSession, roomSubs }) {
  state.roomCode = null;
  state.room = null;
  state.members = [];
  state.captures = [];
  state.chats = [];
  state.gameTab = "status";
  state.specTab = "stats";
  state.capturedAcknowledged = false;
  state.dispersalChosenSide = null;
  state.roleRevealUntil = null;
  state.roleRevealRole = null;
  state.modal = null;
  saveSession(null);
  roomSubs.clearSubs();
}

export async function actionSetReadyVote(ctx, vote) {
  const { state, db, updateDoc, doc } = ctx;
  if (!state.roomCode || !state.user) return;
  try {
    await updateDoc(doc(db, "hideSeekRooms", state.roomCode, "members", state.user.uid), {
      readyVote: vote,
    });
  } catch (e) {
    console.error("ready vote", e);
  }
}

export async function actionStartReadyCheck(ctx) {
  const { state, db, updateDoc, doc, serverTimestamp } = ctx;
  if (!state.roomCode || !state.user) return;
  if (state.room?.hostUid !== state.user.uid) return;
  try {
    for (const m of state.members) {
      await updateDoc(doc(db, "hideSeekRooms", state.roomCode, "members", m.uid), { readyVote: null }).catch(() => {});
    }
    await updateDoc(doc(db, "hideSeekRooms", state.roomCode), {
      status: "ready_check",
      readyCheckStartedAt: serverTimestamp(),
      cancelledBy: null,
      cancelledAt: null,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("start ready check", e);
  }
}
