import "server-only";
import { del, put } from "@vercel/blob";

/**
 * The browser crops and shrinks a headshot to 512px before upload, which
 * lands well under this. Server Action bodies are capped at 1 MB.
 */
export const MAX_HEADSHOT_BYTES = 900_000;

const IMAGE_SIGNATURES = [
  { contentType: "image/jpeg", extension: "jpg", matches: isJpeg },
  { contentType: "image/png", extension: "png", matches: isPng },
  { contentType: "image/webp", extension: "webp", matches: isWebp },
] as const;

function isJpeg(bytes: Uint8Array): boolean {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPng(bytes: Uint8Array): boolean {
  return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
    (byte, index) => bytes[index] === byte,
  );
}

function isWebp(bytes: Uint8Array): boolean {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));
  return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
}

function publicToken(): string {
  const token = process.env.BLOB_PUBLIC_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_PUBLIC_READ_WRITE_TOKEN is not set");
  }
  return token;
}

export class HeadshotError extends Error {}

/**
 * Stores a headshot in the public Blob store and returns its URL. The file
 * type comes from its bytes, never from the name or type the browser sent.
 */
export async function uploadHeadshot(file: File): Promise<string> {
  if (file.size === 0) {
    throw new HeadshotError("That photo is empty. Choose another one.");
  }
  if (file.size > MAX_HEADSHOT_BYTES) {
    throw new HeadshotError("That photo is too large. Choose a smaller one.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const signature = IMAGE_SIGNATURES.find((entry) => entry.matches(bytes));
  if (!signature) {
    throw new HeadshotError("Upload a JPEG, PNG, or WebP photo.");
  }

  const blob = await put(
    `mentor-headshots/${crypto.randomUUID()}.${signature.extension}`,
    bytes,
    {
      access: "public",
      contentType: signature.contentType,
      token: publicToken(),
    },
  );
  return blob.url;
}

/** Best effort. A file left behind costs storage, not correctness. */
export async function deleteHeadshot(url: string | null): Promise<void> {
  if (!url || !isPublicBlobUrl(url)) {
    return;
  }
  try {
    await del(url, { token: publicToken() });
  } catch (error) {
    console.error("Could not delete replaced headshot", error);
  }
}

function isPublicBlobUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === "https:" &&
      hostname.endsWith(".public.blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}
