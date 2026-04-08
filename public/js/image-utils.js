/**
 * Resize and JPEG-compress images before Storage upload to cut storage & bandwidth cost.
 */
export async function compressCheckpointImage(file, options = {}) {
  const maxEdge = options.maxEdge ?? 1200;
  const quality = options.quality ?? 0.82;
  const maxBytes = options.maxBytes ?? 14 * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new Error("Each photo must be under 14 MB (try a smaller image).");
  }

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  if (width > maxEdge || height > maxEdge) {
    if (width >= height) {
      height = Math.round((height * maxEdge) / width);
      width = maxEdge;
    } else {
      width = Math.round((width * maxEdge) / height);
      height = maxEdge;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image in this browser.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not compress image."))),
      "image/jpeg",
      quality,
    );
  });

  return blob;
}
