import { auth } from "@clerk/nextjs/server";
import { getArtifact, isIdeaMember } from "@westride/db/idea-factory";
import { NextResponse, type NextRequest } from "next/server";
import { openArtifact } from "@/lib/idea-factory/artifact-storage";

/**
 * Serves one file the advisory team made. Bytes sit in the private Blob
 * store, so this is the only way to read them, and only members of the idea
 * get through. `?download=1` asks the browser to save instead of display.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeFilename(title: string, pathname: string): string {
  const extension = pathname.split(".").pop() ?? "bin";
  const base = title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${base || "file"}.${extension}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; artifactId: string }> },
) {
  const { id, artifactId } = await params;
  if (!UUID.test(id) || !UUID.test(artifactId)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Sign in to open this file.", { status: 401 });
  }
  const [artifact, member] = await Promise.all([
    getArtifact(artifactId, id),
    isIdeaMember(id, userId),
  ]);
  if (!artifact || !member) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ifNoneMatch = request.headers.get("if-none-match");
  const etag = `"${artifact.id}"`;
  if (ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304 });
  }

  let file: Awaited<ReturnType<typeof openArtifact>>;
  try {
    file = await openArtifact(artifact.pathname);
  } catch (error) {
    console.error("Artifact read failed", error);
    return new NextResponse("The file could not be read.", { status: 502 });
  }
  if (!file) {
    return new NextResponse("That file is no longer stored.", { status: 410 });
  }

  const disposition = request.nextUrl.searchParams.get("download") ? "attachment" : "inline";
  const filename = safeFilename(artifact.title, artifact.pathname);
  return new NextResponse(file.stream, {
    status: 200,
    headers: {
      "Content-Type": file.contentType || artifact.contentType,
      "Content-Length": String(file.size),
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      // The bytes under one id never change; members may cache them privately.
      "Cache-Control": "private, max-age=3600",
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
