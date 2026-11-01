import { after, type NextRequest } from "next/server";
import { z } from "zod";
import { getAgentJob, isJobActive } from "@westride/db/agents";
import {
  MAX_FILE_BYTES,
  MAX_RESULT_BYTES,
  MAX_RESULT_FILES,
  type ResultRequest,
  type ResultResponse,
} from "@westride/runner-protocol";
import { completeVolunteerJob } from "@/lib/agents/finish";
import { authenticateDevice, json } from "@/lib/runner/auth";

/**
 * The device's final report: how Muse Code ended and every file it changed.
 * The files are committed by WeStride, never pushed by the device, so the
 * device never needs write access to the repository.
 */

export const maxDuration = 60;

/** A repository-relative path with no way out of the tree and no git internals. */
const filePath = z
  .string()
  .min(1)
  .max(1024)
  .refine((path) => {
    if (path.startsWith("/") || path.includes("\\") || path.includes("\0")) return false;
    const parts = path.split("/");
    return parts.every((part) => part !== "" && part !== "." && part !== "..") && parts[0] !== ".git";
  }, "Bad file path.");

const usageSchema = z
  .object({
    calls: z.number().int().min(0),
    completedCalls: z.number().int().min(0).default(0),
    failedCalls: z.number().int().min(0).default(0),
    models: z
      .array(
        z.object({
          model: z.string().max(120),
          calls: z.number().int().min(0).default(0),
          inputTokens: z.number().int().min(0).default(0),
          cachedTokens: z.number().int().min(0).default(0),
          outputTokens: z.number().int().min(0).default(0),
          reasoningTokens: z.number().int().min(0).default(0),
        }),
      )
      .max(20),
  })
  .nullable();

const bodySchema = z.object({
  jobId: z.string().uuid(),
  exitCode: z.number().int().min(-1).max(255),
  museSessionId: z.string().max(200).nullable().default(null),
  summary: z.string().max(20_000).nullable().default(null),
  usage: usageSchema.default(null),
  error: z.string().max(4000).nullable().default(null),
  baseSha: z.string().regex(/^[0-9a-f]{40}$/i),
  changed: z
    .array(
      z.object({
        path: filePath,
        mode: z.enum(["100644", "100755"]),
        contentBase64: z.string().max(Math.ceil((MAX_FILE_BYTES * 4) / 3) + 4),
      }),
    )
    .max(MAX_RESULT_FILES),
  deleted: z.array(filePath).max(MAX_RESULT_FILES),
  durationMs: z.number().int().min(0),
});

export async function POST(request: NextRequest) {
  const device = await authenticateDevice(request);
  if (!device) {
    return json(401, { error: "This device is not linked. Run the installer again to pair it." });
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_RESULT_BYTES * 1.4) {
    return json(413, { error: "The result is too large to accept." });
  }
  let parsed: ResultRequest;
  try {
    parsed = bodySchema.parse(await request.json()) as ResultRequest;
  } catch {
    return json(400, { error: "Bad result." });
  }
  const totalBytes = parsed.changed.reduce((sum, file) => sum + file.contentBase64.length, 0);
  if (totalBytes > (MAX_RESULT_BYTES * 4) / 3) {
    return json(413, { error: "The changed files are too large to accept." });
  }

  const job = await getAgentJob(parsed.jobId);
  if (!job || job.deviceId !== device.id || job.runnerKind !== "VOLUNTEER_DEVICE") {
    return json(404, { error: "Unknown job." });
  }
  if (!isJobActive(job.status)) {
    return json(410, { error: "This job is closed." });
  }

  after(async () => {
    try {
      await completeVolunteerJob(job, parsed);
    } catch (error) {
      console.error("Completing a volunteer job failed", job.id, error);
    }
  });
  const body: ResultResponse = { ok: true, prUrl: null };
  return json(200, body);
}
