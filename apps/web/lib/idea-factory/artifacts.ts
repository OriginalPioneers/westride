import type { ArtifactKind, IdeaFactoryArtifact } from "@westride/db";

/**
 * Client-safe helpers for the files advisors make. Storage and generation
 * live in `artifact-storage.ts` and `artifact-producer.ts` (server only).
 */

export const ARTIFACT_KIND_LABELS: Record<ArtifactKind, string> = {
  IMAGE: "Image",
  DOCUMENT: "Document",
  REPORT: "Report",
};

/** Where a member's browser reads a file from. Members only; see the route. */
export function artifactPath(ideaId: string, artifactId: string, download = false): string {
  const base = `/ideas/${ideaId}/factory/files/${artifactId}`;
  return download ? `${base}?download=1` : base;
}

export function isImageArtifact(artifact: Pick<IdeaFactoryArtifact, "contentType">): boolean {
  return artifact.contentType.startsWith("image/");
}

/** Collections keep iterations together: "logo", "brand-brief". */
export function collectionLabel(collection: string): string {
  if (!collection) {
    return "Other files";
  }
  return collection
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(0)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Artifact blocks in agent replies
// ---------------------------------------------------------------------------

/** How many files one reply may produce. Images are slow and billed per render. */
export const MAX_IMAGE_BLOCKS = 2;
export const MAX_DOCUMENT_BLOCKS = 3;
const MAX_TITLE = 120;
const MAX_COLLECTION = 60;
const MAX_PROMPT = 2000;
const MAX_DOCUMENT_CHARS = 60_000;

export type ImageBlock = {
  kind: "image";
  title: string;
  collection: string;
  prompt: string;
};

export type DocumentBlock = {
  kind: "document";
  title: string;
  collection: string;
  format: "markdown" | "text" | "csv" | "json";
  content: string;
};

export type ArtifactBlock = ImageBlock | DocumentBlock;

export const DOCUMENT_CONTENT_TYPES: Record<DocumentBlock["format"], string> = {
  markdown: "text/markdown",
  text: "text/plain",
  csv: "text/csv",
  json: "application/json",
};

/** "Logo Concept 3" → "logo-concept-3". */
export function slugifyCollection(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, MAX_COLLECTION);
}

const BLOCK_PATTERN = /```artifact[^\n]*\n([\s\S]*?)```/g;

function cleanBlock(raw: unknown): ArtifactBlock | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as Record<string, unknown>;
  const title =
    typeof value.title === "string" && value.title.trim()
      ? value.title.trim().slice(0, MAX_TITLE)
      : null;
  if (!title) {
    return null;
  }
  const collection = slugifyCollection(
    typeof value.collection === "string" && value.collection.trim() ? value.collection : title,
  );
  if (value.kind === "image") {
    const prompt = typeof value.prompt === "string" ? value.prompt.trim() : "";
    return prompt ? { kind: "image", title, collection, prompt: prompt.slice(0, MAX_PROMPT) } : null;
  }
  if (value.kind === "document") {
    const content = typeof value.content === "string" ? value.content.trim() : "";
    if (!content) {
      return null;
    }
    const format =
      value.format === "text" || value.format === "csv" || value.format === "json"
        ? value.format
        : "markdown";
    return { kind: "document", title, collection, format, content: content.slice(0, MAX_DOCUMENT_CHARS) };
  }
  return null;
}

export type ExtractedBlocks = {
  /** The reply with every artifact block removed. */
  text: string;
  blocks: ArtifactBlock[];
  /** Blocks that were present but malformed, so the member can be told. */
  rejected: number;
};

/**
 * Pulls ```artifact fences out of a reply. The fence is replaced by nothing;
 * the files render beside the message instead, so the prose should already
 * read as if they are attached.
 */
export function extractArtifactBlocks(reply: string): ExtractedBlocks {
  const blocks: ArtifactBlock[] = [];
  let rejected = 0;
  let images = 0;
  let documents = 0;
  const text = reply
    .replace(BLOCK_PATTERN, (_match, body: string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(body.trim());
      } catch {
        rejected += 1;
        return "";
      }
      const block = cleanBlock(parsed);
      if (!block) {
        rejected += 1;
        return "";
      }
      if (block.kind === "image") {
        if (images >= MAX_IMAGE_BLOCKS) {
          rejected += 1;
          return "";
        }
        images += 1;
      } else {
        if (documents >= MAX_DOCUMENT_BLOCKS) {
          rejected += 1;
          return "";
        }
        documents += 1;
      }
      blocks.push(block);
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, blocks, rejected };
}

/** What every agent is told about making files. */
export function artifactInstructions(canDrawImages: boolean): string {
  const image = canDrawImages
    ? `- An image (logo, mark, icon, mood board, screen mockup): {"kind":"image","title":"Logo concept 3","collection":"logo","prompt":"<a complete prompt for an image model: the subject, style, colours, composition, background; add 'no text' unless lettering is the point>"}. At most ${MAX_IMAGE_BLOCKS} images per reply; each render costs the team money, so make them count.
`
    : "";
  return `## Making files
You can hand the team files. To make one, put a fenced code block tagged \`artifact\` in your reply containing exactly one JSON object. The Idea Workshop turns each block into a file shown beside your reply and removes the block from the text, so write the prose as if the file is attached ("Here is the brief" rather than the brief itself).
${image}- A document (brief, guidelines, copy deck, checklist, budget, plan): {"kind":"document","title":"Brand brief v1","collection":"brand-brief","format":"markdown","content":"<the full document>"}. format may be markdown, text, csv, or json. At most ${MAX_DOCUMENT_BLOCKS} documents per reply.
- Only make a file when the member asked for a deliverable or clearly wants one to keep. Otherwise answer in prose.
- Reuse the collection name when iterating on the same deliverable so versions sit together; the team picks the one they like and archives the rest. Archived files are no longer listed in "Files the team has"; treat them as gone and build on the ones marked chosen.
- Never say you made a file without including its block, and never put an artifact block inside another code block.`;
}
