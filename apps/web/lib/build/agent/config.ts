import "server-only";

import { isGithubAppConfigured } from "@/lib/github/config";
import { isVercelConnectionConfigured } from "@/lib/vercel/connection";

/**
 * Muse Code agents run in Vercel Sandbox microVMs, never on the WeStride
 * server, and never on WeStride's Vercel account: each sandbox is created on
 * the account of the member who started the run, so Vercel bills them. The
 * server needs to be able to keep members' Vercel tokens encrypted, and it
 * needs a public URL the sandbox can report back to, because it cannot reach
 * localhost.
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

const DEFAULT_TIMEOUT_MINUTES = 45;
const MAX_TIMEOUT_MINUTES = 5 * 60;
const DEFAULT_VCPUS = 2;
const DEFAULT_MAX_ACTIVE = 2;

export function getAgentRunnerConfig(): AgentRunnerConfig | null {
  if (!isGithubAppConfigured() || !isVercelConnectionConfigured()) {
    return null;
  }
  const callbackBaseUrl = env("BUILD_RUNNER_CALLBACK_URL").replace(/\/+$/, "");
  if (!/^https?:\/\//.test(callbackBaseUrl)) {
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

/** The path the sandbox posts its work log to. Listed in proxy.ts. */
export const AGENT_EVENTS_PATH = "/integrations/muse-code/events";

/** Whether the Sandbox SDK rejected the member's Vercel credentials. */
export function isSandboxAuthError(error: unknown): boolean {
  const response = (error as { response?: { status?: number } } | null)?.response;
  return response?.status === 401 || response?.status === 403;
}

/** What members see when a run is refused for a connection they can fix in Settings. */
export const VERCEL_CONNECTION_MESSAGE =
  "Connect your Vercel account in Settings so the sandbox runs on your Vercel plan.";
