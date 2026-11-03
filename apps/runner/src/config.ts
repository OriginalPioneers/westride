import { cpus, totalmem } from "node:os";
import type { DeviceFacts } from "@westride/runner-protocol";

export const RUNNER_VERSION = "0.1.0";

/** Everything the runner reads from its environment, with the defaults the installer relies on. */
export type RunnerConfig = {
  /** The WeStride origin, e.g. https://www.westride.org */
  baseUrl: string;
  /** Where the device token lives between restarts. */
  stateDir: string;
  /** Pairing code for a first run; ignored once a token is stored. */
  pairingCode: string | null;
  /** A name for this computer, shown to the supporter in WeStride. */
  deviceName: string;
  /** Ollama's OpenAI-compatible endpoint, as seen from inside the container. */
  ollamaUrl: string;
  /** The supporter's own Meta key, if they chose to add one. Never sent to WeStride. */
  metaApiKey: string | null;
  /** Where repositories are cloned; wiped between jobs. */
  workDir: string;
  /** Where Muse Code is installed. */
  binDir: string;
};

function env(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

export function loadConfig(): RunnerConfig {
  const baseUrl = env("WESTRIDE_URL", "https://www.westride.org").replace(/\/+$/, "");
  return {
    baseUrl,
    stateDir: env("WESTRIDE_STATE_DIR", "/state"),
    pairingCode: process.env.WESTRIDE_PAIRING_CODE?.trim() || null,
    deviceName: env("WESTRIDE_DEVICE_NAME", "My computer"),
    ollamaUrl: env("OLLAMA_URL", "http://host.docker.internal:11434").replace(/\/+$/, ""),
    metaApiKey: process.env.META_API_KEY?.trim() || null,
    workDir: env("WESTRIDE_WORK_DIR", "/work"),
    binDir: env("MUSE_INSTALL_DIR", "/opt/muse/bin"),
  };
}

export function deviceFacts(): DeviceFacts {
  return {
    os: process.platform,
    arch: process.arch,
    cpus: cpus().length,
    memoryMb: Math.round(totalmem() / (1024 * 1024)),
    runnerVersion: RUNNER_VERSION,
  };
}
