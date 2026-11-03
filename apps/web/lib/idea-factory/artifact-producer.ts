import "server-only";

import { createHash } from "node:crypto";
import type { IdeaFactoryArtifact } from "@westride/db";
import { createArtifact } from "@westride/db/idea-factory";
import sharp from "sharp";
import type { MuseAccess } from "@/lib/cloud/provider";
import {
  DOCUMENT_CONTENT_TYPES,
  type ArtifactBlock,
  type DocumentBlock,
  type ImageBlock,
} from "./artifacts";
import { isArtifactStorageConfigured, storeArtifact } from "./artifact-storage";
import { generateMuseImage, type MuseAttempt } from "./muse";
import { MUSE_IMAGE_MODEL } from "./pricing";

/**
 * Turns the artifact blocks in an advisor's reply into stored files. Images
 * go through Muse Image on the member's key (or WeStride Cloud's); documents
 * are written as-is. Every image render is handed back as an attempt so the
 * caller can log and bill it like any other Muse request.
 */

/** Renders at 1024 and keeps a PNG: logos need crisp edges and transparency-friendly bytes. */
const IMAGE_SIZE = 1024;

export type ProducedArtifact = {
  artifact: IdeaFactoryArtifact;
  /** Set for images: the Muse Image call that drew it. */
  attempt: MuseAttempt | null;
};

export type ProducerFailure = {
  block: ArtifactBlock;
  message: string;
  attempt: MuseAttempt | null;
};

export type ProducerResult = {
  produced: ProducedArtifact[];
  failed: ProducerFailure[];
};

type Target = {
  ideaId: string;
  clerkUserId: string;
  agentSlug: string | null;
  messageId: string | null;
};

async function produceDocument(
  target: Target,
  block: DocumentBlock,
): Promise<ProducedArtifact | ProducerFailure> {
  const contentType = DOCUMENT_CONTENT_TYPES[block.format];
  try {
    const stored = await storeArtifact({
      ideaId: target.ideaId,
      kind: "DOCUMENT",
      bytes: Buffer.from(block.content, "utf8"),
      contentType: `${contentType}; charset=utf-8`,
    });
    const artifact = await createArtifact({
      ...target,
      kind: "DOCUMENT",
      collection: block.collection,
      title: block.title,
      description: firstLine(block.content),
      pathname: stored.pathname,
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
    });
    return { artifact, attempt: null };
  } catch (error) {
    console.error("Document artifact failed", error);
    return { block, message: `"${block.title}" could not be saved.`, attempt: null };
  }
}

function firstLine(markdown: string): string {
  const line = markdown
    .split("\n")
    .map((item) => item.replace(/^#+\s*/, "").trim())
    .find((item) => item.length > 0);
  return (line ?? "").slice(0, 200);
}

async function produceImage(
  target: Target,
  block: ImageBlock,
  access: MuseAccess,
): Promise<ProducedArtifact | ProducerFailure> {
  const result = await generateMuseImage({
    apiKey: access.apiKey,
    model: MUSE_IMAGE_MODEL.id,
    prompt: block.prompt,
    size: `${IMAGE_SIZE}x${IMAGE_SIZE}`,
    user: createHash("sha256").update(target.clerkUserId).digest("hex"),
    costPerImageMicros: MUSE_IMAGE_MODEL.perImageMicros,
  });
  if (!result.image) {
    return {
      block,
      message: result.attempt.error ?? `Muse did not draw "${block.title}".`,
      attempt: result.attempt,
    };
  }
  try {
    const png = await sharp(result.image).png({ compressionLevel: 8 }).toBuffer();
    const stored = await storeArtifact({
      ideaId: target.ideaId,
      kind: "IMAGE",
      bytes: png,
      contentType: "image/png",
    });
    const artifact = await createArtifact({
      ...target,
      kind: "IMAGE",
      collection: block.collection,
      title: block.title,
      description: block.prompt,
      pathname: stored.pathname,
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
    });
    return { artifact, attempt: result.attempt };
  } catch (error) {
    console.error("Image artifact failed", error);
    return { block, message: `"${block.title}" could not be saved.`, attempt: result.attempt };
  }
}

function isFailure(value: ProducedArtifact | ProducerFailure): value is ProducerFailure {
  return "message" in value;
}

/**
 * Produces every block at once. When the private store is not configured on
 * this deployment every block fails with one clear message, and the reply
 * still goes through without files.
 */
export async function produceArtifacts(input: {
  target: Target;
  blocks: ArtifactBlock[];
  access: MuseAccess;
}): Promise<ProducerResult> {
  if (input.blocks.length === 0) {
    return { produced: [], failed: [] };
  }
  if (!isArtifactStorageConfigured()) {
    return {
      produced: [],
      failed: input.blocks.map((block) => ({
        block,
        message: "File storage is not set up on this server, so the file could not be kept.",
        attempt: null,
      })),
    };
  }
  const settled = await Promise.all(
    input.blocks.map((block) =>
      block.kind === "image"
        ? produceImage(input.target, block, input.access)
        : produceDocument(input.target, block),
    ),
  );
  return {
    produced: settled.filter((item): item is ProducedArtifact => !isFailure(item)),
    failed: settled.filter(isFailure),
  };
}
