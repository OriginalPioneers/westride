import "server-only";

import type { ProjectRepo } from "@westride/db";
import { moveTicket, type ProjectWithDetails, type TicketWithDetails } from "@westride/db/build";
import {
  addTicketComment,
  countActiveRunsForProject,
  createAgentRun,
  getActiveRunForTicket,
  updateAgentRun,
  appendAgentRunEvents,
} from "@westride/db/build-agents";
import { ticketKey } from "@westride/db/build-rules";
import { installationToken, repoInstallationId } from "@/lib/github/app";
import { requireGithubAppConfig } from "@/lib/github/config";
import { githubJson, isGithubStatus } from "@/lib/github/http";
import { getGithubUserToken } from "@/lib/github/user";
import { resolveMuseAccess, resolveSandboxAccess } from "@/lib/cloud/provider";
import { isSandboxCredentialError, launchSandbox } from "@/lib/cloud/sandbox";
import { getMuseModel } from "@/lib/idea-factory/pricing";
import { AGENT_EVENTS_PATH, getAgentRunnerConfig } from "./config";
import { agentBranchName, buildAgentPrompt } from "./prompt";
import { createRunToken } from "./token";

/** A connection the member can fix in Settings. `compute` is a Vercel or Modal account, or a balance. */
export type AgentConnection = "meta" | "github" | "compute";

export class AgentStartError extends Error {
  constructor(
    message: string,
    readonly needsConnection: AgentConnection | null = null,
  ) {
    super(message);
    this.name = "AgentStartError";
  }
}

const SERVER_EVENT_SEQUENCE = -1000;
/** Pass as `afterSequence` to read a run's log from the very start. */
export const FIRST_EVENT_SEQUENCE = -10_000;

type RawRepo = {
  id: number;
  archived: boolean;
  default_branch: string;
  permissions?: { push?: boolean };
};

/**
 * Starts a Muse Code run for a ticket: checks the member may do this, mints
 * the credentials the sandbox needs, records the run, and launches the
 * sandbox detached. Returns as soon as the runner is going; progress arrives
 * through the events route.
 */
