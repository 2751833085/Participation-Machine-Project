/**
 * Headshot + position photo uploads (Storage + member doc).
 * @param {object} ctx
 */

import {
  getDownloadURL,
  ref as storageRef,
  uploadString,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-storage.js";

export async function actionUploadHeadshot(ctx, dataUrl) {
  const { state, db, storage, showToast, updateDoc, doc } = ctx;
  if (!state.roomCode || !state.user) return;
  try {
    const path = `hideSeekHeadshots/${state.roomCode}/${state.user.uid}.jpg`;
    const ref = storageRef(storage, path);
    await uploadString(ref, dataUrl, "data_url", { contentType: "image/jpeg" });
    const url = await getDownloadURL(ref);
    await updateDoc(doc(db, "hideSeekRooms", state.roomCode, "members", state.user.uid), {
      avatarUrl: url,
      avatarReady: true,
    });
    showToast("Photo uploaded — you're ready", "success");
  } catch (e) {
    console.error("upload headshot", e);
    showToast("Upload failed", "danger");
    throw e;
  }
}

export async function actionUploadPositionPhoto(ctx, dataUrl) {
  const {
    state,
    db,
    storage,
    showToast,
    updateDoc,
    doc,
    Timestamp,
    serverTimestamp,
    DEFAULT_SETTINGS,
    gameNow,
  } = ctx;
  if (!state.roomCode || !state.user || !state.room) return;
  try {
    const path = `hideSeekPositions/${state.roomCode}/${state.user.uid}-${Date.now()}.jpg`;
    const ref = storageRef(storage, path);
    await uploadString(ref, dataUrl, "data_url", { contentType: "image/jpeg" });
    const url = await getDownloadURL(ref);
    const lockMs = (state.room.lockMin || DEFAULT_SETTINGS.lockMin) * 60 * 1000;
    const lockUntil = Timestamp.fromMillis(gameNow() + lockMs);
    await updateDoc(doc(db, "hideSeekRooms", state.roomCode, "members", state.user.uid), {
      positionPhotoUrl: url,
      positionPhotoAt: serverTimestamp(),
      lockExpiresAt: lockUntil,
    });
    showToast(`Locked for ${state.room.lockMin || 5} min`, "success");
  } catch (e) {
    console.error("upload position", e);
    showToast("Upload failed", "danger");
  }
}
