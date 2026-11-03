import type { ArtifactKind } from "@westride/db";

/**
 * Client-safe rules for files a member hands the advisory team. Storage and
 * the Muse call live on the server; this file is shared with the picker.
 */

export const MAX_ARTIFACT_BYTES = 25 * 1024 * 1024;
export const MAX_UPLOADS_PER_MESSAGE = 4;
/** Muse inline bodies stay well under the 50 MB cap once base64-encoded. */
export const MAX_MUSE_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_MUSE_FILES_BYTES = 12 * 1024 * 1024;
export const MAX_INLINE_TEXT_CHARS = 60_000;
export const UPLOAD_COLLECTION = "uploads";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

export const UPLOAD_CONTENT_TYPES = new Set([...IMAGE_TYPES, ...DOCUMENT_TYPES]);

export const UPLOAD_ACCEPT = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  ".md",
  ".txt",
  ".csv",
  ".json",
  ".pdf",
].join(",");

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "text/markdown": "md",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/json": "json",
};

const NAME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
  csv: "text/csv",
  json: "application/json",
};

export function primaryType(contentType: string): string {
  return contentType.split(";")[0]!.trim().toLowerCase();
}

export function extensionFor(contentType: string): string {
  return EXTENSIONS[primaryType(contentType)] ?? "bin";
}

export function contentTypeFromName(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? (NAME_TYPES[ext] ?? null) : null;
}

/** Prefers the browser's type, then the filename, so a `.md` drop still works. */
export function contentTypeOf(file: Pick<File, "type" | "name">): string | null {
  const typed = file.type ? primaryType(file.type) : "";
  if (typed && UPLOAD_CONTENT_TYPES.has(typed === "image/jpg" ? "image/jpeg" : typed)) {
    return typed === "image/jpg" ? "image/jpeg" : typed;
  }
  const fromName = contentTypeFromName(file.name);
  return fromName && UPLOAD_CONTENT_TYPES.has(fromName) ? fromName : null;
}

export function kindFromContentType(contentType: string): Exclude<ArtifactKind, "REPORT"> {
  return primaryType(contentType).startsWith("image/") ? "IMAGE" : "DOCUMENT";
}

export function isTextUpload(contentType: string): boolean {
  const type = primaryType(contentType);
  return type === "text/plain" || type === "text/markdown" || type === "text/csv" || type === "application/json";
}

export function isPdfUpload(contentType: string): boolean {
  return primaryType(contentType) === "application/pdf";
}

export function isImageUpload(contentType: string): boolean {
  return primaryType(contentType).startsWith("image/");
}

const TITLE_MAX = 120;

export function titleFromFilename(filename: string): string {
  const trimmed = filename.trim() || "Untitled";
  return trimmed.slice(0, TITLE_MAX);
}

export function uploadPathname(ideaId: string, contentType: string): string {
  const kind = kindFromContentType(contentType).toLowerCase();
  return `idea-factory/${ideaId}/${kind}/${crypto.randomUUID()}.${extensionFor(contentType)}`;
}

const PATH = /^idea-factory\/([0-9a-f-]{36})\/(image|document)\/[0-9a-f-]{36}\.[a-z0-9]+$/i;

/** Whether a client-chosen pathname is one this idea is allowed to write. */
export function isUploadPathname(ideaId: string, pathname: string): boolean {
  const match = PATH.exec(pathname);
  return match?.[1]?.toLowerCase() === ideaId.toLowerCase();
}

export function uploadRejection(file: Pick<File, "type" | "name" | "size">): string | null {
  if (!contentTypeOf(file)) {
    return `"${file.name}" is not a type advisors can read. Use an image, PDF, or a text file.`;
  }
  if (file.size <= 0) {
    return `"${file.name}" is empty.`;
  }
  if (file.size > MAX_ARTIFACT_BYTES) {
    return `"${file.name}" is larger than 25 MB.`;
  }
  return null;
}

export function attachmentNote(titles: string[]): string {
  if (titles.length === 0) {
    return "";
  }
  return titles.length === 1
    ? `Attached file: ${titles[0]}`
    : `Attached files: ${titles.join(", ")}`;
}

export function userMessageForMuse(content: string, titles: string[]): string {
  const text = content.trim();
  const note = attachmentNote(titles);
  if (text && note) {
    return `${text}\n\n${note}`;
  }
  return text || note || "Please review the attached files.";
}
