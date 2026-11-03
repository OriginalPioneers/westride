import "server-only";

import type { Device } from "@westride/db";
import { addAgentLog, appendAgentJobEvents, updateAgentJob } from "@westride/db/agents";
import { addTicketComment, appendAgentRunEvents, updateAgentRun } from "@westride/db/build-agents";
import { ticketKey } from "@westride/db/build-rules";
import { JOB_LEASE_MS, leaseJobForDevice, leaseRunForDevice } from "@westride/db/devices";
import { listPledgesForSupporterOnIdea } from "@westride/db/support";
import { AGENT_JOB_EVENTS_PATH, type LeasedJob, type LeasedModel } from "@westride/runner-protocol";
import { AGENT_EVENTS_PATH, getVolunteerRunnerConfig } from "@/lib/build/agent/config";
import { createRunToken } from "@/lib/build/agent/token";
import { installationToken, repoInstallationId } from "@/lib/github/app";
import { getMuseModel } from "@/lib/idea-factory/pricing";

const DEVICE_EVENT_SEQUENCE = -900;

/**
 * Gives a device one piece of work it may run, with everything it needs and
 * nothing more: a clone URL, the prompt, the model to use, and a run token
 * that only works for that work's event stream. Agent Studio jobs come
 * first, then Build Studio ticket runs; both ride the same protocol.
 */
export async function leaseForDevice(device: Device): Promise<LeasedJob | null> {
  const config = getVolunteerRunnerConfig();
  if (!config) {
    return null;
  }
  return (await leaseAgentJob(device, config.callbackBaseUrl, config.jobTimeoutMs)) ??
    (await leaseBuildRun(device, config.callbackBaseUrl, config.jobTimeoutMs));
}

/** The supporter's active COMPUTE pledge on an idea, if any. */
async function computePledgeId(clerkUserId: string, ideaId: string | null): Promise<string | null> {
  if (!ideaId) {
    return null;
  }
  const pledge = (await listPledgesForSupporterOnIdea(clerkUserId, ideaId)).find(
    (row) => row.kind === "COMPUTE" && row.status === "ACTIVE",
  );
  return pledge?.id ?? null;
}

// ---------------------------------------------------------------------------
// Agent Studio jobs
// ---------------------------------------------------------------------------

async function leaseAgentJob(device: Device, callbackBaseUrl: string, timeoutMs: number): Promise<LeasedJob | null> {
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
  const { token, hash } = createRunToken();
  await updateAgentJob(job.id, {
    callbackTokenHash: hash,
    paidByClerkUserId: device.clerkUserId,
    pledgeId: await computePledgeId(device.clerkUserId, agent.ideaId),
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
    eventsUrl: `${callbackBaseUrl}${AGENT_JOB_EVENTS_PATH}`,
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
    timeoutMs,
  };
}

// ---------------------------------------------------------------------------
// Build Studio ticket runs
// ---------------------------------------------------------------------------

/**
 * A Build Studio run on a linked computer. LOCAL runs belong to the member
 * whose computer this is, so a private repository may be cloned with a
 * short-lived, read-only token of WeStride's that is scoped to that one
 * repository; it lives in the clone URL for the clone and is wiped with the
 * checkout. SPONSORS runs are public repositories cloned anonymously.
 */
async function leaseBuildRun(device: Device, callbackBaseUrl: string, timeoutMs: number): Promise<LeasedJob | null> {
  const leased = await leaseRunForDevice(device);
  if (!leased) {
    return null;
  }
  const { run, project, ticket, repo } = leased;
  if (!run.prompt) {
    await updateAgentRun(run.id, {
      status: "FAILED",
      error: "The run was missing its brief.",
      finishedAt: new Date(),
    });
    return null;
  }

  const model: LeasedModel = run.localModel
    ? { provider: "local", model: run.localModel }
    : { provider: "meta", model: run.model, contributorMode: getMuseModel(run.model)?.isContributor ?? false };

  let cloneUrl = `https://github.com/${run.repoFullName}.git`;
  if (run.computeTarget === "LOCAL" && (repo?.isPrivate ?? true)) {
    cloneUrl = (await privateCloneUrl(run.repoFullName)) ?? cloneUrl;
  }

  const { token, hash } = createRunToken();
  await updateAgentRun(run.id, {
    callbackTokenHash: hash,
    pledgeId: run.computeTarget === "SPONSORS" ? await computePledgeId(device.clerkUserId, project.ideaId) : null,
  });
  const mine = run.computeTarget === "LOCAL";
  await appendAgentRunEvents(run.id, [
    {
      sequence: DEVICE_EVENT_SEQUENCE,
      type: "setup",
      payload: {
        step: "lease",
        message: mine
          ? `Picked up by your computer (${device.name})`
          : `Picked up by a supporter's computer (${device.name})`,
        device: device.name,
        model: model.model,
        provider: model.provider,
      },
    },
  ]);
  if (ticket) {
    await addTicketComment({
      ticketId: ticket.id,
      authorClerkUserId: null,
      agentRunId: run.id,
      body: mine
        ? `Your computer **${device.name}** picked up the run (${model.provider === "local" ? `local model \`${model.model}\`` : model.model}).`
        : `A supporter's computer (${device.name}) picked up the run (${model.provider === "local" ? `local model \`${model.model}\`` : model.model}).`,
    });
  }

  const key = ticket ? ticketKey(project.name, ticket.number) : run.branch;
  return {
    jobId: run.id,
    runToken: token,
    eventsUrl: `${callbackBaseUrl}${AGENT_EVENTS_PATH}`,
    startMessage: mine
      ? `Running on your computer (${device.name})`
      : `Running on a supporter's computer (${device.name})`,
    repo: {
      fullName: run.repoFullName,
      cloneUrl,
      baseBranch: run.baseBranch,
      branch: run.branch,
    },
    model,
    maxSteps: run.maxSteps,
    prompt: run.prompt,
    commitMessage: ticket ? `${key}: ${ticket.title}` : key,
    leaseMs: JOB_LEASE_MS,
    timeoutMs,
  };
}

/**
 * A clone URL carrying a read-only installation token for one repository,
 * so the member's own computer can clone a private repository. Null when
 * the app is not installed there; the anonymous URL is used instead and a
 * private clone then fails visibly in the work log.
 */
async function privateCloneUrl(repoFullName: string): Promise<string | null> {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    return null;
  }
  try {
    const token = await installationToken(await repoInstallationId({ owner, repo }), {
      repositories: [repo],
      permissions: { contents: "read", metadata: "read" },
    });
    return `https://x-access-token:${encodeURIComponent(token)}@github.com/${owner}/${repo}.git`;
  } catch (error) {
    console.warn("Private clone token skipped", repoFullName, error instanceof Error ? error.message : error);
    return null;
  }
}
