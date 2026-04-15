/**
 * Admin portal: password-gated Callable using Admin SDK (bypasses client Firestore rules).
 *
 * Set secret to match the password typed in the web admin UI:
 *   printf '%s' 'YOUR_PASSWORD' | firebase functions:secrets:set ADMIN_DASHBOARD_PASSWORD
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const ADMIN_STAFF_UID = "__admin_portal__";
const ADMIN_DISPLAY_NAME = "administrator";

if (!admin.apps.length) {
  admin.initializeApp();
}

function assertPassword(data, expected) {
  const p = data?.adminPassword;
  if (typeof p !== "string" || p.length === 0 || p !== expected) {
    throw new HttpsError("permission-denied", "Unauthorized admin action.");
  }
}

function storagePathFromDownloadUrl(url) {
  if (typeof url !== "string" || !url.includes("firebasestorage.googleapis.com")) {
    return null;
  }
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/o\/(.+)$/);
    if (!m) return null;
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

function tsToIso(ts) {
  if (!ts) return null;
  try {
    if (typeof ts.toDate === "function") return ts.toDate().toISOString();
  } catch {
    /* ignore */
  }
  return null;
}

/** runPhotos/.../votes: { vote, mood } per user — same model as client run-social.js */
function aggregateReactionVotes(voteDocs) {
  let up = 0;
  let down = 0;
  let moodLaugh = 0;
  let moodCry = 0;
  let moodAwkward = 0;
  for (const vd of voteDocs) {
    const data = vd.data() || {};
    if (data.vote === "up") up += 1;
    else if (data.vote === "down") down += 1;
    if (data.mood === "laugh") moodLaugh += 1;
    else if (data.mood === "cry") moodCry += 1;
    else if (data.mood === "awkward") moodAwkward += 1;
  }
  return { up, down, moodLaugh, moodCry, moodAwkward };
}

const FieldPath = admin.firestore.FieldPath;

async function deleteCollectionAllDocuments(colRef, batchSize = 250) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await colRef.orderBy(FieldPath.documentId()).limit(batchSize).get();
    if (snap.empty) break;
    const b = admin.firestore().batch();
    snap.docs.forEach((d) => b.delete(d.ref));
    await b.commit();
  }
}

async function deleteCollectionVotes(colRef) {
  await deleteCollectionAllDocuments(colRef);
}

async function deleteRunPhotoDeep(db, bucket, photoId) {
  const ref = db.collection("runPhotos").doc(photoId);
  const docSnap = await ref.get();
  if (!docSnap.exists) {
    return { ok: true, skipped: true };
  }
  const data = docSnap.data() || {};
  const imageUrl = data.imageUrl;

  await deleteCollectionVotes(ref.collection("votes"));
  const comments = await ref.collection("comments").get();
  for (const cd of comments.docs) {
    await deleteCollectionVotes(cd.ref.collection("votes"));
    await cd.ref.delete();
  }
  await ref.delete();

  if (bucket && imageUrl) {
    const path = storagePathFromDownloadUrl(imageUrl);
    if (path) {
      await bucket.file(path).delete().catch(() => {});
    }
  }
  return { ok: true };
}

async function deleteAttemptCascade(db, bucket, attemptId) {
  const qs = await db.collection("runPhotos").where("attemptId", "==", attemptId).get();
  for (const d of qs.docs) {
    await deleteRunPhotoDeep(db, bucket, d.id);
  }
  await db.collection("attempts").doc(attemptId).delete();
}

async function deleteChallengeCascade(db, bucket, challengeId) {
  const attempts = await db
    .collection("attempts")
    .where("challengeId", "==", challengeId)
    .get();
  for (const ad of attempts.docs) {
    await deleteAttemptCascade(db, bucket, ad.id);
  }
  const photos = await db
    .collection("runPhotos")
    .where("challengeId", "==", challengeId)
    .get();
  for (const pd of photos.docs) {
    await deleteRunPhotoDeep(db, bucket, pd.id);
  }
  await db.collection("challenges").doc(challengeId).delete();

  if (bucket) {
    const [files] = await bucket.getFiles({ prefix: `challenges/${challengeId}/` });
    await Promise.all(files.map((f) => f.delete().catch(() => {})));
  }
}

