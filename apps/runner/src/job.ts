import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import {
  MAX_FILE_BYTES,
  MAX_RESULT_BYTES,
  MAX_RESULT_FILES,
  type ChangedFile,
  type LeasedJob,
  type MuseRunUsage,
  type ResultRequest,
} from "@westride/runner-protocol";
import type { RunnerConfig } from "./config";
import { EventStream } from "./events";
import { log, warn } from "./log";
import { describeOllamaModel } from "./ollama";

type Exec = { code: number; stdout: string; stderr: string };

function run(cmd: string, args: string[], options: { cwd: string; env?: Record<string, string>; timeoutMs?: number }): Promise<Exec> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    const timer = options.timeoutMs ? setTimeout(() => child.kill("SIGKILL"), options.timeoutMs) : null;
    child.on("error", (error) => {
      if (timer) clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: `${stderr}\n${String(error)}` });
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

function must(result: Exec, what: string): Exec {
  if (result.code !== 0) {
    throw new Error(`${what} failed (${result.code}): ${result.stderr || result.stdout}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Muse Code
// ---------------------------------------------------------------------------

type MuseOutcome = {
  code: number;
  summary: string | null;
  sessionId: string | null;
  usage: MuseRunUsage | null;
  eventCount: number;
};

type Envelope = { payload_type?: unknown; payload?: unknown; stream?: unknown };

// Muse Code's only provider that reaches a network endpoint is `meta`, and it
// starts by fetching a model catalog from that endpoint, which Ollama does not
// serve. Both have settings-file answers: `endpoint_transport` repoints the
// provider at Ollama's OpenAI-compatible API with no credential, and
// `model_catalog` supplies the catalog row the fetch would have returned. This
// is what `ollama launch muse` writes. Muse checks each row against its own
// provider and profile ids and drops rows that disagree, hence "meta"/"tbh".
const MUSE_PROVIDER_ID = "meta";
const MUSE_PROFILE_ID = "tbh";
const FALLBACK_CONTEXT_LIMIT = 32768;
const FALLBACK_OUTPUT_LIMIT = 32768;

/**
 * Writes a settings file under a config root used only for this job, so Muse
 * reads it through XDG_CONFIG_HOME and nothing else on the runner changes.
 */
async function writeOllamaSettings(configHome: string, ollamaUrl: string, model: string): Promise<string> {
  const info = await describeOllamaModel(ollamaUrl, model);
  const contextLimit = info?.contextLength ?? FALLBACK_CONTEXT_LIMIT;
  const settings = {
    schema_version: 1,
    provider: MUSE_PROVIDER_ID,
    model,
    endpoint_transport: { base_url: `${ollamaUrl}/v1`, auth: "none" },
    model_catalog: [
      {
        model_id: model,
        provider_id: MUSE_PROVIDER_ID,
        profile_id: MUSE_PROFILE_ID,
        display_label: model,
        visibility: "visible",
        display_order: 0,
        is_default: true,
        context_limit: contextLimit,
        output_limit: Math.min(contextLimit, FALLBACK_OUTPUT_LIMIT),
        description: "Served by Ollama",
      },
    ],
  };
  const dir = join(configHome, "muse");
  await mkdir(dir, { recursive: true });
  const file = join(dir, "settings.json");
  await writeFile(file, JSON.stringify(settings, null, 2), { encoding: "utf8", mode: 0o600 });
  return file;
}

function findSessionId(event: Envelope & Record<string, unknown>): string | null {
  const stream = event.stream && typeof event.stream === "object" ? (event.stream as Record<string, unknown>) : null;
  if (stream && (stream.kind === "session" || stream.kind === "exec.usage") && typeof stream.id === "string" && stream.id.length >= 8) {
    return stream.id;
  }
  for (const value of [event.session_id, event.sessionId]) {
    if (typeof value === "string" && value.length >= 8) return value;
  }
  return null;
}

function runMuse(
  job: LeasedJob,
  config: RunnerConfig,
  repoDir: string,
  promptFile: string,
  configHome: string | null,
  events: EventStream,
  signal: AbortSignal,
): Promise<MuseOutcome> {
  return new Promise((resolve) => {
    const args = [
      "exec",
      "--json",
      "--yolo",
      "--no-session-log",
      "--max-model-steps",
      String(job.maxSteps),
      "--prompt-file",
      promptFile,
      "--model",
      job.model.model,
    ];
    const env: Record<string, string> = {
      PATH: `${config.binDir}:${process.env.PATH ?? ""}`,
      CI: "1",
      TERM: "dumb",
      NO_COLOR: "1",
      HOME: process.env.HOME ?? "/tmp",
      // The launcher must not try to update the image's pinned Muse Code.
      MUSE_NO_AUTO_UPDATE: "1",
    };
    if (job.model.provider === "meta") {
      if (!config.metaApiKey) {
        resolve({ code: 1, summary: null, sessionId: null, usage: null, eventCount: 0 });
        events.emit("log", { stream: "runner", text: "This job needs a Meta key and the runner has none." });
        return;
      }
      env.META_API_KEY = config.metaApiKey;
      args.push("--contributor-mode", job.model.contributorMode ? "on" : "off");
    } else {
      // Ollama on the host. The settings file under configHome (see
      // writeOllamaSettings) repoints Muse's provider at Ollama's
      // OpenAI-compatible endpoint; no key is involved.
      if (!configHome) {
        resolve({ code: 1, summary: null, sessionId: null, usage: null, eventCount: 0 });
        events.emit("log", { stream: "runner", text: "The Ollama settings for this job were not written." });
        return;
      }
      env.XDG_CONFIG_HOME = configHome;
    }
    events.emit("setup", {
      step: "muse",
      message:
        job.model.provider === "local"
          ? `Starting Muse Code with Ollama model ${job.model.model} at ${config.ollamaUrl}`
          : `Starting Muse Code with model ${job.model.model}`,
      args: args.filter((arg) => arg !== promptFile),
    });

    const child = spawn("muse", args, { cwd: repoDir, env, stdio: ["ignore", "pipe", "pipe"] });
    const onAbort = () => child.kill("SIGTERM");
    signal.addEventListener("abort", onAbort, { once: true });

    let summary: string | null = null;
    let outputText = "";
    let sessionId: string | null = null;
    let usage: MuseRunUsage | null = null;
    let eventCount = 0;

    createInterface({ input: child.stdout }).on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let event: (Envelope & Record<string, unknown>) | null = null;
      try {
        event = JSON.parse(trimmed) as Envelope & Record<string, unknown>;
      } catch {
        events.emit("log", { stream: "stdout", text: trimmed });
        return;
      }
      eventCount += 1;
      const found = findSessionId(event);
      if (found && !sessionId) {
        sessionId = found;
        events.emit("setup", { step: "muse", message: `Session ${sessionId}`, sessionId });
      }
      const payloadType = typeof event.payload_type === "string" ? event.payload_type : "";
      const payload = event.payload && typeof event.payload === "object" ? (event.payload as Record<string, unknown>) : null;
      if (payloadType === "run.usage" && payload) {
        usage = payload as unknown as MuseRunUsage;
      } else if (payloadType === "run.output.delta" && payload && typeof payload.text === "string") {
        outputText += payload.text;
      } else if (payloadType.startsWith("run.terminal.") && payload && typeof payload.text === "string" && payload.text.trim()) {
        summary = payload.text;
      }
      events.emit("muse", event);
    });
    createInterface({ input: child.stderr }).on("line", (line) => {
      const trimmed = line.trim();
      if (trimmed) events.emit("log", { stream: "stderr", text: trimmed });
    });

    const done = (code: number) => {
      signal.removeEventListener("abort", onAbort);
      resolve({ code, summary: summary ?? (outputText.trim() || null), sessionId, usage, eventCount });
    };
    child.on("error", (error) => {
      events.emit("log", { stream: "runner", text: `Muse Code could not start: ${String(error)}` });
      done(-1);
    });
    child.on("close", (code, sig) => done(code === null ? (sig === "SIGTERM" ? 143 : 1) : code));
  });
}

// ---------------------------------------------------------------------------
// Collecting what changed
// ---------------------------------------------------------------------------

type Collected = { changed: ChangedFile[]; deleted: string[]; skipped: string[] };

/**
 * Reads everything that differs from the base commit, whether the agent left
 * it in the working tree or committed it (the prompt tells it to commit as it
 * goes). Diffing against HEAD would miss committed work entirely, so the diff
 * is against the clone's base commit. Nothing is pushed here.
 */
async function collectChanges(repoDir: string, baseSha: string): Promise<Collected> {
  // Stage everything so renames, new files, and deletions all show in one diff.
  must(await run("git", ["add", "-A", "--", "."], { cwd: repoDir }), "git add");
  const diff = must(
    await run("git", ["diff", "--cached", "--name-status", "-z", "--no-renames", baseSha, "--"], { cwd: repoDir }),
    "git diff",
  );
  const parts = diff.stdout.split("\0").filter((part) => part.length > 0);
  const changed: ChangedFile[] = [];
  const deleted: string[] = [];
  const skipped: string[] = [];
  let totalBytes = 0;
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const status = parts[i]?.[0];
    const path = parts[i + 1];
    if (!path) continue;
    if (path.startsWith(".git/") || path.split("/").some((segment) => segment === "..")) {
      skipped.push(path);
      continue;
    }
    if (status === "D") {
      deleted.push(path);
      continue;
    }
    const full = join(repoDir, path);
    const info = await stat(full).catch(() => null);
    if (!info || !info.isFile()) {
      skipped.push(path);
      continue;
    }
    if (info.size > MAX_FILE_BYTES || totalBytes + info.size > MAX_RESULT_BYTES || changed.length >= MAX_RESULT_FILES) {
      skipped.push(path);
      continue;
    }
    totalBytes += info.size;
    const content = await readFile(full);
    changed.push({
      path,
      mode: info.mode & 0o111 ? "100755" : "100644",
      contentBase64: content.toString("base64"),
    });
  }
  return { changed, deleted, skipped };
}

// ---------------------------------------------------------------------------
// One job, start to finish
// ---------------------------------------------------------------------------

/**
 * The work log goes to the WeStride this runner already talks to. The lease
 * names the events path on the server's public callback URL, which a sandbox
 * needs but a linked computer does not: it may reach WeStride at another
 * address (a development server, a tunnel), so only the path is kept.
 */
export function resolveEventsUrl(eventsUrl: string, baseUrl: string): string {
  try {
    const given = new URL(eventsUrl);
    return new URL(`${given.pathname}${given.search}`, `${baseUrl}/`).href;
  } catch {
    return eventsUrl;
  }
}

export async function runJob(job: LeasedJob, config: RunnerConfig, signal: AbortSignal): Promise<ResultRequest> {
  const startedAt = Date.now();
  const events = new EventStream(resolveEventsUrl(job.eventsUrl, config.baseUrl), job.jobId, job.runToken);
  const repoDir = join(config.workDir, job.jobId.slice(0, 8));
  const promptFile = join(config.workDir, `${job.jobId.slice(0, 8)}.prompt.md`);
  const configHome = join(config.workDir, `${job.jobId.slice(0, 8)}.config`);
  let baseSha = "0".repeat(40);
  let error: string | null = null;
  let exitCode = 1;
  let summary: string | null = null;
  let sessionId: string | null = null;
  let usage: MuseRunUsage | null = null;
  let collected: Collected = { changed: [], deleted: [], skipped: [] };

  const deadline = setTimeout(() => {
    warn(`Job ${job.jobId} hit its time limit.`);
    events.emit("log", { stream: "runner", text: "The job ran out of time on this computer." });
  }, job.timeoutMs);
  const timeout = AbortSignal.timeout(job.timeoutMs);
  const stop = AbortSignal.any([signal, timeout]);

  try {
    await rm(repoDir, { recursive: true, force: true });
    await mkdir(repoDir, { recursive: true });
    events.emit("setup", {
      step: "start",
      message: job.startMessage ?? "Running on a supporter's computer",
      runner: "docker",
    });
    await events.flush();

    events.emit("setup", { step: "clone", message: `Cloning ${job.repo.fullName} (${job.repo.baseBranch})` });
    log(`Cloning ${job.repo.fullName}#${job.repo.baseBranch}`);
    must(
      await run(
        "git",
        ["clone", "--depth", "1", "--branch", job.repo.baseBranch, "--single-branch", job.repo.cloneUrl, repoDir],
        { cwd: config.workDir, env: { GIT_TERMINAL_PROMPT: "0" }, timeoutMs: 10 * 60_000 },
      ),
      "git clone",
    );
    baseSha = must(await run("git", ["rev-parse", "HEAD"], { cwd: repoDir }), "git rev-parse").stdout;
    must(await run("git", ["checkout", "-B", job.repo.branch], { cwd: repoDir }), "git checkout");
    events.emit("setup", { step: "branch", message: `On ${job.repo.branch}`, baseSha });

    // Smaller local models invent absolute paths when left to guess, and a
    // file written outside the checkout never reaches the pull request. Tell
    // the agent exactly where the repository is.
    const whereYouAre = [
      "",
      "## Where you are",
      "",
      `The repository is checked out at \`${repoDir}\`, which is your current working directory. Create and edit files with paths relative to it (for example \`index.html\`, \`src/main.ts\`), never under any other directory.`,
      "",
      "When you finish, the harness collects every file that differs from the commit you started on, committed or not, and writes it to the branch itself. Committing is fine but optional; do not push.",
      "",
    ].join("\n");
    await writeFile(promptFile, job.prompt + whereYouAre, "utf8");
    if (!existsSync(join(config.binDir, "muse"))) {
      throw new Error("Muse Code is not installed in this runner image.");
    }
    let museConfigHome: string | null = null;
    if (job.model.provider === "local") {
      await rm(configHome, { recursive: true, force: true });
      await writeOllamaSettings(configHome, config.ollamaUrl, job.model.model);
      museConfigHome = configHome;
      events.emit("setup", { step: "muse", message: `Muse Code will use Ollama at ${config.ollamaUrl}` });
    }

    const outcome = await runMuse(job, config, repoDir, promptFile, museConfigHome, events, stop);
    exitCode = outcome.code;
    summary = outcome.summary;
    sessionId = outcome.sessionId;
    usage = outcome.usage;
    events.emit("setup", {
      step: "muse",
      message: `Muse Code exited with code ${outcome.code}`,
      exitCode: outcome.code,
      events: outcome.eventCount,
    });
    if (stop.aborted) {
      error = signal.aborted ? "The runner was asked to stop." : "The job ran out of time on this computer.";
    }

    events.emit("git", { step: "status", message: "Collecting changed files" });
    collected = await collectChanges(repoDir, baseSha);
    events.emit("git", {
      step: "collect",
      message: `${collected.changed.length} changed, ${collected.deleted.length} deleted${collected.skipped.length ? `, ${collected.skipped.length} skipped (too large)` : ""}`,
      skipped: collected.skipped.slice(0, 50),
    });
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
    warn(`Job ${job.jobId} failed: ${error}`);
    events.emit("log", { stream: "runner", text: error });
  } finally {
    clearTimeout(deadline);
    await events.flush();
    await rm(repoDir, { recursive: true, force: true }).catch(() => undefined);
    await rm(promptFile, { force: true }).catch(() => undefined);
    await rm(configHome, { recursive: true, force: true }).catch(() => undefined);
  }

  return {
    jobId: job.jobId,
    exitCode,
    museSessionId: sessionId,
    summary,
    usage,
    error,
    baseSha,
    changed: collected.changed,
    deleted: collected.deleted,
    durationMs: Date.now() - startedAt,
  };
}
