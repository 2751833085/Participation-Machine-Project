/**
 * Create-room flow (Firestore writes + UI phases).
 * @param {object} ctx
 */
export async function actionCreateRoom(ctx) {
  const {
    state,
    db,
    render,
    roomSubs,
    subscribeRoom,
    saveSession,
    generateRoomCode,
    generateQrToken,
    bumpStat,
    saveJson,
    SETTINGS_KEY,
    ROOM_TTL_MS,
    Timestamp,
    serverTimestamp,
    setDoc,
    doc,
  } = ctx;

  if (!state.user) return;
  const draft = state.createDraft;
  const name = (draft.name || "").trim().slice(0, 40) || "Untitled room";
  const code = generateRoomCode();
  const playerName = state.user.name;
  const expiresAt = Timestamp.fromMillis(Date.now() + ROOM_TTL_MS);

  state.createError = "";
  state.modal = null;
  state.createPhase = "creating";
  state.createdCode = null;
  state.createdName = name;
  state.busy = false;
  render();

  const minLoadingMs = 1500;
  const successDurationMs = 1800;
  const loadingStart = Date.now();

  try {
    await Promise.all([
      setDoc(doc(db, "hideSeekRooms", code), {
        code,
        name,
        hostUid: state.user.uid,
        hostName: playerName,
        status: "lobby",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt,
        dispersalMin: draft.dispersalMin,
        huntMin: draft.huntMin,
        lockMin: draft.lockMin,
        stalemateMin: draft.stalemateMin,
      }),
      setDoc(doc(db, "hideSeekRooms", code, "members", state.user.uid), {
        uid: state.user.uid,
        name: playerName,
        isHost: true,
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
      }),
    ]);
    bumpStat("hosted", 1);
    saveJson(SETTINGS_KEY, {
      dispersalMin: draft.dispersalMin,
      huntMin: draft.huntMin,
      lockMin: draft.lockMin,
      stalemateMin: draft.stalemateMin,
    });
    saveSession(code);

    const loadingElapsed = Date.now() - loadingStart;
    if (loadingElapsed < minLoadingMs) {
      await new Promise((r) => setTimeout(r, minLoadingMs - loadingElapsed));
    }

    subscribeRoom(code);

    state.createPhase = "success";
    state.createdCode = code;
    render();

    await new Promise((r) => setTimeout(r, successDurationMs));

    state.createPhase = null;
    state.createdCode = null;
    state.createdName = "";
    state.roomCode = code;
    state.view = "home";
    render();
  } catch (err) {
    console.error("create room", err);
    roomSubs.clearSubs();
    state.createPhase = null;
    state.createdCode = null;
    state.createdName = "";
    state.view = "create";
    state.createError = err?.message || "Failed to create room";
    render();
  }
}