async function deleteUserCascade(db, bucket, authSvc, uid) {
  if (typeof uid !== "string" || uid.length < 10) {
    throw new HttpsError("invalid-argument", "Invalid uid.");
  }

  const userSnap = await db.collection("users").doc(uid).get();
  const usernameNorm = userSnap.exists ? userSnap.data().usernameNorm : null;
  if (usernameNorm) {
    const hr = db.collection("userHandles").doc(String(usernameNorm));
    const hs = await hr.get();
    if (hs.exists && hs.data().uid === uid) {
      await hr.delete();
    }
  }

  const attempts = await db.collection("attempts").where("userId", "==", uid).get();
  for (const ad of attempts.docs) {
    await deleteAttemptCascade(db, bucket, ad.id);
  }

  const photos = await db.collection("runPhotos").where("userId", "==", uid).get();
  for (const pd of photos.docs) {
    await deleteRunPhotoDeep(db, bucket, pd.id);
  }

  await db.collection("users").doc(uid).delete();

  try {
    await authSvc.deleteUser(uid);
  } catch (e) {
    if (e.code !== "auth/user-not-found") {
      throw e;
    }
  }
}

async function deleteCommentOnly(db, photoId, commentId) {
  const cref = db
    .collection("runPhotos")
    .doc(photoId)
    .collection("comments")
    .doc(commentId);
  const cs = await cref.get();
  if (!cs.exists) {
    return { ok: true, skipped: true };
  }
  await deleteCollectionVotes(cref.collection("votes"));
  await cref.delete();
  return { ok: true };
}

async function listRunPhotosForChallenge(db, challengeId) {
  const qs = await db
    .collection("runPhotos")
    .where("challengeId", "==", challengeId)
    .orderBy("createdAt", "desc")
    .limit(120)
    .get();

  const photos = [];
  for (const d of qs.docs) {
    const [photoVotesSnap, cSnap] = await Promise.all([
      d.ref.collection("votes").get(),
      d.ref.collection("comments").orderBy("createdAt", "asc").get(),
    ]);
    const photoVotes = aggregateReactionVotes(photoVotesSnap.docs);

    const comments = await Promise.all(
      cSnap.docs.map(async (cd) => {
        const c = cd.data();
        const cvSnap = await cd.ref.collection("votes").get();
        const cv = aggregateReactionVotes(cvSnap.docs);
        return {
          id: cd.id,
          userId: c.userId ?? "",
          authorName: c.authorName ?? "",
          text: c.text ?? "",
          parentCommentId: c.parentCommentId ?? null,
          createdAt: tsToIso(c.createdAt),
          voteUp: cv.up,
          voteDown: cv.down,
          moodLaugh: cv.moodLaugh,
          moodCry: cv.moodCry,
          moodAwkward: cv.moodAwkward,
        };
      }),
    );

    const p = d.data();
    photos.push({
      id: d.id,
      challengeId: p.challengeId ?? "",
      attemptId: p.attemptId ?? "",
      userId: p.userId ?? "",
      authorName: p.authorName ?? "",
      imageUrl: p.imageUrl ?? "",
      createdAt: tsToIso(p.createdAt),
      voteUp: photoVotes.up,
      voteDown: photoVotes.down,
      moodLaugh: photoVotes.moodLaugh,
      moodCry: photoVotes.moodCry,
      moodAwkward: photoVotes.moodAwkward,
      comments,
    });
  }
  return { photos };
}

