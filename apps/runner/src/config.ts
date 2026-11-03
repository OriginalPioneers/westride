import { existsSync } from "node:fs";
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
  /**
   * Advertise Ollama models to WeStride. Off by default: the Muse Code build
   * the image ships cannot talk to Ollama (its `local` provider is Muse's own
   * on-device runtime, macOS only, and it has no OpenAI-compatible provider),
   * so offering those models would only produce failed jobs.
   */
  offerOllamaModels: boolean;
};

function env(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

function isTruthy(value: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test(value?.trim() ?? "");
}

/**
 * Inside a container, "localhost" is the container itself. A developer who
 * pairs against a WeStride dev server on their own machine means the host,
 * which Docker exposes as host.docker.internal (the installer adds the
 * host-gateway mapping).
 */
export function resolveBaseUrl(raw: string, inContainer = existsSync("/.dockerenv")): string {
  const trimmed = raw.replace(/\/+$/, "");
  if (!inContainer) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]") {
      url.hostname = "host.docker.internal";
      return url.toString().replace(/\/+$/, "");
    }
  } catch {
    // Not a URL we can parse; let the API client report it.
  }
  return trimmed;
}

export function loadConfig(): RunnerConfig {
  const baseUrl = resolveBaseUrl(env("WESTRIDE_URL", "https://www.westride.org"));
  return {
    baseUrl,
    stateDir: env("WESTRIDE_STATE_DIR", "/state"),
    pairingCode: process.env.WESTRIDE_PAIRING_CODE?.trim() || null,
    deviceName: env("WESTRIDE_DEVICE_NAME", "My computer"),
    ollamaUrl: env("OLLAMA_URL", "http://host.docker.internal:11434").replace(/\/+$/, ""),
    metaApiKey: process.env.META_API_KEY?.trim() || null,
    workDir: env("WESTRIDE_WORK_DIR", "/work"),
    binDir: env("MUSE_INSTALL_DIR", "/opt/muse/bin"),
    offerOllamaModels: isTruthy(process.env.WESTRIDE_OFFER_OLLAMA_MODELS),
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
