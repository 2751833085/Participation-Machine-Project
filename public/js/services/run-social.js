/**
 * Shared photos during an active hunt: upload, reactions (👍👎 + moods), threaded comments.
 */

import { auth, db, storage } from "./firebase.js";
import { allSpotsFound } from "./service-utils.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-storage.js";

const MOODS = ["laugh", "cry", "awkward"];
const VOTES = ["up", "down", ""];
const IMAGE_UTILS_PATH = "../image-utils.js";
const PHOTO_PROOF_PATH = "../lib/photo-proof.js";
const CHALLENGES_PATH = "./challenges.js";
let imageUtilsModule;
let photoProofModule;
let challengesModule;

async function getUploadDeps() {
  if (!imageUtilsModule) imageUtilsModule = import(IMAGE_UTILS_PATH);
  if (!photoProofModule) photoProofModule = import(PHOTO_PROOF_PATH);
  if (!challengesModule) challengesModule = import(CHALLENGES_PATH);
  const [imageUtils, photoProof, challenges] = await Promise.all([
    imageUtilsModule,
    photoProofModule,
    challengesModule,
  ]);
  return {
    checkpointProofCoords: challenges.checkpointProofCoords,
    compressCheckpointImage: imageUtils.compressCheckpointImage,
    getChallenge: challenges.getChallenge,
    validateCameraPhotoProof: photoProof.validateCameraPhotoProof,
  };
}

export async function fetchAuthorName(uid) {
  if (!uid) return "Player";
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const n = snap.exists() ? String(snap.data().displayName || "").trim() : "";
    return n || "Player";
  } catch {
    return "Player";
  }
}

/**
 * Upload a checkpoint photo: creates runPhotos doc with spotIndex and marks that spot found
 * on the attempt (same transaction). Completes the hunt when every spot has been submitted.
 */