function buildAdminPortal(adminPasswordSecret) {
  return onCall(
    { region: "us-central1", secrets: [adminPasswordSecret] },
    async (request) => {
      assertPassword(request.data, adminPasswordSecret.value());
      const { action, payload } = request.data || {};
      if (typeof action !== "string") {
        throw new HttpsError("invalid-argument", "Missing action.");
      }

      const db = admin.firestore();
      const bucket = admin.storage().bucket();
      const authSvc = admin.auth();

      try {
        switch (action) {
          case "listRunPhotosForChallenge": {
            const challengeId = payload?.challengeId;
            if (typeof challengeId !== "string" || !challengeId) {
              throw new HttpsError("invalid-argument", "challengeId required.");
            }
            return await listRunPhotosForChallenge(db, challengeId);
          }

          case "deleteUser": {
            const uid = payload?.uid;
            await deleteUserCascade(db, bucket, authSvc, uid);
            return { ok: true };
          }

          case "deleteChallenge": {
            const challengeId = payload?.challengeId;
            if (typeof challengeId !== "string" || !challengeId) {
              throw new HttpsError("invalid-argument", "challengeId required.");
            }
            await deleteChallengeCascade(db, bucket, challengeId);
            return { ok: true };
          }

          case "deleteAttempt": {
            const attemptId = payload?.attemptId;
            if (typeof attemptId !== "string" || !attemptId) {
              throw new HttpsError("invalid-argument", "attemptId required.");
            }
            await deleteAttemptCascade(db, bucket, attemptId);
            return { ok: true };
          }

          case "deleteRunPhoto": {
            const photoId = payload?.photoId;
            if (typeof photoId !== "string" || !photoId) {
              throw new HttpsError("invalid-argument", "photoId required.");
            }
            await deleteRunPhotoDeep(db, bucket, photoId);
            return { ok: true };
          }

          case "deleteComment": {
            const photoId = payload?.photoId;
            const commentId = payload?.commentId;
            if (typeof photoId !== "string" || typeof commentId !== "string") {
              throw new HttpsError("invalid-argument", "photoId and commentId required.");
            }
            await deleteCommentOnly(db, photoId, commentId);
            return { ok: true };
          }

          case "postAdminComment": {
            const photoId = payload?.photoId;
            const text = typeof payload?.text === "string" ? payload.text.trim() : "";
            const parentCommentId =
              typeof payload?.parentCommentId === "string" && payload.parentCommentId
                ? payload.parentCommentId
                : null;
            if (typeof photoId !== "string" || !photoId) {
              throw new HttpsError("invalid-argument", "photoId required.");
            }
            if (text.length < 1 || text.length > 500) {
              throw new HttpsError("invalid-argument", "Comment must be 1–500 characters.");
            }
            const pref = db.collection("runPhotos").doc(photoId);
            const ps = await pref.get();
            if (!ps.exists) {
              throw new HttpsError("not-found", "Photo not found.");
            }
            await pref.collection("comments").add({
              userId: ADMIN_STAFF_UID,
              authorName: ADMIN_DISPLAY_NAME,
              text,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              ...(parentCommentId ? { parentCommentId } : {}),
            });
            return { ok: true };
          }

          case "setUserMeritPoints": {
            const uid = payload?.uid;
            const meritPoints = payload?.meritPoints;
            if (typeof uid !== "string" || !uid) {
              throw new HttpsError("invalid-argument", "uid required.");
            }
            if (typeof meritPoints !== "number" || !Number.isFinite(meritPoints) || meritPoints < 0) {
              throw new HttpsError("invalid-argument", "meritPoints must be a non-negative number.");
            }
            await db.collection("users").doc(uid).set(
              {
                meritPoints: Math.floor(meritPoints),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
            return { ok: true };
          }

          default:
            throw new HttpsError("invalid-argument", `Unknown action: ${action}`);
        }
      } catch (e) {
        if (e instanceof HttpsError) throw e;
        console.error("[adminPortal]", action, e);
        throw new HttpsError("internal", e.message || "Admin operation failed.");
      }
    },
  );
}

module.exports = { buildAdminPortal };