export async function startAgentRun(input: {
  project: ProjectWithDetails;
  ticket: TicketWithDetails;
  repo: ProjectRepo;
  userId: string;
  model: string;
  maxSteps: number;
  instructions: string;
}): Promise<{ runId: string }> {
  const { project, ticket, repo, userId } = input;
  const config = getAgentRunnerConfig();
  if (!config) {
    throw new AgentStartError("Muse Code agents are not set up on this WeStride server.");
  }
  const { commitAuthor } = requireGithubAppConfig();

  // The member's own Meta key and Vercel or Modal account pay when they have
  // them; otherwise WeStride Cloud does, against their balance.
  const muse = await resolveMuseAccess(userId);
  if (!muse.ok) {
    throw new AgentStartError(muse.message, muse.needs);
  }
  const sandboxAccess = await resolveSandboxAccess(userId);
  if (!sandboxAccess.ok) {
    throw new AgentStartError(sandboxAccess.message, sandboxAccess.needs);
  }

  // The member must be able to push, the same rule as committing from WeStride.
  const userToken = await getGithubUserToken(userId);
  if (!userToken) {
    throw new AgentStartError("Connect GitHub in Settings to run agents.", "github");
  }
  const ref = { owner: repo.owner, repo: repo.name };
  let raw: RawRepo;
  try {
    raw = await githubJson<RawRepo>(`/repos/${ref.owner}/${ref.repo}`, { token: userToken });
  } catch (error) {
    if (isGithubStatus(error, 401, 403, 404)) {
      throw new AgentStartError("Grant WeStride access to this repository on GitHub first.", "github");
    }
    throw error;
  }
  if (!raw.permissions?.push) {
    throw new AgentStartError("You do not have write access to this repository.");
  }
  if (raw.archived) {
    throw new AgentStartError("This repository is archived on GitHub.");
  }

  // One agent per ticket, and a cap per project so a team cannot fan out by accident.
  if (await getActiveRunForTicket(ticket.id)) {
    throw new AgentStartError("An agent is already working on this ticket.");
  }
  if ((await countActiveRunsForProject(project.id)) >= config.maxActiveRunsPerProject) {
    throw new AgentStartError(
      `This project already has ${config.maxActiveRunsPerProject} agents running. Wait for one to finish.`,
    );
  }

  // A short-lived token scoped to this one repository.
  let githubToken: string;
  try {
    githubToken = await installationToken(await repoInstallationId(ref), {
      repository_ids: [raw.id],
      permissions: { contents: "write", pull_requests: "write", metadata: "read" },
    });
  } catch (error) {
    if (isGithubStatus(error, 404, 422)) {
      throw new AgentStartError("Install the WeStride GitHub App on this repository first.", "github");
    }
    throw error;
  }

  const baseBranch = raw.default_branch || repo.defaultBranch;
  const branch = agentBranchName(project.name, ticket);
  const { token: runToken, hash } = createRunToken();
  const run = await createAgentRun({
    projectId: project.id,
    ticketId: ticket.id,
    repoId: repo.id,
    repoFullName: `${repo.owner}/${repo.name}`,
    startedByClerkUserId: userId,
    branch,
    baseBranch,
    model: input.model,
    maxSteps: input.maxSteps,
    callbackTokenHash: hash,
    runnerKind: sandboxAccess.access.kind,
    computeSource: sandboxAccess.access.source,
    museSource: muse.access.source,
  });

  const key = ticketKey(project.name, ticket.number);
  const prompt = buildAgentPrompt({
    project,
    ticket,
    repo,
    branch,
    instructions: input.instructions,
  });
  const model = getMuseModel(input.model);
  const onCloud = sandboxAccess.access.source === "WESTRIDE_CLOUD";
  const hostName = sandboxAccess.access.kind === "MODAL_SANDBOX" ? "Modal" : "Vercel";

  try {
    // Server-side events use negative sequences; the runner counts up from 0.
    await appendAgentRunEvents(run.id, [
      {
        sequence: SERVER_EVENT_SEQUENCE,
        type: "setup",
        payload: {
          step: "sandbox",
          message: onCloud ? "Creating WeStride Cloud sandbox" : "Creating sandbox",
          repo: `${repo.owner}/${repo.name}`,
          branch,
        },
      },
    ]);
    const launched = await launchSandbox({
      access: sandboxAccess.access,
      sandboxName: `westride-run-${run.id}`,
      repoFullName: `${repo.owner}/${repo.name}`,
      baseBranch,
      githubToken,
      museKey: muse.access.apiKey,
      runToken,
      prompt,
      vcpus: config.vcpus,
      timeoutMs: config.sandboxTimeoutMs,
      tags: { app: "westride", run: run.id.slice(0, 8) },
      runnerEnv: {
        WESTRIDE_RUN_ID: run.id,
        WESTRIDE_CALLBACK_URL: `${config.callbackBaseUrl}${AGENT_EVENTS_PATH}`,
        REPO_FULL_NAME: `${repo.owner}/${repo.name}`,
        BRANCH: branch,
        BASE_BRANCH: baseBranch,
        MUSE_MODEL: input.model,
        CONTRIBUTOR_MODE: model?.isContributor ? "on" : "off",
        MAX_STEPS: String(input.maxSteps),
        COMMIT_MESSAGE: `${key}: ${ticket.title}`,
        GIT_AUTHOR_NAME: commitAuthor?.name ?? "WeStride Muse Code",
        GIT_AUTHOR_EMAIL: commitAuthor?.email ?? "build@westride.org",
      },
    });

    await updateAgentRun(run.id, {
      status: "RUNNING",
      sandboxName: launched.sandboxName,
      startedAt: new Date(),
    });
    if (ticket.status === "BACKLOG" || ticket.status === "BLOCKED") {
      await moveTicket(project.id, ticket.id, "IN_PROGRESS");
    }
    await addTicketComment({
      ticketId: ticket.id,
      authorClerkUserId: null,
      agentRunId: run.id,
      body: `Muse Code started working on this ticket in \`${repo.owner}/${repo.name}\`, branch \`${branch}\`${onCloud ? ", in a WeStride Cloud sandbox" : ""}.`,
    });
    return { runId: run.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Agent run launch failed", run.id, error);
    await updateAgentRun(run.id, {
      status: "FAILED",
      error: `The sandbox could not be started: ${message}`,
      finishedAt: new Date(),
    });
    if (onCloud) {
      throw new AgentStartError("WeStride Cloud could not start the sandbox. Try again in a moment.");
    }
    if (isSandboxCredentialError(error)) {
      throw new AgentStartError(
        hostName === "Modal"
          ? "Modal refused the sandbox on your account. Reconnect Modal in Settings with a token that is still active."
          : "Vercel refused the sandbox on your account. Reconnect Vercel in Settings and check the team has Sandbox enabled.",
        "compute",
      );
    }
    throw new AgentStartError("The sandbox could not be started. Try again in a moment.");
  }
}
