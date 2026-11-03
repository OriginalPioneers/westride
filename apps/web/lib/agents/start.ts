import "server-only";

import type { Agent, AgentJobTrigger, AgentTicket } from "@westride/db";
import {
  addAgentLog,
  appendAgentJobEvents,
  countActiveJobsForAgent,
  createAgentJob,
  getActiveJobForTicket,
  getAgentContextLinks,
  getAgentJob,
  moveAgentTicket,
  updateAgentJob,
} from "@westride/db/agents";
import { agentTicketKey } from "@westride/db/agent-rules";
import { logMuseRequest } from "@westride/db/idea-factory";
import { hasEligibleDevice } from "@westride/db/devices";
import { getAgentRunnerConfig, getVolunteerRunnerConfig } from "@/lib/build/agent/config";
import type { AgentConnection } from "@/lib/build/agent/start";
import { createRunToken } from "@/lib/build/agent/token";
import { settleMuseRequest } from "@/lib/cloud/billing";
import { resolveMuseAccess, resolveSandboxAccess, type MuseAccess } from "@/lib/cloud/provider";
import { isSandboxCredentialError, launchSandbox } from "@/lib/cloud/sandbox";
import { agentTokenFailureMessage, installationToken, publicReadToken, repoInstallationId } from "@/lib/github/app";
import { requireGithubAppConfig } from "@/lib/github/config";
import { githubJson, isGithubStatus, type GithubApiError } from "@/lib/github/http";
import { getGithubUserToken } from "@/lib/github/user";
import { callMuse } from "@/lib/idea-factory/muse";
import { getMuseModel } from "@/lib/idea-factory/pricing";
import { AGENT_JOB_EVENTS_PATH, MAX_ACTIVE_JOBS_PER_AGENT } from "./config";
import { completeReportJob } from "./finish";
import {
  agentJobBranchName,
  buildCodeJobPrompt,
  buildReportJobInput,
  buildReportJobInstructions,
  type AgentPromptContext,
} from "./prompt";
import { usageFromMuseAttempt } from "./usage";

export class AgentJobError extends Error {
  constructor(
    message: string,
    readonly needsConnection: AgentConnection | null = null,
  ) {
    super(message);
    this.name = "AgentJobError";
  }
}

const SERVER_EVENT_SEQUENCE = -1000;
/** Pass as `afterSequence` to read a job's log from the very start. */
export const FIRST_EVENT_SEQUENCE = -10_000;
const MAX_REPORT_SUMMARY = 20_000;

type RawRepo = {
  id: number;
  archived: boolean;
  default_branch: string;
  permissions?: { push?: boolean };
};

export type StartJobInput = {
  agent: Agent;
  ticket: AgentTicket;
  trigger: AgentJobTrigger;
  /** Who pressed the button. Null for scheduled jobs. */
  startedByClerkUserId: string | null;
  /** Whose Meta key (and GitHub access) the job uses. */
  payerClerkUserId: string;
  /** The TOKENS pledge the payer is spending from, when a sponsor pays. */
  pledgeId: string | null;
  instructions: string;
};

export type StartedJob = {
  jobId: string;
  kind: "CODE" | "REPORT";
  /** Set when the job is waiting for a supporter's device rather than running already. */
  queuedForVolunteer?: boolean;
  /**
   * Report jobs do their work after the response goes out. The caller runs
   * this in `after()` (or awaits it directly from a background route).
   */
  work: (() => Promise<void>) | null;
};

/** Whether this agent's jobs can run as code in its repository right now. */
export function canRunCode(agent: Agent): boolean {
  return Boolean(agent.repoOwner && agent.repoName) && getAgentRunnerConfig() !== null;
}

/**
 * Whether a supporter's computer could take this agent's next code job: the
 * owner opted in, the repository is public, and a pledged device is online.
 */
export async function canRunOnVolunteer(agent: Agent): Promise<boolean> {
  if (
    !agent.repoOwner ||
    !agent.repoName ||
    !agent.allowVolunteerCompute ||
    agent.repoIsPrivate !== false ||
    !agent.ideaId ||
    getVolunteerRunnerConfig() === null
  ) {
    return false;
  }
  return hasEligibleDevice(agent);
}

