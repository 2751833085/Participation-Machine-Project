/**
 * In-hunt capture + room chat.
 * @param {object} ctx
 */
export async function actionCapturePlayer(ctx, targetUid, targetQrToken) {
  const { state, db, showToast, bumpStat, setDoc, updateDoc, doc, serverTimestamp } = ctx;
  if (!state.roomCode || !state.user || !state.room) return;
  const target = state.members.find((m) => m.uid === targetUid);
  const me = state.members.find((m) => m.uid === state.user.uid);
  const validationMessage = captureValidationMessage(state, target, targetQrToken, me);
  if (validationMessage) {
    showToast(validationMessage, "danger");
    return;
  }
  try {
    await setDoc(doc(db, "hideSeekRooms", state.roomCode, "captures", targetUid), {
      targetUid,
      targetName: target.name,
      captorUid: state.user.uid,
      captorName: state.user.name,
      capturedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "hideSeekRooms", state.roomCode, "members", targetUid), {
      capturedAt: serverTimestamp(),
      capturedBy: state.user.uid,
      team: "spectator",
    });
    await updateDoc(doc(db, "hideSeekRooms", state.roomCode), {
      lastCaptureAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    bumpStat("captures", 1);
    showToast(`Caught ${target.name}!`, "success");
  } catch (e) {
    console.error("capture", e);
    showToast("Capture failed", "danger");
  }
}

function captureValidationMessage(state, target, targetQrToken, me) {
  if (state.room.status !== "hunt") return "Wait for the hunt phase";
  if (!target) return "That player isn't here";
  if (target.qrToken !== targetQrToken) return "QR mismatch";
  if (target.team !== "runner") return "Not a Runner";
  if (target.capturedAt) return "Already caught";
  if (!canCaptureRunner(me)) return "Only Hunters can capture";
  return "";
}

function canCaptureRunner(member) {
  return Boolean(member && member.team === "hunter" && !member.capturedAt);
}

export async function actionSendChat(ctx, text, scope) {
  const { state, db, showToast, addDoc, collection, doc, serverTimestamp } = ctx;
  if (!state.roomCode || !state.user) return;
  const trimmed = String(text || "").trim().slice(0, 280);
  if (!trimmed) return;
  try {
    await addDoc(collection(db, "hideSeekRooms", state.roomCode, "chats"), {
      senderUid: state.user.uid,
      senderName: state.user.name,
      text: trimmed,
      scope: scope || "all",
      sentAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("send chat", e);
    showToast("Couldn't send", "danger");
  }
}
