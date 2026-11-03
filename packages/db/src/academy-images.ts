// ---------------------------------------------------------------------------
// Draws the Academy's lesson images and diagrams with Muse Image, uploads
// them to the public Blob store, and writes each URL back into the lesson
// catalog, so the seed carries the finished asset.
//
//   bun run academy:images                      every artifact without a URL
//   bun run academy:images -- --track ai-foundations
//   bun run academy:images -- --lesson ai-foundations/what-is-ai
//   bun run academy:images -- --force           redraw artifacts that have one
//   bun run academy:images -- --concurrency 2
//
// Uploads go to academy/<track>/<lesson>/<key>.webp at a fixed path, so a
// redraw replaces the file and the URL in the catalog stays the same. Reads
// WESTRIDE_CLOUD_META_API_KEY and BLOB_PUBLIC_READ_WRITE_TOKEN from
// apps/web/.env; the public store is shared by every environment.
// ---------------------------------------------------------------------------
import { put } from "@vercel/blob";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { academyLessons, validateAcademyLessons } from "./academy-lessons";
import type { LessonArtifactSeed } from "./academy-lessons";
import { loadDbEnv } from "./load-env";
import { fail } from "./run";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lessonsDir = resolve(packageDir, "src/academy-lessons");

const MUSE_IMAGES_URL = "https://api.meta.ai/v1/images/generations";
const MUSE_IMAGE_MODEL = "muse-image-1.0";
/** Sets the aspect ratio; Muse renders at its own resolution. */
const IMAGE_SIZE = "1792x1024";
const REQUEST_TIMEOUT_MS = 170_000;
const ATTEMPTS = 3;

/** Shared look so the images read as one course, whatever the brief asks for. */
const STYLE = [
  "Educational illustration for an online course about AI, landscape 16:9.",
  "Flat vector style with clean lines, generous whitespace, and high contrast on a light background.",
  "Palette: indigo, violet, blue, and teal with a warm orange accent.",
  "Any text must be short, correctly spelled, and in a legible sans-serif.",
  "No watermark, no signature, no border.",
].join(" ");

try {
  loadDbEnv(packageDir, "development");
  validateAcademyLessons();
} catch (error) {
  fail(error);
}

const args = process.argv.slice(2);

function option(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index < 0) return undefined;
  const value = args[index + 1];
  return value === undefined || value.startsWith("--") ? "" : value;
}

const force = args.includes("--force");
const onlyTrack = option("track");
const onlyLesson = option("lesson");
const concurrency = Math.max(1, Number(option("concurrency") ?? 3) || 3);

const museKey = process.env.WESTRIDE_CLOUD_META_API_KEY;
const blobToken = process.env.BLOB_PUBLIC_READ_WRITE_TOKEN;
if (!museKey) fail(new Error("WESTRIDE_CLOUD_META_API_KEY is not set in apps/web/.env."));
if (!blobToken) fail(new Error("BLOB_PUBLIC_READ_WRITE_TOKEN is not set in apps/web/.env."));

type Job = {
  trackSlug: string;
  lessonSlug: string;
  artifact: LessonArtifactSeed;
};

const jobs: Job[] = [];
for (const track of academyLessons) {
  if (onlyTrack && track.trackSlug !== onlyTrack) continue;
  for (const lesson of track.lessons) {
    if (onlyLesson && `${track.trackSlug}/${lesson.slug}` !== onlyLesson) continue;
    for (const artifact of lesson.artifacts) {
      if (artifact.kind !== "IMAGE" && artifact.kind !== "DIAGRAM") continue;
      if (artifact.url && !force) continue;
      jobs.push({ trackSlug: track.trackSlug, lessonSlug: lesson.slug, artifact });
    }
  }
}

if (jobs.length === 0) {
  console.log("Every image already has a URL. Pass --force to redraw.");
  process.exit(0);
}

console.log(`Drawing ${jobs.length} image(s) with ${MUSE_IMAGE_MODEL}, ${concurrency} at a time.`);

let done = 0;
const failures: string[] = [];
const queue = [...jobs];

