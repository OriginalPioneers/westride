import "server-only";

import { isGithubAppConfigured } from "@/lib/github/config";

/**
 * Muse Code agents run in Vercel Sandbox microVMs, never on the WeStride
 * server. The sandbox needs Vercel credentials, and it needs a public URL to
 * report back to, because it cannot reach localhost.
 */
export type AgentRunnerConfig = {
  /** Public origin of this WeStride server, e.g. https://westride.org. */
  callbackBaseUrl: string;
  /** Explicit Vercel credentials. Null means rely on VERCEL_OIDC_TOKEN. */
  credentials: { token: string; teamId: string; projectId: string } | null;
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
  if (!isGithubAppConfigured()) {
    return null;
  }
  const callbackBaseUrl = env("BUILD_RUNNER_CALLBACK_URL").replace(/\/+$/, "");
  if (!/^https?:\/\//.test(callbackBaseUrl)) {
    return null;
  }
  const token = env("VERCEL_TOKEN");
  const teamId = env("VERCEL_TEAM_ID");
  const projectId = env("VERCEL_PROJECT_ID");
  const credentials = token && teamId && projectId ? { token, teamId, projectId } : null;
  if (!credentials && !env("VERCEL_OIDC_TOKEN")) {
    return null;
  }
  const minutes = Number(env("BUILD_RUNNER_SANDBOX_TIMEOUT_MINUTES")) || DEFAULT_TIMEOUT_MINUTES;
  const vcpus = Number(env("BUILD_RUNNER_SANDBOX_VCPUS")) || DEFAULT_VCPUS;
  const maxActive = Number(env("BUILD_RUNNER_MAX_ACTIVE_RUNS")) || DEFAULT_MAX_ACTIVE;
  return {
    callbackBaseUrl,
    credentials,
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
