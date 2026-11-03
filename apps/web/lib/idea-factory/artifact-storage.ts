import "server-only";

import { del, get, put } from "@vercel/blob";
import type { ArtifactKind } from "@westride/db";

/**
 * Files the advisory team makes live in the private Blob store. Nothing in
 * it has a public URL: the app reads bytes back with the store token and
 * serves them to members of the idea only.
 */

const PREFIX = "idea-factory";

/** Enough for a few logo renders and a report. Uploads are not accepted here. */
export const MAX_ARTIFACT_BYTES = 25 * 1024 * 1024;

export class ArtifactStorageError extends Error {}

function privateToken(): string {
  const token = process.env.BLOB_PRIVATE_READ_WRITE_TOKEN;
  if (!token) {
    throw new ArtifactStorageError("BLOB_PRIVATE_READ_WRITE_TOKEN is not set");
  }
  return token;
}

/** Whether this deployment can keep files at all. */
export function isArtifactStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_PRIVATE_READ_WRITE_TOKEN);
}

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "text/markdown": "md",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/json": "json",
};

export function extensionFor(contentType: string): string {
  return EXTENSIONS[contentType] ?? "bin";
}

export type StoredArtifact = {
  pathname: string;
  contentType: string;
  sizeBytes: number;
};

/** Writes bytes under a fresh pathname and returns what the row needs. */
export async function storeArtifact(input: {
  ideaId: string;
  kind: ArtifactKind;
  bytes: Buffer | Uint8Array;
  contentType: string;
}): Promise<StoredArtifact> {
  if (input.bytes.byteLength > MAX_ARTIFACT_BYTES) {
    throw new ArtifactStorageError("That file is too large to keep.");
  }
  const pathname = `${PREFIX}/${input.ideaId}/${input.kind.toLowerCase()}/${crypto.randomUUID()}.${extensionFor(input.contentType)}`;
  const blob = await put(pathname, Buffer.from(input.bytes), {
    access: "private",
    contentType: input.contentType,
    addRandomSuffix: false,
    token: privateToken(),
  });
  return {
    pathname: blob.pathname,
    contentType: input.contentType,
    sizeBytes: input.bytes.byteLength,
  };
}

export type ArtifactStream = {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  size: number;
  etag: string;
};

/** Opens the bytes for streaming to a member. Null when the file is gone. */
export async function openArtifact(pathname: string): Promise<ArtifactStream | null> {
  if (!pathname.startsWith(`${PREFIX}/`)) {
    return null;
  }
  const result = await get(pathname, { access: "private", token: privateToken() });
  if (!result || result.statusCode !== 200) {
    return null;
  }
  return {
    stream: result.stream,
    contentType: result.blob.contentType,
    size: result.blob.size,
    etag: result.blob.etag,
  };
}

/** Best effort. A file left behind costs storage, not correctness. */
export async function deleteArtifactFile(pathname: string): Promise<void> {
  if (!pathname.startsWith(`${PREFIX}/`)) {
    return;
  }
  try {
    await del(pathname, { token: privateToken() });
  } catch (error) {
    console.error("Could not delete artifact file", error);
  }
}
