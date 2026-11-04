import "server-only";

import type { ComputeTarget, Device, ProjectRepo } from "@westride/db";
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
import {
  deviceCanServeRun,
  listOnlineDevicesForUser,
  listOnlineSponsorDevicesForIdea,
} from "@westride/db/devices";
import { agentTokenFailureMessage, installationToken, repoInstallationId } from "@/lib/github/app";
import { requireGithubAppConfig } from "@/lib/github/config";
import { githubJson, isGithubStatus, type GithubApiError } from "@/lib/github/http";
import { getGithubUserToken } from "@/lib/github/user";
import {
  resolveMuseAccess,
  resolveMuseAccessFor,
  resolveSandboxAccess,
  resolveSandboxAccessFor,
  type MuseAccess,
  type SandboxAccess,
} from "@/lib/cloud/provider";
import { isSandboxCredentialError, launchSandbox } from "@/lib/cloud/sandbox";
import { getMuseModel } from "@/lib/idea-factory/pricing";
import { isDeviceTarget } from "@/lib/build/compute-target";
import {
  AGENT_EVENTS_PATH,
  getAgentRunnerConfig,
  getVolunteerRunnerConfig,
  isBuildRunnerConfigured,
} from "./config";
import { agentBranchName, buildAgentPrompt } from "./prompt";
import { createRunToken } from "./token";

/**
 * A connection the member can fix somewhere: `meta` and `github` in Settings;
 * `compute` is their own Vercel or Modal account (Settings); `cloud` is a
 * WeStride Cloud balance (/cloud); `device` is a linked computer (WePledge™).
 */
export type AgentConnection = "meta" | "github" | "compute" | "cloud" | "device";

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
  private?: boolean;
  permissions?: { push?: boolean };
};

export type StartAgentRunInput = {
  project: ProjectWithDetails;
  ticket: TicketWithDetails;
  repo: ProjectRepo;
  userId: string;
  model: string;
  maxSteps: number;
  instructions: string;
  /** Where to run. Null follows the member's standing preference between their own accounts and WeStride Cloud. */
  computeTarget: ComputeTarget | null;
  /** For LOCAL and SPONSORS: the Ollama model the computer should run. Null means its Meta key. */
  localModel: string | null;
};

/**
 * Starts a Muse Code run for a ticket: checks the member may do this, mints
 * the credentials the sandbox needs, records the run, and launches the
 * sandbox detached. Returns as soon as the runner is going; progress arrives
 * through the events route.
 *
 * Runs on a linked computer (LOCAL, SPONSORS) are queued instead: the
 * computer leases the run on its next poll, and the runner result route
 * closes it. No credential of the member's reaches a supporter's computer.
 */
export async function startAgentRun(input: StartAgentRunInput): Promise<{ runId: string }> {
  const { project, ticket, repo, userId } = input;
  if (!isBuildRunnerConfigured()) {
    throw new AgentStartError("Muse Code agents are not set up on this WeStride server.");
  }

  // Resolve where this run goes before touching GitHub, so a member without
  // the right account hears about that first.
  const placement = await resolvePlacement(input);

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
  if (placement.kind === "device" && placement.target === "SPONSORS" && raw.private) {
    throw new AgentStartError("Supporters' computers can only work in public repositories. Choose another place to run.");
  }

  // One agent per ticket, and a cap per project so a team cannot fan out by accident.
  if (await getActiveRunForTicket(ticket.id)) {
    throw new AgentStartError("An agent is already working on this ticket.");
  }
  const maxActive = getAgentRunnerConfig()?.maxActiveRunsPerProject ?? 2;
  if ((await countActiveRunsForProject(project.id)) >= maxActive) {
    throw new AgentStartError(`This project already has ${maxActive} agents running. Wait for one to finish.`);
  }

  // The installation must cover the repository either way: a sandbox clones
  // and pushes with its token now; a device's work is committed with one later.
  let installationId: number;
  try {
    installationId = await repoInstallationId(ref);
  } catch (error) {
    if (isGithubStatus(error, 404, 422)) {
      throw new AgentStartError("Install the WeStride GitHub App on this repository first.", "github");
    }
    throw error;
  }

  const baseBranch = raw.default_branch || repo.defaultBranch;
  const branch = agentBranchName(project.name, ticket);
  const prompt = buildAgentPrompt({ project, ticket, repo, branch, instructions: input.instructions });

  if (placement.kind === "device") {
    return queueDeviceRun({ input, placement, baseBranch, branch, prompt, repoIsPrivate: raw.private === true });
  }
  return launchSandboxRun({ input, placement, raw, installationId, baseBranch, branch, prompt });
}

