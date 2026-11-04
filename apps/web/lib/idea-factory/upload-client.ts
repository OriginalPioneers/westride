import { upload } from "@vercel/blob/client";
import type { IdeaFactoryArtifact } from "@westride/db";
import { registerUploadedArtifacts } from "@/app/(main)/ideas/[id]/factory/actions";
import {
  contentTypeOf,
  MAX_UPLOADS_PER_MESSAGE,
  uploadPathname,
  uploadRejection,
} from "./uploads";

export type UploadFilesResult =
  | { status: "ok"; artifacts: IdeaFactoryArtifact[] }
  | { status: "error"; message: string };

/**
 * Writes files straight to the private Blob store, then records them on
 * the idea. Used by the advisor composer and the Files & assets panel.
 */
export async function uploadIdeaFiles(
  ideaId: string,
  files: File[],
): Promise<UploadFilesResult> {
  if (files.length === 0) {
    return { status: "ok", artifacts: [] };
  }
  if (files.length > MAX_UPLOADS_PER_MESSAGE) {
    return {
      status: "error",
      message: `Attach up to ${MAX_UPLOADS_PER_MESSAGE} files at a time.`,
    };
  }
  const prepared: { file: File; contentType: string; pathname: string }[] = [];
  for (const file of files) {
    const rejected = uploadRejection(file);
    if (rejected) {
      return { status: "error", message: rejected };
    }
    const contentType = contentTypeOf(file);
    if (!contentType) {
      return {
        status: "error",
        message: `"${file.name}" is not a type advisors can read.`,
      };
    }
    prepared.push({
      file,
      contentType,
      pathname: uploadPathname(ideaId, contentType),
    });
  }

  try {
    const stored = await Promise.all(
      prepared.map(async ({ file, contentType, pathname }) => {
        const blob = await upload(pathname, file, {
          access: "private",
          handleUploadUrl: `/ideas/${ideaId}/factory/files/upload`,
          contentType,
          multipart: file.size > 5 * 1024 * 1024,
        });
        return {
          pathname: blob.pathname,
          title: file.name,
          contentType,
          sizeBytes: file.size,
        };
      }),
    );
    const result = await registerUploadedArtifacts({ ideaId, files: stored });
    if (result.status === "error") {
      return result;
    }
    return { status: "ok", artifacts: result.artifacts };
  } catch (error) {
    console.error("Idea Workshop upload failed", error);
    return {
      status: "error",
      message:
        error instanceof Error && error.message
          ? error.message
          : "Those files could not be uploaded. Try again.",
    };
  }
}
