import { after, type NextRequest } from "next/server";
import { z } from "zod";
import { appendAgentJobEvents, getAgentJob, isJobActive } from "@westride/db/agents";
import { isAgentRunnerConfigured } from "@/lib/build/agent/config";
import { runTokenMatches } from "@/lib/build/agent/token";
import { completeCodeJob, readFinishedPayload } from "@/lib/agents/finish";

/**
 * The sandbox runner for an Agent Studio job posts its work log here, a
 * batch at a time, with the job's own bearer token. proxy.ts lets this path
 * through its user-agent filter; the token is the whole of the authentication.
 */

const EVENT_TYPES = ["setup", "muse", "git", "log", "finished"] as const;

const bodySchema = z.object({
  runId: z.string().uuid(),
  events: z
    .array(
      z.object({
        sequence: z.number().int().min(0).max(1_000_000),
        type: z.enum(EVENT_TYPES),
        payload: z.unknown(),
        at: z.string().optional(),
      }),
    )
    .min(1)
    .max(200),
});

export const maxDuration = 60;

function json(status: number, body: unknown) {
  return Response.json(body, { status });
}

export async function POST(request: NextRequest) {
  if (!isAgentRunnerConfigured()) {
    return json(503, { error: "Agent jobs are not set up on this server." });
  }
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) {
    return json(401, { error: "Missing job token." });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return json(400, { error: "Bad event batch." });
  }

  const job = await getAgentJob(parsed.runId);
  if (
    !job ||
    job.kind !== "CODE" ||
    !job.callbackTokenHash ||
    !runTokenMatches(token, job.callbackTokenHash)
  ) {
    return json(401, { error: "Unknown job." });
  }
  if (!isJobActive(job.status)) {
    return json(410, { error: "This job is closed." });
  }

  const accepted = await appendAgentJobEvents(
    job.id,
    parsed.events.map((event) => ({
      sequence: event.sequence,
      type: event.type,
      payload: event.payload ?? null,
    })),
  );

  const finished = parsed.events.find((event) => event.type === "finished");
  if (finished) {
    const payload = readFinishedPayload(finished.payload) ?? {
      exitCode: 1,
      error: "The runner's final report could not be read.",
    };
    after(async () => {
      try {
        await completeCodeJob(job, payload);
      } catch (error) {
        console.error("Completing agent job failed", job.id, error);
      }
    });
  }

  return json(200, { accepted });
}
