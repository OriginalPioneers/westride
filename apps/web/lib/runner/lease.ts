import "server-only";

import type { Device } from "@westride/db";
import { addAgentLog, appendAgentJobEvents, updateAgentJob } from "@westride/db/agents";
import { JOB_LEASE_MS, leaseJobForDevice } from "@westride/db/devices";
import { listPledgesForSupporterOnIdea } from "@westride/db/support";
import { AGENT_JOB_EVENTS_PATH, type LeasedJob, type LeasedModel } from "@westride/runner-protocol";
import { getVolunteerRunnerConfig } from "@/lib/build/agent/config";
import { createRunToken } from "@/lib/build/agent/token";
import { getMuseModel } from "@/lib/idea-factory/pricing";

const DEVICE_EVENT_SEQUENCE = -900;

/**
 * Gives a device one job it may run, with everything it needs and nothing
 * more: a public clone URL, the prompt, the model to use, and a run token
 * that only works for this job's event stream.
 */
export async function leaseForDevice(device: Device): Promise<LeasedJob | null> {
  const config = getVolunteerRunnerConfig();
  if (!config) {
    return null;
  }
  const leased = await leaseJobForDevice(device);
  if (!leased) {
    return null;
  }
  const { job, agent } = leased;
  if (!job.repoFullName || !job.branch || !job.baseBranch || !job.prompt) {
    await updateAgentJob(job.id, {
      status: "FAILED",
      error: "The job was missing its repository or prompt.",
      finishedAt: new Date(),
    });
    return null;
  }

  const model: LeasedModel = device.hasMetaKey
    ? { provider: "meta", model: agent.model, contributorMode: getMuseModel(agent.model)?.isContributor ?? false }
    : { provider: "local", model: agent.volunteerLocalModel ?? "" };

  // The supporter's COMPUTE pledge on this idea is what the job is credited to.
  const pledge = agent.ideaId
    ? (await listPledgesForSupporterOnIdea(device.clerkUserId, agent.ideaId)).find(
        (row) => row.kind === "COMPUTE" && row.status === "ACTIVE",
      )
    : undefined;

  const { token, hash } = createRunToken();
  await updateAgentJob(job.id, {
    callbackTokenHash: hash,
    paidByClerkUserId: device.clerkUserId,
    pledgeId: pledge?.id ?? null,
  });
  await appendAgentJobEvents(job.id, [
    {
      sequence: DEVICE_EVENT_SEQUENCE,
      type: "setup",
      payload: {
        step: "lease",
        message: `Picked up by a supporter's computer (${device.name})`,
        device: device.name,
        model: model.model,
        provider: model.provider,
      },
    },
  ]);
  await addAgentLog(agent.id, {
    kind: "job",
    message: `A supporter's computer (${device.name}) picked up the job for ${job.ticketTitle}.`,
    ticketId: job.ticketId,
    jobId: job.id,
  });

  return {
    jobId: job.id,
    runToken: token,
    eventsUrl: `${config.callbackBaseUrl}${AGENT_JOB_EVENTS_PATH}`,
    repo: {
      fullName: job.repoFullName,
      cloneUrl: `https://github.com/${job.repoFullName}.git`,
      baseBranch: job.baseBranch,
      branch: job.branch,
    },
    model,
    maxSteps: job.maxSteps,
    prompt: job.prompt,
    commitMessage: job.ticketTitle,
    leaseMs: JOB_LEASE_MS,
    timeoutMs: config.jobTimeoutMs,
  };
}
