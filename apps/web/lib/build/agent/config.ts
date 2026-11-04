import "server-only";

import { isCloudComputeConfigured } from "@/lib/cloud/config";
import { isGithubAppConfigured } from "@/lib/github/config";
import { isModalConnectionConfigured } from "@/lib/modal/connection";
import { isVercelConnectionConfigured } from "@/lib/vercel/connection";

/**
 * Muse Code agents run in sandboxes, never on the WeStride server: either a
 * Vercel Sandbox on the account of the member who started the run, so Vercel
 * bills them, or a WeStride Cloud sandbox on Modal, billed to the member's
 * WeStride balance. The server needs at least one of those routes (Vercel
 * token encryption, or Modal credentials) and a public URL the sandbox can
 * report back to, because it cannot reach localhost.
 */
export type AgentRunnerConfig = {
  /** Public origin of this WeStride server, e.g. https://westride.org. */
  callbackBaseUrl: string;
  /** How long a sandbox may live before Vercel stops it. */
  sandboxTimeoutMs: number;
  vcpus: number;
  /** Active runs allowed per project at once. */
  maxActiveRunsPerProject: number;
};

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/**
 * `BUILD_RUNNER_CALLBACK_URL` as an origin. Paths are dropped: the events
 * path is appended by the code, so a value like
 * `https://host/integrations/muse-code/events` would otherwise double it.
 */
function callbackOrigin(): string | null {
  const raw = env("BUILD_RUNNER_CALLBACK_URL");
  if (!/^https?:\/\//.test(raw)) {
    return null;
  }
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

const DEFAULT_TIMEOUT_MINUTES = 45;
const MAX_TIMEOUT_MINUTES = 5 * 60;
const DEFAULT_VCPUS = 2;
const DEFAULT_MAX_ACTIVE = 2;

export function getAgentRunnerConfig(): AgentRunnerConfig | null {
  if (!isGithubAppConfigured()) {
    return null;
  }
  if (!isVercelConnectionConfigured() && !isModalConnectionConfigured() && !isCloudComputeConfigured()) {
    return null;
  }
  const callbackBaseUrl = callbackOrigin();
  if (!callbackBaseUrl) {
    return null;
  }
  const minutes = Number(env("BUILD_RUNNER_SANDBOX_TIMEOUT_MINUTES")) || DEFAULT_TIMEOUT_MINUTES;
  const vcpus = Number(env("BUILD_RUNNER_SANDBOX_VCPUS")) || DEFAULT_VCPUS;
  const maxActive = Number(env("BUILD_RUNNER_MAX_ACTIVE_RUNS")) || DEFAULT_MAX_ACTIVE;
  return {
    callbackBaseUrl,
    sandboxTimeoutMs: Math.min(Math.max(minutes, 5), MAX_TIMEOUT_MINUTES) * 60_000,
    vcpus: Math.min(Math.max(Math.floor(vcpus), 1), 8),
    maxActiveRunsPerProject: Math.min(Math.max(Math.floor(maxActive), 1), 10),
  };
}

export function isAgentRunnerConfigured(): boolean {
  return getAgentRunnerConfig() !== null;
}

/**
 * Supporter devices need less from the server than sandboxes: only the
 * GitHub App (to commit their work and open the pull request) and a public
 * callback URL. No Vercel connection is involved.
 */
export type VolunteerRunnerConfig = {
  callbackBaseUrl: string;
  jobTimeoutMs: number;
};

export function getVolunteerRunnerConfig(): VolunteerRunnerConfig | null {
  if (!isGithubAppConfigured()) {
    return null;
  }
  const callbackBaseUrl = callbackOrigin();
  if (!callbackBaseUrl) {
    return null;
  }
  const minutes = Number(env("BUILD_RUNNER_SANDBOX_TIMEOUT_MINUTES")) || DEFAULT_TIMEOUT_MINUTES;
  return {
    callbackBaseUrl,
    jobTimeoutMs: Math.min(Math.max(minutes, 5), MAX_TIMEOUT_MINUTES) * 60_000,
  };
}

export function isVolunteerRunnerConfigured(): boolean {
  return getVolunteerRunnerConfig() !== null;
}

/**
 * Whether a Project Factory ticket can be handed to Muse Code by any route: a
 * sandbox (the member's Vercel or Modal account, or WeStride Cloud) or a
 * linked computer running the WeStride runner. Gates the Run button.
 */
export function isBuildRunnerConfigured(): boolean {
  return isAgentRunnerConfigured() || isVolunteerRunnerConfigured();
}

/** The path the sandbox posts its work log to. Listed in proxy.ts. */
export const AGENT_EVENTS_PATH = "/integrations/muse-code/events";

/** Whether the Sandbox SDK rejected the member's Vercel credentials. */
export function isSandboxAuthError(error: unknown): boolean {
  const response = (error as { response?: { status?: number } } | null)?.response;
  return response?.status === 401 || response?.status === 403;
}

/** What members see when a run is refused for a connection they can fix in Settings. */
export const VERCEL_CONNECTION_MESSAGE =
  "Connect your Vercel account in Settings so the sandbox runs on your Vercel plan, or add funds to WeStride Cloud.";
