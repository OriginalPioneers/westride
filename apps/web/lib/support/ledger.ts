import "server-only";

import type { AgentJob } from "@westride/db";
import { recordContribution } from "@westride/db/support";

/**
 * Credits a finished job to the pledge it drew on. Safe to call for any job:
 * jobs without a pledge are ignored, and a job is only ever credited once.
 */
export async function creditJobToPledge(job: AgentJob): Promise<void> {
  if (!job.pledgeId) {
    return;
  }
  const started = job.startedAt ?? job.createdAt;
  const finished = job.finishedAt ?? new Date();
  const wallClockSeconds = Math.max(0, Math.round((finished.getTime() - started.getTime()) / 1000));
  try {
    await recordContribution({
      pledgeId: job.pledgeId,
      jobId: job.id,
      deviceId: job.deviceId,
      estimatedCostMicros: job.estimatedCostMicros,
      inputTokens: job.inputTokens,
      outputTokens: job.outputTokens,
      wallClockSeconds,
    });
  } catch (error) {
    console.error("Pledge contribution could not be recorded", job.id, error);
  }
}
