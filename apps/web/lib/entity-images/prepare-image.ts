import { ENTITY_IMAGE_SIZE } from "./limits";

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Center-crops a picture to a square at ENTITY_IMAGE_SIZE so a phone photo of
 * several megabytes uploads as tens of kilobytes. The server re-checks it.
 */
export async function prepareEntityImage(file: Blob): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = ENTITY_IMAGE_SIZE;
  canvas.height = ENTITY_IMAGE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("This browser cannot resize images.");
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    ENTITY_IMAGE_SIZE,
    ENTITY_IMAGE_SIZE,
  );
  bitmap.close();

  // Browsers without a WebP encoder return PNG instead, which is far larger.
  const webp = await canvasToBlob(canvas, "image/webp", 0.86);
  const blob = webp?.type === "image/webp" ? webp : await canvasToBlob(canvas, "image/jpeg", 0.88);
  if (!blob) {
    throw new Error("This image could not be processed.");
  }
  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `image.${extension}`, { type: blob.type });
}
