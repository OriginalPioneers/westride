/**
 * WeStride supporter runner.
 *
 * Loop: heartbeat every minute → long-poll for a lease → clone the public
 * repository → run Muse Code → send the changed files back. The device
 * never holds GitHub credentials; WeStride commits what comes back.
 */
import { hostname } from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { HEARTBEAT_INTERVAL_MS, type LeasedJob } from "@westride/runner-protocol";
import { ApiError, WeStrideApi } from "./api";
import { deviceFacts, loadConfig, RUNNER_VERSION } from "./config";
import { runJob } from "./job";
import { log, sleep, warn } from "./log";
import { listOllamaModels } from "./ollama";

const config = loadConfig();
const tokenFile = join(config.stateDir, "device-token");
const api = new WeStrideApi(config.baseUrl, null, (baseUrl) => {
  log(`WeStride redirected to ${baseUrl}; using that from now on.`);
  config.baseUrl = baseUrl;
});

const shutdown = new AbortController();
let currentJob: LeasedJob | null = null;
let jobAbort: AbortController | null = null;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    log(`Received ${signal}; stopping after the current step.`);
    shutdown.abort();
    jobAbort?.abort();
  });
}

async function ensurePaired(): Promise<void> {
  await mkdir(config.stateDir, { recursive: true });
  const stored = await readFile(tokenFile, "utf8").catch(() => "");
  if (stored.trim()) {
    api.setToken(stored.trim());
    return;
  }
  if (!config.pairingCode) {
    throw new Error(
      "This runner is not paired. Start it with WESTRIDE_PAIRING_CODE set to a code from WeStride → WePledge™ → Link a computer.",
    );
  }
  log(`Pairing with ${config.baseUrl} as "${config.deviceName}"…`);
  const paired = await api.pair({
    ...deviceFacts(),
    code: config.pairingCode,
    name: config.deviceName || hostname(),
  });
  await writeFile(tokenFile, paired.deviceToken, { mode: 0o600 });
  api.setToken(paired.deviceToken);
  log(`Paired. Device ${paired.deviceId}.`);
}

/** Ollama models WeStride may offer for this computer; tool-capable ones, unless opted out (see RunnerConfig). */
async function offeredModels(): Promise<string[]> {
  return config.offerOllamaModels ? listOllamaModels(config.ollamaUrl) : [];
}

async function heartbeat(): Promise<void> {
  const models = await offeredModels();
  const response = await api.heartbeat({
    ...deviceFacts(),
    models,
    hasMetaKey: config.metaApiKey !== null,
    currentJobId: currentJob?.jobId ?? null,
  });
  if (response.dropJob && currentJob) {
    warn(`WeStride says job ${currentJob.jobId} is no longer ours; stopping it.`);
    jobAbort?.abort();
  }
}

function startHeartbeats(): void {
  const tick = async () => {
    try {
      await heartbeat();
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        warn("WeStride no longer recognises this device. Unlinked in WePledge™? Pair it again.");
        shutdown.abort();
        return;
      }
      warn(`Heartbeat failed: ${String(error)}`);
    }
    if (!shutdown.signal.aborted) setTimeout(tick, HEARTBEAT_INTERVAL_MS);
  };
  void tick();
}

async function workLoop(): Promise<void> {
  let backoff = 2000;
  while (!shutdown.signal.aborted) {
    let leased: LeasedJob | null = null;
    try {
      leased = (await api.lease()).job;
      backoff = 2000;
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        warn("WeStride no longer recognises this device. Pair it again.");
        return;
      }
      warn(`Lease poll failed: ${String(error)}; retrying in ${backoff / 1000}s.`);
      await sleep(backoff);
      backoff = Math.min(backoff * 2, 60_000);
      continue;
    }
    if (!leased) continue;

    currentJob = leased;
    jobAbort = new AbortController();
    log(`Leased job ${leased.jobId}: ${leased.repo.fullName} → ${leased.repo.branch} (${leased.model.provider}:${leased.model.model})`);
    try {
      const result = await runJob(leased, config, jobAbort.signal);
      log(
        `Job ${leased.jobId} finished (exit ${result.exitCode}, ${result.changed.length} files changed, ${Math.round(result.durationMs / 1000)}s). Sending result…`,
      );
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await api.result(result);
          break;
        } catch (error) {
          if (error instanceof ApiError && (error.status === 404 || error.status === 410)) {
            warn(`WeStride no longer wants job ${leased.jobId} (${error.status}).`);
            break;
          }
          warn(`Sending the result failed: ${String(error)}`);
          await sleep(3000 * (attempt + 1));
        }
      }
    } catch (error) {
      warn(`Job ${leased.jobId} crashed: ${String(error)}`);
    } finally {
      currentJob = null;
      jobAbort = null;
    }
    // Let the heartbeat clear the device's current job before asking again.
    try {
      await heartbeat();
    } catch {
      // The regular tick will catch up.
    }
  }
}

async function main(): Promise<void> {
  log(`WeStride runner ${RUNNER_VERSION} → ${config.baseUrl}`);
  await mkdir(config.workDir, { recursive: true });
  await ensurePaired();
  const ollama = await listOllamaModels(config.ollamaUrl);
  if (!config.offerOllamaModels) {
    log("Ollama models are not offered (WESTRIDE_OFFER_OLLAMA_MODELS=0).");
  } else if (ollama.length > 0) {
    log(`Ollama offers ${ollama.length} tool-capable model(s): ${ollama.slice(0, 6).join(", ")}${ollama.length > 6 ? "…" : ""}`);
  } else {
    log(`Ollama has no tool-capable models at ${config.ollamaUrl} (not running, or only models without tool support).`);
  }
  log(
    config.metaApiKey
      ? "A Meta key is set on this runner, so Muse models are available too."
      : "No Meta key on this runner; jobs use the Ollama models above. Set META_API_KEY to offer Muse models as well.",
  );
  if (!config.metaApiKey && (!config.offerOllamaModels || ollama.length === 0)) {
    warn("This runner can take no jobs: no Meta key and no Ollama model to offer.");
  }
  startHeartbeats();
  await workLoop();
  log("Runner stopped.");
}

main().catch((error) => {
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
});
