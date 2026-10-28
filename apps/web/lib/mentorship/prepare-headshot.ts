/** Edge length of the stored square headshot, in pixels. */
const HEADSHOT_SIZE = 512;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Crops a photo to a square and shrinks it to HEADSHOT_SIZE, so a phone
 * photo of several megabytes uploads as tens of kilobytes. Portrait photos
 * crop a little above center, where faces usually sit.
 */
export async function prepareHeadshot(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(HEADSHOT_SIZE, side);
  const sourceX = (bitmap.width - side) / 2;
  const sourceY = (bitmap.height - side) / 3;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("This browser cannot resize images.");
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, size, size);
  bitmap.close();

  // Browsers without a WebP encoder return PNG instead, which is far larger.
  const webp = await canvasToBlob(canvas, "image/webp", 0.85);
  const blob =
    webp?.type === "image/webp"
      ? webp
      : await canvasToBlob(canvas, "image/jpeg", 0.88);
  if (!blob) {
    throw new Error("This photo could not be processed.");
  }

  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `headshot.${extension}`, { type: blob.type });
}
