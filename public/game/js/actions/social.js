/**
 * Friend codes, requests, profile name.
 * @param {object} ctx
 */
export async function actionSendFriendRequest(ctx, rawCode) {
  const {
    state,
    db,
    render,
    showToast,
    getDoc,
    doc,
    setDoc,
    serverTimestamp,
    getOrCreateFriendCode,
  } = ctx;
  if (!state.user) return;
  const code = String(rawCode || "").trim().toUpperCase();
  const inputError = friendCodeInputError(code, getOrCreateFriendCode());
  if (inputError) {
    state.addFriendError = inputError;
    render();
    return;
  }
  state.busy = true;
  state.addFriendError = "";
  render();
  try {
    const idxSnap = await getDoc(doc(db, "hideSeekFriendIndex", code));
    const target = idxSnap.exists() ? idxSnap.data() : null;
    const targetError = friendRequestTargetError(state, target, code);
    if (targetError) {
      showFriendRequestError(state, render, targetError);
      return;
    }
    await writeFriendRequest(ctx, target);
    clearFriendRequestDraft(state);
    showToast(`Request sent to ${target.name || code}`, "success");
    render();
  } catch (e) {
    console.error("send friend request", e);
    state.addFriendError = e?.message || "Couldn't send request";
    state.busy = false;
    render();
  }
}

async function writeFriendRequest(ctx, target) {
  const { state, db, doc, setDoc, serverTimestamp, getOrCreateFriendCode } = ctx;
  const reqId = `${state.user.uid}_${target.uid}`;
  await setDoc(doc(db, "hideSeekFriendRequests", reqId), {
    fromUid: state.user.uid,
    fromName: state.user.name,
    fromCode: getOrCreateFriendCode(),
    toUid: target.uid,
    toName: target.name || "",
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function clearFriendRequestDraft(state) {
  state.busy = false;
  state.modal = null;
  state.addFriendDraft = "";
  state.addFriendError = "";
}

function friendCodeInputError(code, ownCode) {
  if (code.length < 4 || code.length > 8 || !/^[A-Z0-9]+$/.test(code)) {
    return "Codes are 6 letters/digits.";
  }
  if (code === ownCode) return "That's your own code.";
  return "";
}

function friendRequestTargetError(state, target, code) {
  if (!target) return "No one with that code yet.";
  if (target.uid === state.user.uid) return "That's your own code.";
  if (state.friends.find((f) => f.uid === target.uid)) return "Already friends.";
  return "";
}

function showFriendRequestError(state, render, message) {
  state.addFriendError = message;
  state.busy = false;
  render();
}

export async function actionAcceptFriendRequest(ctx, reqId) {
  const { state, db, showToast, updateDoc, deleteDoc, doc, setDoc, serverTimestamp } = ctx;
  const req = state.friendRequests.find((r) => r.id === reqId);
  if (!req || !state.user) return;
  try {
    await updateDoc(doc(db, "hideSeekFriendRequests", reqId), {
      status: "accepted",
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, "hideSeekFriends", state.user.uid, "friends", req.fromUid), {
      uid: req.fromUid,
      name: req.fromName,
      since: serverTimestamp(),
    });
    await setDoc(doc(db, "hideSeekFriends", req.fromUid, "friends", state.user.uid), {
      uid: state.user.uid,
      name: state.user.name,
      since: serverTimestamp(),
    });
    await deleteDoc(doc(db, "hideSeekFriendRequests", reqId)).catch(() => {});
    showToast(`${req.fromName} added`, "success");
  } catch (e) {
    console.error("accept friend", e);
    showToast("Couldn't accept", "danger");
  }
}

export async function actionRejectFriendRequest(ctx, reqId) {
  const { showToast, updateDoc, deleteDoc, doc, serverTimestamp } = ctx;
  try {
    await updateDoc(doc(db, "hideSeekFriendRequests", reqId), {
      status: "rejected",
      updatedAt: serverTimestamp(),
    });
    await deleteDoc(doc(db, "hideSeekFriendRequests", reqId)).catch(() => {});
    showToast("Declined", "");
  } catch (e) {
    console.error("reject friend", e);
  }
}

export async function actionRemoveFriend(ctx, otherUid) {
  const { state, db, showToast, deleteDoc, doc } = ctx;
  if (!state.user) return;
  if (!confirm("Remove this friend?")) return;
  try {
    await deleteDoc(doc(db, "hideSeekFriends", state.user.uid, "friends", otherUid));
    await deleteDoc(doc(db, "hideSeekFriends", otherUid, "friends", state.user.uid)).catch(() => {});
    showToast("Removed", "");
  } catch (e) {
    console.error("remove friend", e);
  }
}

export async function actionUpdateName(ctx, newName) {
  const { state, db, render, showToast, updateDoc, doc, setDisplayName, publishFriendCode } = ctx;
  const trimmed = String(newName || "").trim().slice(0, 24);
  if (!trimmed) return;
  setDisplayName(trimmed);
  if (state.user) state.user.name = trimmed;
  if (state.roomCode && state.user) {
    await updateDoc(doc(db, "hideSeekRooms", state.roomCode, "members", state.user.uid), {
      name: trimmed,
    }).catch(() => {});
  }
  await publishFriendCode();
  showToast("Name saved", "success");
  render();
}