/**
 * Starts a job for a ticket. Code jobs launch a sandbox and come back
 * through the events route; report jobs make one Model API call. The payer's
 * own Meta key and Vercel account are used when they have them; otherwise
 * WeStride Cloud runs the work against their balance. When the owner allows
 * it and a supporter's device is online, a code job is queued for that
 * device instead of a sandbox.
 */
export async function startAgentJob(input: StartJobInput): Promise<StartedJob> {
  const { agent, ticket, payerClerkUserId } = input;
  if (agent.status !== "ACTIVE") {
    throw new AgentJobError("This agent is paused. Resume it in Settings to run jobs.");
  }
  if (await getActiveJobForTicket(ticket.id)) {
    throw new AgentJobError("The agent is already working on this ticket.");
  }
  if ((await countActiveJobsForAgent(agent.id)) >= MAX_ACTIVE_JOBS_PER_AGENT) {
    throw new AgentJobError("This agent already has a job running. Wait for it to finish.");
  }

  const links = await getAgentContextLinks(agent);
  const context: AgentPromptContext = {
    agent,
    ticket,
    instructions: input.instructions,
    idea: links.idea,
    project: links.project,
  };

  if (await canRunOnVolunteer(agent)) {
    return startVolunteerJob(input, context);
  }

  const muse = await resolveMuseAccess(payerClerkUserId);
  if (!muse.ok) {
    throw new AgentJobError(
      input.trigger === "MANUAL"
        ? muse.message
        : "The owner has no Meta account connected and no WeStride Cloud balance, so the scheduled job could not run.",
      "meta",
    );
  }

  if (canRunCode(agent)) {
    return startCodeJob(input, context, muse.access);
  }
  return startReportJob(input, context, muse.access);
}

// ---------------------------------------------------------------------------
// Code jobs: Muse Code in a sandbox, like Build Studio
// ---------------------------------------------------------------------------

