import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@clerk/nextjs/server";
import { isIdeaMember } from "@westride/db/idea-factory";
import { NextResponse } from "next/server";
import { isArtifactStorageConfigured } from "@/lib/idea-factory/artifact-storage";
import {
  isUploadPathname,
  MAX_ARTIFACT_BYTES,
  UPLOAD_CONTENT_TYPES,
} from "@/lib/idea-factory/uploads";

/**
 * Mints a short-lived token so the browser can write one file into the
 * private Blob store. The artifact row is created afterwards, once the
 * bytes are known to be there — Vercel cannot call back into localhost.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: ideaId } = await params;
  if (!UUID.test(ideaId)) {
    return NextResponse.json({ error: "That idea does not exist." }, { status: 404 });
  }
  if (!isArtifactStorageConfigured()) {
    return NextResponse.json(
      { error: "File storage is not set up on this server." },
      { status: 503 },
    );
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to upload a file." }, { status: 401 });
  }
  const member = await isIdeaMember(ideaId, userId);
  if (!member) {
    return NextResponse.json({ error: "Only members of this idea can upload files." }, { status: 403 });
  }

  const token = process.env.BLOB_PRIVATE_READ_WRITE_TOKEN;
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "That upload request was not readable." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname) => {
        if (!isUploadPathname(ideaId, pathname)) {
          throw new Error("That upload path is not allowed.");
        }
        return {
          allowedContentTypes: [...UPLOAD_CONTENT_TYPES],
          maximumSizeInBytes: MAX_ARTIFACT_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
      onUploadCompleted: async () => {
        // The client registers the artifact after the put finishes.
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The upload could not start.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
