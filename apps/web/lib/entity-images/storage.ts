import "server-only";
import { del, put } from "@vercel/blob";
import type { EntityImageKind } from "@westride/db/entity-images";
import sharp from "sharp";
import { ENTITY_IMAGE_SIZE } from "./limits";

const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export class EntityImageError extends Error {}

function publicToken(): string {
  const token = process.env.BLOB_PUBLIC_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_PUBLIC_READ_WRITE_TOKEN is not set");
  }
  return token;
}

/**
 * Crops to a centered square and scales to exactly ENTITY_IMAGE_SIZE, whatever
 * the source size. The format comes from the bytes, never from a file name.
 */
export async function normalizeEntityImage(bytes: Buffer): Promise<Buffer> {
  let format: string | undefined;
  try {
    format = (await sharp(bytes).metadata()).format;
  } catch {
    format = undefined;
  }
  if (!format || !ACCEPTED_FORMATS.has(format)) {
    throw new EntityImageError("Use a JPEG, PNG, or WebP image.");
  }
  return sharp(bytes)
    .rotate()
    .resize(ENTITY_IMAGE_SIZE, ENTITY_IMAGE_SIZE, { fit: "cover", position: "centre" })
    .webp({ quality: 86 })
    .toBuffer();
}

/** Stores a normalized image in the public Blob store and returns its URL. */
export async function storeEntityImage(kind: EntityImageKind, image: Buffer): Promise<string> {
  const blob = await put(`entity-images/${kind}/${crypto.randomUUID()}.webp`, image, {
    access: "public",
    contentType: "image/webp",
    token: publicToken(),
  });
  return blob.url;
}

/** Best effort. A file left behind costs storage, not correctness. */
export async function deleteEntityImage(url: string | null): Promise<void> {
  if (!url || !isOwnBlobUrl(url)) {
    return;
  }
  try {
    await del(url, { token: publicToken() });
  } catch (error) {
    console.error("Could not delete replaced entity image", error);
  }
}

function isOwnBlobUrl(url: string): boolean {
  try {
    const { protocol, hostname, pathname } = new URL(url);
    return (
      protocol === "https:" &&
      hostname.endsWith(".public.blob.vercel-storage.com") &&
      pathname.startsWith("/entity-images/")
    );
  } catch {
    return false;
  }
}