export async function uploadRunPhoto({ challengeId, attemptId, file, spotIndex }) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Sign in to upload.");

  if (!Number.isInteger(spotIndex) || spotIndex < 0) {
    throw new Error("Invalid checkpoint.");
  }

  const {
    checkpointProofCoords,
    compressCheckpointImage,
    getChallenge,
    validateCameraPhotoProof,
  } = await getUploadDeps();
  const ch = await getChallenge(challengeId);
  if (!ch) throw new Error("Hunt not found.");
  const proof = checkpointProofCoords(ch, spotIndex);
  await validateCameraPhotoProof(file, {
    expectedLat: proof.lat,
    expectedLng: proof.lng,
  });

  const blob = await compressCheckpointImage(file, { maxEdge: 1600, quality: 0.82 });
  const photoRef = doc(collection(db, "runPhotos"));
  const photoId = photoRef.id;
  const path = `challenges/${challengeId}/run-uploads/${photoId}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  const imageUrl = await getDownloadURL(storageRef);

  const attemptRef = doc(db, "attempts", attemptId);
  const challengeRef = doc(db, "challenges", challengeId);
  const authorName = await fetchAuthorName(uid);

  const { won } = await runTransaction(db, (transaction) =>
    commitRunPhotoUpload(transaction, {
      attemptId,
      attemptRef,
      authorName,
      challengeId,
      challengeRef,
      imageUrl,
      photoRef,
      spotIndex,
      uid,
    }),
  );

  return { photoId, won };
}

async function commitRunPhotoUpload(transaction, ctx) {
  const attemptSnap = await transaction.get(ctx.attemptRef);
  const chSnap = await transaction.get(ctx.challengeRef);
  const attempt = validateRunPhotoAttempt(attemptSnap, ctx);
  const total = validateRunPhotoChallenge(chSnap, ctx.spotIndex);
  const foundSpotIndices = nextFoundSpotIndices(attempt, ctx.spotIndex);
  transaction.set(ctx.photoRef, runPhotoDoc(ctx));
  const won = allSpotsFound(foundSpotIndices, total);
  updateAttemptAfterPhoto(transaction, ctx.attemptRef, foundSpotIndices, won);
  return { won };
}

function validateRunPhotoAttempt(attemptSnap, { uid, challengeId }) {
  if (!attemptSnap.exists()) throw new Error("Run not found.");
  const attempt = attemptSnap.data();
  if (attempt.userId !== uid) throw new Error("Not your run.");
  if (attempt.challengeId !== challengeId) throw new Error("Challenge mismatch.");
  if (attempt.status !== "active") throw new Error("Run is not active.");
  if (Date.now() > attempt.deadlineAt.toMillis()) {
    throw new Error("Time is up — cannot submit checkpoints.");
  }
  return attempt;
}

function validateRunPhotoChallenge(chSnap, spotIndex) {
  const spots = chSnap.exists() ? chSnap.data().spots || [] : [];
  if (spotIndex >= spots.length) throw new Error("Invalid checkpoint.");
  return spots.length;
}

function nextFoundSpotIndices(attempt, spotIndex) {
  const found = new Set([...(attempt.foundSpotIndices || []), spotIndex]);
  return [...found].sort((x, y) => x - y);
}

function runPhotoDoc(ctx) {
  return {
    challengeId: ctx.challengeId,
    attemptId: ctx.attemptId,
    userId: ctx.uid,
    spotIndex: ctx.spotIndex,
    imageUrl: ctx.imageUrl,
    createdAt: serverTimestamp(),
    authorName: ctx.authorName,
  };
}

function updateAttemptAfterPhoto(transaction, attemptRef, foundSpotIndices, won) {
  if (!won) {
    transaction.update(attemptRef, { foundSpotIndices });
    return;
  }
  transaction.update(attemptRef, {
    foundSpotIndices,
    status: "won",
    completedAt: Timestamp.now(),
  });
}

export function watchRunPhotos(challengeId, callback, onError) {
  const q = query(
    collection(db, "runPhotos"),
    where("challengeId", "==", challengeId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(list);
    },
    onError || (() => {}),
  );
}

export function watchPhotoVotes(photoId, callback) {
  return onSnapshot(collection(db, "runPhotos", photoId, "votes"), (snap) => {
    const byUser = {};
    snap.docs.forEach((d) => {
      byUser[d.id] = d.data();
    });
    callback(byUser);
  });
}

export function watchPhotoComments(photoId, callback, onError) {
  const q = query(
    collection(db, "runPhotos", photoId, "comments"),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    onError || (() => {}),
  );
}

export function watchCommentVotes(photoId, commentId, callback) {
  return onSnapshot(
    collection(db, "runPhotos", photoId, "comments", commentId, "votes"),
    (snap) => {
      const byUser = {};
      snap.docs.forEach((d) => {
        byUser[d.id] = d.data();
      });
      callback(byUser);
    },
  );
}

function assertVote(v) {
  if (!VOTES.includes(v)) throw new Error("Invalid vote.");
}

function assertMood(m) {
  if (m !== "" && !MOODS.includes(m)) throw new Error("Invalid mood.");
}

export async function setMyPhotoVote(photoId, { vote, mood }) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Sign in.");
  if (vote !== undefined) assertVote(vote);
  if (mood !== undefined) assertMood(mood);

  const refDoc = doc(db, "runPhotos", photoId, "votes", uid);
  const prev = (await getDoc(refDoc)).data() || {};
  const next = {
    vote: vote !== undefined ? vote : prev.vote ?? "",
    mood: mood !== undefined ? mood : prev.mood ?? "",
  };
  await setDoc(refDoc, next, { merge: true });
}

export async function setMyCommentVote(photoId, commentId, { vote, mood }) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Sign in.");
  if (vote !== undefined) assertVote(vote);
  if (mood !== undefined) assertMood(mood);

  const refDoc = doc(
    db,
    "runPhotos",
    photoId,
    "comments",
    commentId,
    "votes",
    uid,
  );
  const prev = (await getDoc(refDoc)).data() || {};
  const next = {
    vote: vote !== undefined ? vote : prev.vote ?? "",
    mood: mood !== undefined ? mood : prev.mood ?? "",
  };
  await setDoc(refDoc, next, { merge: true });
}

export async function addPhotoComment(photoId, text, parentCommentId = null) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Sign in.");
  const t = String(text || "").trim();
  if (t.length < 1 || t.length > 500) throw new Error("Comment must be 1–500 characters.");
  const authorName = await fetchAuthorName(uid);
  await addDoc(collection(db, "runPhotos", photoId, "comments"), {
    userId: uid,
    text: t,
    createdAt: serverTimestamp(),
    authorName,
    ...(parentCommentId ? { parentCommentId } : {}),
  });
}

export function aggregateVoteCounts(byUser) {
  let up = 0;
  let down = 0;
  const mood = { laugh: 0, cry: 0, awkward: 0 };
  Object.values(byUser || {}).forEach((v) => {
    if (v.vote === "up") up += 1;
    if (v.vote === "down") down += 1;
    if (v.mood === "laugh") mood.laugh += 1;
    if (v.mood === "cry") mood.cry += 1;
    if (v.mood === "awkward") mood.awkward += 1;
  });
  return { up, down, mood };
}

export function myPhotoReaction(uid, byUser) {
  const mine = byUser?.[uid] || {};
  return { vote: mine.vote || "", mood: mine.mood || "" };
}