async function startCodeJob(
  input: StartJobInput,
  context: AgentPromptContext,
  muse: MuseAccess,
): Promise<StartedJob> {
  const { agent, ticket, payerClerkUserId } = input;
  const config = getAgentRunnerConfig();
  if (!config || !agent.repoOwner || !agent.repoName) {
    throw new AgentJobError("Muse Code agents are not set up on this WeStride server.");
  }
  const { commitAuthor } = requireGithubAppConfig();

  // The sandbox runs on the payer's Vercel or Modal account, or on WeStride Cloud against their balance.
  const sandboxAccess = await resolveSandboxAccess(payerClerkUserId);
  if (!sandboxAccess.ok) {
    throw new AgentJobError(
      input.trigger === "MANUAL"
        ? sandboxAccess.message
        : "The owner has no Vercel or Modal account connected and no WeStride Cloud balance, so the scheduled job could not run.",
      "compute",
    );
  }

  const userToken = await getGithubUserToken(payerClerkUserId);
  if (!userToken) {
    throw new AgentJobError(
      input.trigger === "MANUAL"
        ? "Connect GitHub in Settings to run this agent in its repository."
        : "The owner's GitHub account is not connected, so the scheduled job could not run.",
      "github",
    );
  }
  const ref = { owner: agent.repoOwner, repo: agent.repoName };
  let raw: RawRepo;
  try {
    raw = await githubJson<RawRepo>(`/repos/${ref.owner}/${ref.repo}`, { token: userToken });
  } catch (error) {
    if (isGithubStatus(error, 401, 403, 404)) {
      throw new AgentJobError("Grant WeStride access to this repository on GitHub first.", "github");
    }
    throw error;
  }
  if (!raw.permissions?.push) {
    throw new AgentJobError("You do not have write access to this repository.");
  }
  if (raw.archived) {
    throw new AgentJobError("This repository is archived on GitHub.");
  }

  let githubToken: string;
  try {
    githubToken = await installationToken(await repoInstallationId(ref), {
      repository_ids: [raw.id],
      permissions: { contents: "write", pull_requests: "write", metadata: "read" },
    });
  } catch (error) {
    if (isGithubStatus(error, 404, 422)) {
      throw new AgentJobError(agentTokenFailureMessage((error as GithubApiError).status), "github");
    }
    throw error;
  }

  const baseBranch = raw.default_branch || agent.repoDefaultBranch || "main";
  const branch = agentJobBranchName(agent, ticket);
  const { token: runToken, hash } = createRunToken();
  const repoFullName = `${agent.repoOwner}/${agent.repoName}`;
  const job = await createAgentJob({
    agentId: agent.id,
    ticketId: ticket.id,
    ticketTitle: ticket.title,
    trigger: input.trigger,
    kind: "CODE",
    startedByClerkUserId: input.startedByClerkUserId,
    paidByClerkUserId: payerClerkUserId,
    pledgeId: input.pledgeId,
    runnerKind: sandboxAccess.access.kind,
    computeSource: sandboxAccess.access.source,
    museSource: muse.source,
    model: agent.model,
    maxSteps: agent.maxSteps,
    repoFullName,
    branch,
    baseBranch,
    callbackTokenHash: hash,
  });

  const key = agentTicketKey(agent.name, ticket.number);
  const prompt = buildCodeJobPrompt({ ...context, branch });
  const model = getMuseModel(agent.model);
  const onCloud = sandboxAccess.access.source === "WESTRIDE_CLOUD";
  const hostName = sandboxAccess.access.kind === "MODAL_SANDBOX" ? "Modal" : "Vercel";

  try {
    await appendAgentJobEvents(job.id, [
      {
        sequence: SERVER_EVENT_SEQUENCE,
        type: "setup",
        payload: {
          step: "sandbox",
          message: onCloud ? "Creating WeStride Cloud sandbox" : "Creating sandbox",
          repo: repoFullName,
          branch,
        },
      },
    ]);
    const launched = await launchSandbox({
      access: sandboxAccess.access,
      sandboxName: `westride-agent-${job.id}`,
      repoFullName,
      baseBranch,
      githubToken,
      museKey: muse.apiKey,
      runToken,
      prompt,
      vcpus: config.vcpus,
      timeoutMs: config.sandboxTimeoutMs,
      tags: { app: "westride", agentJob: job.id.slice(0, 8) },
      runnerEnv: {
        WESTRIDE_RUN_ID: job.id,
        WESTRIDE_CALLBACK_URL: `${config.callbackBaseUrl}${AGENT_JOB_EVENTS_PATH}`,
        REPO_FULL_NAME: repoFullName,
        BRANCH: branch,
        BASE_BRANCH: baseBranch,
        MUSE_MODEL: agent.model,
        CONTRIBUTOR_MODE: model?.isContributor ? "on" : "off",
        MAX_STEPS: String(agent.maxSteps),
        COMMIT_MESSAGE: `${key}: ${ticket.title}`,
        GIT_AUTHOR_NAME: commitAuthor?.name ?? `${agent.name} (WeStride)`,
        GIT_AUTHOR_EMAIL: commitAuthor?.email ?? "agents@westride.org",
      },
    });

    await updateAgentJob(job.id, {
      status: "RUNNING",
      sandboxName: launched.sandboxName,
      startedAt: new Date(),
    });
    await afterStart(
      input,
      job.id,
      `Started a Muse Code job for ${key} in ${repoFullName} on ${branch}${onCloud ? " (WeStride Cloud)" : ""}.`,
    );
    return { jobId: job.id, kind: "CODE", work: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Agent code job launch failed", job.id, error);
    await updateAgentJob(job.id, {
      status: "FAILED",
      error: `The sandbox could not be started: ${message}`,
      finishedAt: new Date(),
    });
    await addAgentLog(agent.id, {
      kind: "job",
      message: `The sandbox for ${key} could not be started.`,
      ticketId: ticket.id,
      jobId: job.id,
    });
    if (onCloud) {
      throw new AgentJobError("WeStride Cloud could not start the sandbox. Try again in a moment.");
    }
    if (isSandboxCredentialError(error)) {
      throw new AgentJobError(
        input.trigger === "MANUAL"
          ? hostName === "Modal"
            ? "Modal refused the sandbox on your account. Reconnect Modal in Settings with a token that is still active."
            : "Vercel refused the sandbox on your account. Reconnect Vercel in Settings and check the team has Sandbox enabled."
          : `${hostName} refused the sandbox on the owner's account, so the scheduled job could not run.`,
        "compute",
      );
    }
    throw new AgentJobError("The sandbox could not be started. Try again in a moment.");
  }
}

// ---------------------------------------------------------------------------
// Volunteer jobs: queued for a supporter's device to lease
// ---------------------------------------------------------------------------

/**
 * Parks a code job for a pledged device. The device clones the public
 * repository anonymously, runs Muse Code, and sends the changed files back;
 * WeStride commits them and opens the pull request. No credential of the
 * team's ever reaches the device, and the team's Meta key is not used.
 */
async function startVolunteerJob(input: StartJobInput, context: AgentPromptContext): Promise<StartedJob> {
  const { agent, ticket } = input;
  if (!agent.repoOwner || !agent.repoName) {
    throw new AgentJobError("This agent has no repository.");
  }
  const ref = { owner: agent.repoOwner, repo: agent.repoName };
  const readToken = await publicReadToken();
  let raw: RawRepo & { private?: boolean };
  try {
    raw = await githubJson<RawRepo & { private?: boolean }>(`/repos/${ref.owner}/${ref.repo}`, {
      token: readToken,
    });
  } catch (error) {
    if (isGithubStatus(error, 404)) {
      throw new AgentJobError("The repository could not be found on GitHub.", "github");
    }
    throw error;
  }
  if (raw.private) {
    throw new AgentJobError("Supporters can only run jobs in public repositories.");
  }
  if (raw.archived) {
    throw new AgentJobError("This repository is archived on GitHub.");
  }
  try {
    await repoInstallationId(ref);
  } catch (error) {
    if (isGithubStatus(error, 404)) {
      throw new AgentJobError("Install the WeStride GitHub App on this repository first.", "github");
    }
    throw error;
  }

  const baseBranch = raw.default_branch || agent.repoDefaultBranch || "main";
  const branch = agentJobBranchName(agent, ticket);
  const repoFullName = `${agent.repoOwner}/${agent.repoName}`;
  const prompt = buildCodeJobPrompt({ ...context, branch });
  // The run token is minted when a device leases the job (lib/runner/lease.ts),
  // so nothing usable sits on a job that is only waiting.
  const job = await createAgentJob({
    agentId: agent.id,
    ticketId: ticket.id,
    ticketTitle: ticket.title,
    trigger: input.trigger,
    kind: "CODE",
    startedByClerkUserId: input.startedByClerkUserId,
    paidByClerkUserId: input.payerClerkUserId,
    pledgeId: null,
    runnerKind: "VOLUNTEER_DEVICE",
    model: agent.model,
    maxSteps: agent.maxSteps,
    prompt,
    repoFullName,
    branch,
    baseBranch,
  });

  const key = agentTicketKey(agent.name, ticket.number);
  await appendAgentJobEvents(job.id, [
    {
      sequence: SERVER_EVENT_SEQUENCE,
      type: "setup",
      payload: {
        step: "queue",
        message: "Waiting for a supporter's computer to pick this up",
        repo: repoFullName,
        branch,
      },
    },
  ]);
  await afterStart(input, job.id, `Queued ${key} for a supporter's computer in ${repoFullName} on ${branch}.`);
  return { jobId: job.id, kind: "CODE", work: null, queuedForVolunteer: true };
}

// ---------------------------------------------------------------------------
// Report jobs: one Model API call with web search
// ---------------------------------------------------------------------------

async function startReportJob(
  input: StartJobInput,
  context: AgentPromptContext,
  muse: MuseAccess,
): Promise<StartedJob> {
  const { agent, ticket } = input;
  const job = await createAgentJob({
    agentId: agent.id,
    ticketId: ticket.id,
    ticketTitle: ticket.title,
    trigger: input.trigger,
    kind: "REPORT",
    startedByClerkUserId: input.startedByClerkUserId,
    paidByClerkUserId: input.payerClerkUserId,
    pledgeId: input.pledgeId,
    museSource: muse.source,
    model: agent.model,
    maxSteps: 1,
  });
  await updateAgentJob(job.id, { status: "RUNNING", startedAt: new Date() });
  const key = agentTicketKey(agent.name, ticket.number);
  await appendAgentJobEvents(job.id, [
    {
      sequence: SERVER_EVENT_SEQUENCE,
      type: "setup",
      payload: { step: "muse", message: `Asking ${agent.model} with web search`, model: agent.model },
    },
  ]);
  await afterStart(input, job.id, `Started a report job for ${key}.`);

  const work = async () => {
    const current = await getAgentJob(job.id);
    if (!current || current.status !== "RUNNING") {
      return;
    }
    const started = Date.now();
    const result = await callMuse({
      apiKey: muse.apiKey,
      model: agent.model,
      instructions: buildReportJobInstructions(context),
      input: buildReportJobInput(ticket),
      webSearch: true,
      reasoningEffort: "medium",
    });

    let museRequestId: string | null = null;
    try {
      const logged = await logMuseRequest({
        ideaId: agent.ideaId,
        projectId: agent.projectId,
        agentId: agent.id,
        clerkUserId: input.payerClerkUserId,
        agentSlug: null,
        purpose: "agent",
        model: agent.model,
        endpoint: result.attempt.endpoint,
        requestBody: result.attempt.requestBody,
        responseBody: result.attempt.responseBody,
        statusCode: result.attempt.statusCode,
        inputTokens: result.attempt.usage.inputTokens,
        cachedTokens: result.attempt.usage.cachedTokens,
        outputTokens: result.attempt.usage.outputTokens,
        reasoningTokens: result.attempt.usage.reasoningTokens,
        totalTokens: result.attempt.usage.totalTokens,
        webSearchCalls: result.attempt.usage.webSearchCalls,
        estimatedCostMicros: result.attempt.usage.estimatedCostMicros,
        durationMs: result.attempt.durationMs,
        rateLimitRemainingTokens: result.attempt.rateLimit.remainingTokens,
        rateLimitRemainingRequests: result.attempt.rateLimit.remainingRequests,
        error: result.attempt.error,
      });
      museRequestId = logged.id;
      await settleMuseRequest(muse, logged);
    } catch (error) {
      console.error("Muse request log failed", error);
    }

    const succeeded = !result.attempt.error && result.text.trim().length > 0;
    const error = result.attempt.error;
    const summary = result.text.trim() ? result.text.slice(0, MAX_REPORT_SUMMARY) : null;
    await appendAgentJobEvents(job.id, [
      {
        sequence: 0,
        type: "muse",
        payload: {
          payload_type: succeeded ? "run.terminal.completed" : "run.terminal.failed",
          payload: { text: summary, reason: error },
        },
      },
      {
        sequence: 1,
        type: "finished",
        payload: {
          exitCode: succeeded ? 0 : 1,
          error,
          durationMs: Date.now() - started,
          sources: result.sources.length,
        },
      },
    ]);
    const closed = await updateAgentJob(job.id, {
      status: succeeded ? "SUCCEEDED" : "FAILED",
      exitCode: succeeded ? 0 : 1,
      museRequestId,
      summary,
      error,
      finishedAt: new Date(),
      ...usageFromMuseAttempt(result.attempt.usage),
    });
    if (closed) {
      await completeReportJob(current, { succeeded, text: summary, error });
    }
  };

  return { jobId: job.id, kind: "REPORT", work };
}

async function afterStart(input: StartJobInput, jobId: string, message: string) {
  const { agent, ticket } = input;
  if (ticket.status === "BACKLOG" || ticket.status === "BLOCKED") {
    await moveAgentTicket(agent.id, ticket.id, "IN_PROGRESS");
  }
  await addAgentLog(agent.id, {
    kind: "job",
    message,
    ticketId: ticket.id,
    jobId,
    actorClerkUserId: input.startedByClerkUserId,
  });
}
