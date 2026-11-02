import "server-only";

import { Sandbox as VercelSandbox } from "@vercel/sandbox";
import { ModalClient } from "modal";
import type { RunnerKind } from "@westride/db";
import { RUNNER_SCRIPT } from "../build/agent/runner-script";
import { getModalConfig } from "./config";
import type { SandboxAccess } from "./provider";

/**
 * One way to start a Muse Code runner, whichever host it lands on. Vercel
 * Sandbox clones the repository itself and runs the runner as a detached
 * command on the member's account. A WeStride Cloud sandbox on Modal starts
 * from a plain Node image: its entrypoint waits for the files to land, then
 * the runner clones the repository and carries on exactly as it would on
 * Vercel. Either way, the runner reports back through the same events route.
 */

const WORK_DIR = "/tmp/westride";
const VERCEL_REPO_DIR = "/vercel/sandbox";
const MODAL_REPO_DIR = "/workspace";
/** Debian with git and curl, which the Muse Code installer needs. */
const MODAL_IMAGE = "node:22-bookworm";
/** The entrypoint idles until the files are in place, so nothing races the upload. */
const MODAL_ENTRYPOINT = [
  "bash",
  "-c",
  `mkdir -p ${WORK_DIR} && while [ ! -f ${WORK_DIR}/start ]; do sleep 1; done; exec node ${WORK_DIR}/runner.mjs`,
];
const MEMORY_MIB_PER_VCPU = 2048;

export type SandboxLaunchInput = {
  access: SandboxAccess;
  /** Unique per run; the sandbox's name on Vercel, and a tag on Modal. */
  sandboxName: string;
  repoFullName: string;
  baseBranch: string;
  githubToken: string;
  museKey: string;
  /** The callback token the runner reports with. */
  runToken: string;
  prompt: string;
  vcpus: number;
  timeoutMs: number;
  tags: Record<string, string>;
  /** The rest of the runner's environment. REPO_DIR and CLONE_REPO are filled in here. */
  runnerEnv: Record<string, string>;
};

export type LaunchedSandbox = {
  runnerKind: RunnerKind;
  /** What to store so the sandbox can be stopped later: Vercel's name, or Modal's id. */
  sandboxName: string;
};

export async function launchSandbox(input: SandboxLaunchInput): Promise<LaunchedSandbox> {
  if (input.access.kind === "VERCEL_SANDBOX") {
    return launchOnVercel(input, input.access.credentials);
  }
  return launchOnModal(input);
}

async function launchOnVercel(
  input: SandboxLaunchInput,
  credentials: { token: string; teamId: string; projectId: string },
): Promise<LaunchedSandbox> {
  const sandbox = await VercelSandbox.create({
    ...credentials,
    name: input.sandboxName,
    source: {
      type: "git",
      url: `https://github.com/${input.repoFullName}.git`,
      username: "x-access-token",
      password: input.githubToken,
      revision: input.baseBranch,
      depth: 50,
    },
    resources: { vcpus: input.vcpus },
    timeout: input.timeoutMs,
    persistent: false,
    tags: input.tags,
    env: { META_API_KEY: input.museKey, GITHUB_TOKEN: input.githubToken },
  });
  try {
    await sandbox.mkDir(WORK_DIR);
    await sandbox.writeFiles([
      { path: `${WORK_DIR}/runner.mjs`, content: RUNNER_SCRIPT },
      { path: `${WORK_DIR}/prompt.md`, content: input.prompt },
    ]);
    await sandbox.runCommand({
      cmd: "node",
      args: [`${WORK_DIR}/runner.mjs`],
      cwd: VERCEL_REPO_DIR,
      detached: true,
      env: {
        ...input.runnerEnv,
        WESTRIDE_RUN_TOKEN: input.runToken,
        REPO_DIR: VERCEL_REPO_DIR,
        PROMPT_FILE: `${WORK_DIR}/prompt.md`,
      },
    });
  } catch (error) {
    await sandbox.stop().catch(() => undefined);
    throw error;
  }
  return { runnerKind: "VERCEL_SANDBOX", sandboxName: input.sandboxName };
}

function modalClient(): { client: ModalClient; appName: string } {
  const config = getModalConfig();
  if (!config) {
    throw new Error("WeStride Cloud compute is not configured on this server.");
  }
  const client = new ModalClient({
    tokenId: config.tokenId,
    tokenSecret: config.tokenSecret,
    environment: config.environment,
  });
  return { client, appName: config.appName };
}

async function launchOnModal(input: SandboxLaunchInput): Promise<LaunchedSandbox> {
  const { client, appName } = modalClient();
  try {
    const app = await client.apps.fromName(appName, { createIfMissing: true });
    const image = client.images.fromRegistry(MODAL_IMAGE);
    // Secrets never appear in the sandbox's recorded spec, unlike plain env.
    const secret = await client.secrets.fromObject({
      META_API_KEY: input.museKey,
      GITHUB_TOKEN: input.githubToken,
      WESTRIDE_RUN_TOKEN: input.runToken,
    });
    const vcpus = Math.max(1, Math.floor(input.vcpus));
    const sandbox = await client.sandboxes.create(app, image, {
      // Modal counts physical cores; one core is two vCPUs.
      cpu: vcpus / 2,
      memoryMiB: vcpus * MEMORY_MIB_PER_VCPU,
      timeoutMs: input.timeoutMs,
      workdir: "/tmp",
      command: MODAL_ENTRYPOINT,
      env: {
        ...input.runnerEnv,
        REPO_DIR: MODAL_REPO_DIR,
        CLONE_REPO: "1",
        PROMPT_FILE: `${WORK_DIR}/prompt.md`,
        HOME: "/root",
      },
      secrets: [secret],
      tags: { ...input.tags, name: input.sandboxName },
    });
    try {
      await sandbox.filesystem.makeDirectory(WORK_DIR, { createParents: true });
      await sandbox.filesystem.writeText(RUNNER_SCRIPT, `${WORK_DIR}/runner.mjs`);
      await sandbox.filesystem.writeText(input.prompt, `${WORK_DIR}/prompt.md`);
      await sandbox.filesystem.writeText("go\n", `${WORK_DIR}/start`);
    } catch (error) {
      await sandbox.terminate().catch(() => undefined);
      throw error;
    }
    return { runnerKind: "MODAL_SANDBOX", sandboxName: sandbox.sandboxId };
  } finally {
    client.close();
  }
}

/**
 * Terminates a WeStride Cloud sandbox by the id stored on its run or job.
 * A sandbox that already ended is treated as stopped.
 */
export async function terminateModalSandbox(sandboxId: string): Promise<void> {
  const { client } = modalClient();
  try {
    const sandbox = await client.sandboxes.fromId(sandboxId);
    await sandbox.terminate();
  } catch (error) {
    if (!isModalNotFound(error)) {
      throw error;
    }
  } finally {
    client.close();
  }
}

function isModalNotFound(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  return name === "NotFoundError";
}

/** Whether a sandbox host rejected the credentials it was given. */
export function isSandboxCredentialError(error: unknown): boolean {
  const response = (error as { response?: { status?: number } } | null)?.response;
  if (response?.status === 401 || response?.status === 403) {
    return true;
  }
  const name = (error as { name?: string } | null)?.name;
  return name === "AuthError" || name === "UnauthenticatedError" || name === "PermissionDeniedError";
}
