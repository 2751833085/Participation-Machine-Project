const { onCall, HttpsError } = require("firebase-functions/v2/https");
const vision = require("@google-cloud/vision");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const DATA_URL_RE = /^data:image\/(jpeg|jpg|png);base64,([a-zA-Z0-9+/=]+)$/;
let cachedClient = null;

function decodeDataUrl(input) {
  const raw = typeof input === "string" ? input.trim() : "";
  const match = raw.match(DATA_URL_RE);
  if (!match) {
    throw new HttpsError("invalid-argument", "Invalid image payload.");
  }
  const contentType = match[1] === "png" ? "image/png" : "image/jpeg";
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
    throw new HttpsError("invalid-argument", "Image payload size is invalid.");
  }
  return { contentType, bytes };
}

function validFaceCount(faceAnnotations) {
  if (!Array.isArray(faceAnnotations)) return 0;
  return faceAnnotations.filter((face) => {
    const confidence = Number(face?.detectionConfidence || 0);
    return Number.isFinite(confidence) && confidence >= 0.3;
  }).length;
}

const validateHeadshot = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const { bytes } = decodeDataUrl(request.data?.imageDataUrl);
  try {
    if (!cachedClient) {
      cachedClient = new vision.ImageAnnotatorClient();
    }
    const [result] = await cachedClient.faceDetection({
      image: { content: bytes },
    });
    const detected = validFaceCount(result?.faceAnnotations || []);
    return {
      ok: detected === 1,
      faces: detected,
    };
  } catch (error) {
    console.error("[validateHeadshot]", error);
    const details = String(error?.details || error?.message || "");
    if (details.includes("vision.googleapis.com") || details.includes("Cloud Vision API")) {
      throw new HttpsError(
        "failed-precondition",
        "Cloud Vision API is not enabled. Enable vision.googleapis.com for this project first.",
      );
    }
    throw new HttpsError("internal", "Headshot detection failed.");
  }
});

module.exports = { validateHeadshot };