// ---------------------------------------------------------------------------
// Where the run goes
// ---------------------------------------------------------------------------

type Placement =
  | { kind: "sandbox"; target: "WESTRIDE_CLOUD" | "THIRD_PARTY"; muse: MuseAccess; sandbox: SandboxAccess }
  | { kind: "device"; target: "LOCAL" | "SPONSORS"; devices: Device[] };

async function resolvePlacement(input: StartAgentRunInput): Promise<Placement> {
  const { userId, project } = input;
  const target = input.computeTarget;

  if (target !== null && isDeviceTarget(target)) {
    if (!getVolunteerRunnerConfig()) {
      throw new AgentStartError("Linked computers are not set up on this WeStride server.");
    }
    if (target === "SPONSORS" && !project.ideaId) {
      throw new AgentStartError(
        "Supporters pledge compute to ideas. Link this project to an idea before running on sponsors' computers.",
      );
    }
    const online =
      target === "LOCAL"
        ? await listOnlineDevicesForUser(userId)
        : await listOnlineSponsorDevicesForIdea(project.ideaId!);
    const able = online.filter((device) => deviceCanServeRun(device, { localModel: input.localModel }));
    if (online.length === 0) {
      throw new AgentStartError(
        target === "LOCAL"
          ? "None of your computers is online. Start the WeStride runner on one, or link a computer from WePledge™."
          : "No supporter's computer pledged to this idea is online right now. Try another place to run.",
        target === "LOCAL" ? "device" : null,
      );
    }
    if (able.length === 0) {
      throw new AgentStartError(
        input.localModel
          ? `No online computer serves the model ${input.localModel}. Pull it in Ollama, or choose another model.`
          : target === "LOCAL"
            ? "Your online computers have no Meta key set on the runner. Choose a local model, or restart the runner with META_API_KEY."
            : "The online supporter computers have no Meta key. Choose one of their local models instead.",
      );
    }
    return { kind: "device", target, devices: able };
  }

  // Sandboxes need the full runner configuration.
  if (!getAgentRunnerConfig()) {
    throw new AgentStartError("Sandboxes are not set up on this WeStride server. Run on a linked computer instead.");
  }
  if (target === null) {
    // Older clients: the member's standing preference decides.
    const muse = await resolveMuseAccess(userId);
    if (!muse.ok) {
      throw new AgentStartError(muse.message, muse.needs);
    }
    const sandbox = await resolveSandboxAccess(userId);
    if (!sandbox.ok) {
      throw new AgentStartError(sandbox.message, sandbox.needs);
    }
    return {
      kind: "sandbox",
      target: sandbox.access.source === "WESTRIDE_CLOUD" ? "WESTRIDE_CLOUD" : "THIRD_PARTY",
      muse: muse.access,
      sandbox: sandbox.access,
    };
  }
  const sandbox = await resolveSandboxAccessFor(userId, target);
  if (!sandbox.ok) {
    throw new AgentStartError(sandbox.message, target === "WESTRIDE_CLOUD" ? "cloud" : "compute");
  }
  const muse = await resolveMuseAccessFor(userId, target === "WESTRIDE_CLOUD" ? "WESTRIDE_CLOUD" : "OWN");
  if (!muse.ok) {
    throw new AgentStartError(muse.message, muse.needs);
  }
  return { kind: "sandbox", target, muse: muse.access, sandbox: sandbox.access };
}

// ---------------------------------------------------------------------------
// Sandboxes: Vercel or Modal on the member's account, or WeStride Cloud
// ---------------------------------------------------------------------------