async function worker(): Promise<void> {
  for (let job = queue.shift(); job; job = queue.shift()) {
    const label = `${job.trackSlug}/${job.lessonSlug}/${job.artifact.key}`;
    try {
      const image = await drawImage(job.artifact);
      const url = await upload(job, image);
      writeUrlIntoCatalog(job, url);
      done++;
      console.log(`[${done}/${jobs.length}] ${label} → ${url}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${label}: ${message}`);
      console.error(`${label} failed: ${message}`);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));

if (failures.length > 0) {
  fail(new Error(`${failures.length} image(s) failed:\n- ${failures.join("\n- ")}`));
}
console.log(`Done. ${done} image URL(s) written into packages/db/src/academy-lessons. Re-run db:seed to publish them.`);

// ---------------------------------------------------------------------------

async function drawImage(artifact: LessonArtifactSeed): Promise<Buffer> {
  const prompt = `${artifact.brief}\n\n${STYLE}`;
  let lastError = "Muse did not answer.";
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const response = await fetch(MUSE_IMAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${museKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: MUSE_IMAGE_MODEL,
        prompt,
        n: 1,
        size: IMAGE_SIZE,
        output_format: "webp",
        response_format: "b64_json",
        user: "westride-academy-images",
        tool_enablement: { enable_web_search: false, enable_shell: false },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = (await response.json().catch(() => null)) as
      | { data?: { b64_json?: string }[]; error?: { message?: string } }
      | null;
    if (response.ok) {
      const encoded = body?.data?.[0]?.b64_json;
      if (encoded) return Buffer.from(encoded, "base64");
      lastError = "Muse returned no image; the brief may have tripped its safety filter.";
    } else {
      lastError = body?.error?.message ?? `Meta Model API answered ${response.status}.`;
      // Only rate limits and server trouble are worth another try.
      if (response.status < 429) break;
    }
    if (attempt < ATTEMPTS) {
      await new Promise((r) => setTimeout(r, attempt * 5_000));
    }
  }
  throw new Error(lastError);
}

async function upload(job: Job, image: Buffer): Promise<string> {
  const blob = await put(
    `academy/${job.trackSlug}/${job.lessonSlug}/${job.artifact.key}.webp`,
    image,
    {
      access: "public",
      contentType: "image/webp",
      token: blobToken,
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    },
  );
  return blob.url;
}

/**
 * Sets `url` on one artifact in its track's source file, right after the
 * brief, replacing any url already there. The catalog is TypeScript rather
 * than data, so this edits text; the lesson and artifact are located by their
 * `slug:` and `key:` lines and the edit is refused if either is missing.
 */
function writeUrlIntoCatalog(job: Job, url: string): void {
  const file = resolve(lessonsDir, `${job.trackSlug}.ts`);
  if (!existsSync(file)) {
    throw new Error(`No catalog file for track "${job.trackSlug}" at ${file}.`);
  }
  const source = readFileSync(file, "utf8");

  const lessonStart = source.indexOf(`slug: "${job.lessonSlug}",`);
  if (lessonStart < 0) throw new Error(`Lesson "${job.lessonSlug}" not found in ${file}.`);
  const nextLesson = /^\s*slug: "/gm;
  nextLesson.lastIndex = lessonStart + 1;
  const lessonEnd = nextLesson.exec(source)?.index ?? source.length;

  const keyStart = source.indexOf(`key: "${job.artifact.key}",`, lessonStart);
  if (keyStart < 0 || keyStart >= lessonEnd) {
    throw new Error(`Artifact "${job.artifact.key}" not found in lesson "${job.lessonSlug}".`);
  }
  const briefRe = /brief:\s*"(?:[^"\\]|\\.)*",/g;
  briefRe.lastIndex = keyStart;
  const brief = briefRe.exec(source);
  if (!brief || brief.index >= lessonEnd) {
    throw new Error(`Artifact "${job.artifact.key}" has no brief to anchor the URL to.`);
  }
  const afterBrief = brief.index + brief[0].length;
  const lineStart = source.lastIndexOf("\n", brief.index) + 1;
  const indent = /^\s*/.exec(source.slice(lineStart))?.[0] ?? "";
  const existing = /^\r?\n\s*url:\s*(?:"(?:[^"\\]|\\.)*"|null),/.exec(source.slice(afterBrief));
  const insertion = `\n${indent}url: "${url}",`;
  const updated =
    source.slice(0, afterBrief) +
    insertion +
    source.slice(afterBrief + (existing?.[0].length ?? 0));
  writeFileSync(file, updated);
}
