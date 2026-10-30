import "server-only";

/**
 * The script that runs inside the sandbox. Plain Node (the universal image
 * ships Node 24), no dependencies. It installs Muse Code, creates the work
 * branch, runs `muse exec --json`, streams every event back to WeStride,
 * commits and pushes what the agent left, and reports how it ended.
 *
 * Environment it expects:
 *   WESTRIDE_RUN_ID, WESTRIDE_CALLBACK_URL, WESTRIDE_RUN_TOKEN
 *   META_API_KEY, GITHUB_TOKEN, REPO_FULL_NAME, REPO_DIR
 *   BRANCH, BASE_BRANCH, MUSE_MODEL, MAX_STEPS, PROMPT_FILE
 *   GIT_AUTHOR_NAME, GIT_AUTHOR_EMAIL, CONTRIBUTOR_MODE ("on" | "off")
 *
 * Kept free of template literals so it can live inside one.
 */
export const RUNNER_SCRIPT = String.raw`
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline";

const env = process.env;
const RUN_ID = env.WESTRIDE_RUN_ID;
const CALLBACK = env.WESTRIDE_CALLBACK_URL;
const TOKEN = env.WESTRIDE_RUN_TOKEN;
const REPO_DIR = env.REPO_DIR || "/vercel/sandbox";
const BRANCH = env.BRANCH;
const BASE_BRANCH = env.BASE_BRANCH;
const BIN_DIR = "/tmp/westride/bin";
const MAX_PAYLOAD = 16000;

// ---------------------------------------------------------------------------
// Event stream back to WeStride
// ---------------------------------------------------------------------------

let sequence = 0;
let queue = [];
let flushing = Promise.resolve();
let flushTimer = null;

function clip(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (text.length <= MAX_PAYLOAD) return value;
  if (typeof value === "string") return value.slice(0, MAX_PAYLOAD) + "\n…[clipped]";
  return { clipped: true, text: text.slice(0, MAX_PAYLOAD) + "…[clipped]" };
}

function emit(type, payload) {
  queue.push({ sequence: sequence++, type, payload: clip(payload), at: new Date().toISOString() });
  if (queue.length >= 25) {
    void flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => void flush(), 1500);
  }
}

async function post(events) {
  const body = JSON.stringify({ runId: RUN_ID, events });
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(CALLBACK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + TOKEN,
          "User-Agent": "WeStride-Muse-Runner/1",
        },
        body,
      });
      if (response.ok) return true;
      if (response.status === 401 || response.status === 404 || response.status === 410) {
        // The run is gone or was cancelled. Nothing more to say.
        process.stderr.write("WeStride refused events (" + response.status + "); stopping.\n");
        return false;
      }
    } catch (error) {
      process.stderr.write("Event post failed: " + String(error) + "\n");
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  return false;
}

function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const batch = queue;
  queue = [];
  if (batch.length === 0) return flushing;
  flushing = flushing.then(() => post(batch));
  return flushing;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sh(cmd, args, options) {
  const result = spawnSync(cmd, args, {
    cwd: (options && options.cwd) || REPO_DIR,
    env: { ...env, PATH: BIN_DIR + ":" + (env.PATH || "") , ...((options && options.env) || {}) },
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    code: result.status === null ? -1 : result.status,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function git(args) {
  return sh("git", args);
}

function must(result, what) {
  if (result.code !== 0) {
    throw new Error(what + " failed (" + result.code + "): " + (result.stderr || result.stdout));
  }
  return result;
}

let finished = false;
async function finish(payload) {
  if (finished) return;
  finished = true;
  emit("finished", payload);
  await flush();
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

async function installMuse() {
  emit("setup", { step: "install", message: "Installing Muse Code" });
  const install = sh("sh", ["-c", "curl -fsSL https://dev.meta.ai/install.sh | sh"], {
    cwd: "/tmp",
    env: { MUSE_INSTALL_DIR: BIN_DIR, MUSE_NO_MODIFY_PATH: "1" },
  });
  if (install.code !== 0 || !existsSync(BIN_DIR + "/muse")) {
    throw new Error("Muse Code install failed: " + (install.stderr || install.stdout));
  }
  const version = sh("muse", ["--version"], { cwd: "/tmp" });
  emit("setup", { step: "install", message: "Muse Code ready", version: version.stdout || null });
}

function prepareBranch() {
  emit("setup", { step: "branch", message: "Creating branch " + BRANCH + " from " + BASE_BRANCH });
  must(git(["config", "user.name", env.GIT_AUTHOR_NAME || "WeStride"]), "git config");
  must(git(["config", "user.email", env.GIT_AUTHOR_EMAIL || "build@westride.org"]), "git config");
  must(git(["checkout", "-B", BRANCH]), "git checkout");
  const base = git(["rev-parse", "HEAD"]).stdout;
  emit("setup", { step: "branch", message: "On " + BRANCH, baseSha: base });
  return base;
}

function runMuse() {
  return new Promise((resolve) => {
    const args = [
      "exec",
      "--json",
      "--yolo",
      "--no-session-log",
      "--max-model-steps", String(env.MAX_STEPS || "120"),
      "--prompt-file", env.PROMPT_FILE,
    ];
    if (env.MUSE_MODEL) args.push("--model", env.MUSE_MODEL);
    if (env.CONTRIBUTOR_MODE) args.push("--contributor-mode", env.CONTRIBUTOR_MODE);
    emit("setup", { step: "muse", message: "Starting Muse Code", args: args.filter((a) => a !== env.PROMPT_FILE) });

    const child = spawn("muse", args, {
      cwd: REPO_DIR,
      env: {
        ...env,
        PATH: BIN_DIR + ":" + (env.PATH || ""),
        CI: "1",
        TERM: "dumb",
        NO_COLOR: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let lastText = null;
    let sessionId = null;
    let eventCount = 0;

    const out = createInterface({ input: child.stdout });
    out.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let event = null;
      try {
        event = JSON.parse(trimmed);
      } catch {
        emit("log", { stream: "stdout", text: trimmed });
        return;
      }
      eventCount += 1;
      const found = findSessionId(event);
      if (found && !sessionId) {
        sessionId = found;
        emit("setup", { step: "muse", message: "Session " + sessionId, sessionId });
      }
      const text = findAssistantText(event);
      if (text) lastText = text;
      emit("muse", event);
    });

    const err = createInterface({ input: child.stderr });
    err.on("line", (line) => {
      const trimmed = line.trim();
      if (trimmed) emit("log", { stream: "stderr", text: trimmed });
    });

    child.on("error", (error) => {
      emit("log", { stream: "runner", text: "Muse Code could not start: " + String(error) });
      resolve({ code: -1, lastText, sessionId, eventCount });
    });
    child.on("close", (code, signal) => {
      resolve({ code: code === null ? (signal === "SIGTERM" ? 143 : 1) : code, lastText, sessionId, eventCount });
    });
  });
}

// The JSONL shape is Muse Code's to define; look in the usual places.
function findSessionId(event) {
  if (!event || typeof event !== "object") return null;
  const candidates = [event.session_id, event.sessionId, event.session && event.session.id];
  for (const value of candidates) {
    if (typeof value === "string" && value.length >= 8) return value;
  }
  return null;
}

function findAssistantText(event) {
  if (!event || typeof event !== "object") return null;
  const type = String(event.type || event.event || "").toLowerCase();
  const role = String(event.role || (event.message && event.message.role) || "").toLowerCase();
  const isAssistant =
    role === "assistant" ||
    type.includes("assistant") ||
    type.includes("final") ||
    type.includes("turn_complete") ||
    type.includes("agent_message");
  if (!isAssistant) return null;
  const text = pickText(event.text) || pickText(event.content) || pickText(event.message && event.message.content) || pickText(event.message) || pickText(event.output);
  return text && text.trim().length > 0 ? text : null;
}

function pickText(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const parts = value.map((part) => pickText(part)).filter(Boolean);
    return parts.length ? parts.join("\n") : null;
  }
  if (typeof value === "object") {
    if (typeof value.text === "string") return value.text;
    if (typeof value.content === "string") return value.content;
    if (Array.isArray(value.content)) return pickText(value.content);
  }
  return null;
}

function commitAndPush(baseSha) {
  emit("git", { step: "status", message: "Checking the working tree" });
  const status = git(["status", "--porcelain"]).stdout;
  if (status) {
    must(git(["add", "-A"]), "git add");
    const message = env.COMMIT_MESSAGE || ("Work on " + BRANCH);
    const commit = git(["commit", "-m", message, "-m", "Committed by the WeStride harness after a Muse Code run."]);
    if (commit.code === 0) {
      emit("git", { step: "commit", message: "Committed remaining changes", files: status.split("\n").length });
    } else {
      emit("log", { stream: "runner", text: "Nothing further to commit: " + (commit.stderr || commit.stdout) });
    }
  }
  const head = git(["rev-parse", "HEAD"]).stdout;
  const ahead = Number(git(["rev-list", "--count", baseSha + "..HEAD"]).stdout || "0");
  if (!ahead) {
    emit("git", { step: "push", message: "No commits to push", headSha: head });
    return { headSha: head, pushed: false, commits: 0 };
  }
  const log = git(["log", "--oneline", baseSha + "..HEAD"]).stdout;
  emit("git", { step: "log", message: ahead + " commit(s) ahead of " + BASE_BRANCH, log });
  const remote = "https://x-access-token:" + env.GITHUB_TOKEN + "@github.com/" + env.REPO_FULL_NAME + ".git";
  const push = git(["push", remote, "HEAD:refs/heads/" + BRANCH]);
  if (push.code !== 0) {
    const safe = (push.stderr || push.stdout).split(env.GITHUB_TOKEN).join("***");
    throw new Error("git push failed: " + safe);
  }
  emit("git", { step: "push", message: "Pushed " + BRANCH, headSha: head, commits: ahead });
  return { headSha: head, pushed: true, commits: ahead };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!RUN_ID || !CALLBACK || !TOKEN || !BRANCH || !BASE_BRANCH || !env.PROMPT_FILE) {
    throw new Error("Runner is missing its configuration.");
  }
  emit("setup", { step: "start", message: "Sandbox is up", node: process.version, repoDir: REPO_DIR });
  await flush();

  await installMuse();
  const baseSha = prepareBranch();
  await flush();

  const result = await runMuse();
  emit("setup", {
    step: "muse",
    message: "Muse Code exited with code " + result.code,
    exitCode: result.code,
    events: result.eventCount,
  });

  let pushResult = { headSha: baseSha, pushed: false, commits: 0 };
  let pushError = null;
  try {
    pushResult = commitAndPush(baseSha);
  } catch (error) {
    pushError = String(error && error.message ? error.message : error);
    emit("log", { stream: "runner", text: pushError });
  }

  await finish({
    exitCode: result.code,
    museSessionId: result.sessionId,
    summary: result.lastText,
    headSha: pushResult.headSha,
    pushed: pushResult.pushed,
    commits: pushResult.commits,
    error: pushError,
  });
}

process.on("SIGTERM", () => {
  void finish({ exitCode: 143, error: "The sandbox was stopped." }).then(() => process.exit(143));
});

main().catch(async (error) => {
  const message = String(error && error.message ? error.message : error);
  emit("log", { stream: "runner", text: message });
  await finish({ exitCode: 1, error: message });
  process.exit(1);
});
`;
