import { after, type NextRequest } from "next/server";
import { z } from "zod";
import { appendAgentRunEvents, getAgentRun, isRunActive } from "@westride/db/build-agents";
import { isAgentRunnerConfigured } from "@/lib/build/agent/config";
import { completeAgentRun, readFinishedPayload } from "@/lib/build/agent/finish";
import { runTokenMatches } from "@/lib/build/agent/token";

/**
 * The sandbox runner posts its work log here, a batch at a time, with the
 * run's own bearer token. proxy.ts lets this path through its user-agent
 * filter; the token is the whole of the authentication.
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
    return json(503, { error: "Agent runs are not set up on this server." });
  }
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) {
    return json(401, { error: "Missing run token." });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return json(400, { error: "Bad event batch." });
  }

  const run = await getAgentRun(parsed.runId);
  if (!run || !runTokenMatches(token, run.callbackTokenHash)) {
    return json(401, { error: "Unknown run." });
  }
  if (!isRunActive(run.status)) {
    // Cancelled or already closed. Tell the runner to stop talking.
    return json(410, { error: "This run is closed." });
  }

  const accepted = await appendAgentRunEvents(
    run.id,
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
        await completeAgentRun(run, payload);
      } catch (error) {
        console.error("Completing agent run failed", run.id, error);
      }
    });
  }

  return json(200, { accepted });
}