async function launchSandboxRun(args: {
  input: StartAgentRunInput;
  placement: Extract<Placement, { kind: "sandbox" }>;
  raw: RawRepo;
  installationId: number;
  baseBranch: string;
  branch: string;
  prompt: string;
}): Promise<{ runId: string }> {
  const { input, placement, raw, baseBranch, branch, prompt } = args;
  const { project, ticket, repo, userId } = input;
  const config = getAgentRunnerConfig();
  if (!config) {
    throw new AgentStartError("Sandboxes are not set up on this WeStride server.");
  }
  const { commitAuthor } = requireGithubAppConfig();

  // A short-lived token scoped to this one repository.
  let githubToken: string;
  try {
    githubToken = await installationToken(args.installationId, {
      repository_ids: [raw.id],
      permissions: { contents: "write", pull_requests: "write", metadata: "read" },
    });
  } catch (error) {
    if (isGithubStatus(error, 404, 422)) {
      throw new AgentStartError(agentTokenFailureMessage((error as GithubApiError).status), "github");
    }
    throw error;
  }

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
    runnerKind: placement.sandbox.kind,
    computeSource: placement.sandbox.source,
    museSource: placement.muse.source,
    computeTarget: placement.target,
  });

  const key = ticketKey(project.name, ticket.number);
  const model = getMuseModel(input.model);
  const onCloud = placement.sandbox.source === "WESTRIDE_CLOUD";
  const hostName = placement.sandbox.kind === "MODAL_SANDBOX" ? "Modal" : "Vercel";

  try {
    // Server-side events use negative sequences; the runner counts up from 0.
    await appendAgentRunEvents(run.id, [
      {
        sequence: SERVER_EVENT_SEQUENCE,
        type: "setup",
        payload: {
          step: "sandbox",
          message: onCloud ? "Creating WeStride Cloud sandbox" : `Creating sandbox on your ${hostName} account`,
          repo: `${repo.owner}/${repo.name}`,
          branch,
          target: placement.target,
        },
      },
    ]);
    const launched = await launchSandbox({
      access: placement.sandbox,
      sandboxName: `westride-run-${run.id}`,
      repoFullName: `${repo.owner}/${repo.name}`,
      baseBranch,
      githubToken,
      museKey: placement.muse.apiKey,
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
    await afterStart(input, run.id, {
      branch,
      where: onCloud ? "in a WeStride Cloud sandbox" : `in a sandbox on your ${hostName} account`,
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

// ---------------------------------------------------------------------------
// Linked computers: queued for the WeStride runner to lease
// ---------------------------------------------------------------------------

/**
 * Parks the run for a computer. LOCAL waits for one of the member's own;
 * SPONSORS for a supporter's pledged to the project's idea. The computer
 * clones the repository, runs Muse Code on its own Meta key or a local
 * model, and sends the changed files back; WeStride commits them and opens
 * the pull request. The run token is minted when a computer leases the run
 * (lib/runner/lease.ts), so nothing usable sits on a run that is waiting.
 */
async function queueDeviceRun(args: {
  input: StartAgentRunInput;
  placement: Extract<Placement, { kind: "device" }>;
  baseBranch: string;
  branch: string;
  prompt: string;
  repoIsPrivate: boolean;
}): Promise<{ runId: string }> {
  const { input, placement, baseBranch, branch, prompt } = args;
  const { project, ticket, repo, userId } = input;

  // The hash of a token nobody holds: the events route refuses everything
  // until the lease replaces it.
  const { hash } = createRunToken();
  const run = await createAgentRun({
    projectId: project.id,
    ticketId: ticket.id,
    repoId: repo.id,
    repoFullName: `${repo.owner}/${repo.name}`,
    startedByClerkUserId: userId,
    branch,
    baseBranch,
    model: input.localModel ?? input.model,
    maxSteps: input.maxSteps,
    callbackTokenHash: hash,
    runnerKind: "VOLUNTEER_DEVICE",
    computeSource: "OWN",
    museSource: "OWN",
    computeTarget: placement.target,
    prompt,
    localModel: input.localModel,
  });

  const names = placement.devices.map((device) => device.name);
  const waitingFor =
    placement.target === "LOCAL"
      ? names.length === 1
        ? `your computer (${names[0]})`
        : `one of your ${names.length} online computers`
      : `one of ${names.length} supporter computer${names.length === 1 ? "" : "s"}`;
  await appendAgentRunEvents(run.id, [
    {
      sequence: SERVER_EVENT_SEQUENCE,
      type: "setup",
      payload: {
        step: "queue",
        message: `Waiting for ${waitingFor} to pick this up`,
        repo: `${repo.owner}/${repo.name}`,
        branch,
        target: placement.target,
        model: input.localModel ? `local:${input.localModel}` : `meta:${input.model}`,
        privateRepo: args.repoIsPrivate,
      },
    },
  ]);
  await afterStart(input, run.id, {
    branch,
    where: placement.target === "LOCAL" ? "waiting for your own computer" : "waiting for a supporter's computer",
  });
  return { runId: run.id };
}

/** Moves the ticket to In progress and leaves the comment every run starts with. */
async function afterStart(
  input: StartAgentRunInput,
  runId: string,
  detail: { branch: string; where: string },
) {
  const { project, ticket, repo } = input;
  if (ticket.status === "BACKLOG" || ticket.status === "BLOCKED") {
    await moveTicket(project.id, ticket.id, "IN_PROGRESS");
  }
  await addTicketComment({
    ticketId: ticket.id,
    authorClerkUserId: null,
    agentRunId: runId,
    body: `Muse Code started working on this ticket in \`${repo.owner}/${repo.name}\`, branch \`${detail.branch}\`, ${detail.where}.`,
  });
}
