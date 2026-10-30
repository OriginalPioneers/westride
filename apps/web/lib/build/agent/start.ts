import "server-only";

import { Sandbox } from "@vercel/sandbox";
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
import { getMuseModel } from "@/lib/idea-factory/pricing";
import { getMuseApiKey } from "@/lib/meta/connection";
import { AGENT_EVENTS_PATH, getAgentRunnerConfig } from "./config";
import { agentBranchName, buildAgentPrompt } from "./prompt";
import { RUNNER_SCRIPT } from "./runner-script";
import { createRunToken } from "./token";

export class AgentStartError extends Error {
  constructor(
    message: string,
    readonly needsConnection: "meta" | "github" | null = null,
  ) {
    super(message);
    this.name = "AgentStartError";
  }
}

const WORK_DIR = "/tmp/westride";
const REPO_DIR = "/vercel/sandbox";
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

  // The member's own Meta key pays for the run.
  const museKey = await getMuseApiKey(userId);
  if (!museKey) {
    throw new AgentStartError("Connect your Meta account in Settings to run agents.", "meta");
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
  });

  const key = ticketKey(project.name, ticket.number);
  const prompt = buildAgentPrompt({
    project,
    ticket,
    repo,
    branch,
    instructions: input.instructions,
  });
  const sandboxName = `westride-run-${run.id}`;
  const model = getMuseModel(input.model);

  try {
    // Server-side events use negative sequences; the runner counts up from 0.
    await appendAgentRunEvents(run.id, [
      {
        sequence: SERVER_EVENT_SEQUENCE,
        type: "setup",
        payload: { step: "sandbox", message: "Creating sandbox", repo: `${repo.owner}/${repo.name}`, branch },
      },
    ]);
    const sandbox = await Sandbox.create({
      ...(config.credentials ?? {}),
      name: sandboxName,
      source: {
        type: "git",
        url: `https://github.com/${repo.owner}/${repo.name}.git`,
        username: "x-access-token",
        password: githubToken,
        revision: baseBranch,
        depth: 50,
      },
      resources: { vcpus: config.vcpus },
      timeout: config.sandboxTimeoutMs,
      persistent: false,
      tags: { app: "westride", run: run.id.slice(0, 8) },
      env: {
        META_API_KEY: museKey,
        GITHUB_TOKEN: githubToken,
      },
    });

    try {
      await sandbox.mkDir(WORK_DIR);
      await sandbox.writeFiles([
        { path: `${WORK_DIR}/runner.mjs`, content: RUNNER_SCRIPT },
        { path: `${WORK_DIR}/prompt.md`, content: prompt },
      ]);
      await sandbox.runCommand({
        cmd: "node",
        args: [`${WORK_DIR}/runner.mjs`],
        cwd: REPO_DIR,
        detached: true,
        env: {
          WESTRIDE_RUN_ID: run.id,
          WESTRIDE_CALLBACK_URL: `${config.callbackBaseUrl}${AGENT_EVENTS_PATH}`,
          WESTRIDE_RUN_TOKEN: runToken,
          REPO_FULL_NAME: `${repo.owner}/${repo.name}`,
          REPO_DIR,
          BRANCH: branch,
          BASE_BRANCH: baseBranch,
          MUSE_MODEL: input.model,
          CONTRIBUTOR_MODE: model?.isContributor ? "on" : "off",
          MAX_STEPS: String(input.maxSteps),
          PROMPT_FILE: `${WORK_DIR}/prompt.md`,
          COMMIT_MESSAGE: `${key}: ${ticket.title}`,
          GIT_AUTHOR_NAME: commitAuthor?.name ?? "WeStride Muse Code",
          GIT_AUTHOR_EMAIL: commitAuthor?.email ?? "build@westride.org",
        },
      });
    } catch (error) {
      await sandbox.stop().catch(() => undefined);
      throw error;
    }

    await updateAgentRun(run.id, {
      status: "RUNNING",
      sandboxName,
      startedAt: new Date(),
    });
    if (ticket.status === "BACKLOG" || ticket.status === "BLOCKED") {
      await moveTicket(project.id, ticket.id, "IN_PROGRESS");
    }
    await addTicketComment({
      ticketId: ticket.id,
      authorClerkUserId: null,
      agentRunId: run.id,
      body: `Muse Code started working on this ticket in \`${repo.owner}/${repo.name}\`, branch \`${branch}\`.`,
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
    throw new AgentStartError("The sandbox could not be started. Try again in a moment.");
  }
}
