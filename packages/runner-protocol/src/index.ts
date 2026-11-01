// ---------------------------------------------------------------------------
// The wire protocol between WeStride and anything that runs a Muse Code job
// for it: the Vercel Sandbox runner and the supporter runner (apps/runner).
// Both sides import from here, so a change lands in one place.
// ---------------------------------------------------------------------------

export const RUNNER_PROTOCOL_VERSION = 1;

/** Paths under the WeStride origin. Every one is allow-listed in apps/web/proxy.ts. */
export const RUNNER_PAIR_PATH = "/integrations/runner/pair";
export const RUNNER_HEARTBEAT_PATH = "/integrations/runner/heartbeat";
export const RUNNER_LEASE_PATH = "/integrations/runner/lease";
export const RUNNER_RESULT_PATH = "/integrations/runner/result";
/** Where a running job streams its work log, with the job's own run token. */
export const AGENT_JOB_EVENTS_PATH = "/integrations/agents/events";

/** The user agent every runner request carries. proxy.ts expects the prefix. */
export const RUNNER_USER_AGENT = "WeStride-Runner";

/** Install scripts served by the web app. */
export const INSTALL_SH_PATH = "/install.sh";
export const INSTALL_PS1_PATH = "/install.ps1";

/** How often a runner checks in, and how long a lease poll may wait for work. */
export const HEARTBEAT_INTERVAL_MS = 60_000;
export const LEASE_POLL_TIMEOUT_MS = 25_000;

/** Caps on what one result may carry back. */
export const MAX_RESULT_FILES = 400;
export const MAX_RESULT_BYTES = 8 * 1024 * 1024;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Events: identical to what the sandbox runner posts today
// ---------------------------------------------------------------------------

export const JOB_EVENT_TYPES = ["setup", "muse", "git", "log", "finished"] as const;
export type JobEventType = (typeof JOB_EVENT_TYPES)[number];

export type JobEvent = {
  sequence: number;
  type: JobEventType;
  payload: unknown;
  at?: string;
};

export type JobEventBatch = {
  runId: string;
  events: JobEvent[];
};

/** Token usage for one model inside a Muse Code run (`run.usage` record). */
export type MuseModelUsage = {
  model: string;
  calls: number;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  reasoningTokens: number;
};

export type MuseRunUsage = {
  calls: number;
  completedCalls: number;
  failedCalls: number;
  models: MuseModelUsage[];
};

/** The last event of a job. */
export type FinishedPayload = {
  exitCode: number;
  museSessionId?: string | null;
  summary?: string | null;
  headSha?: string | null;
  pushed?: boolean;
  commits?: number;
  usage?: MuseRunUsage | null;
  error?: string | null;
};

// ---------------------------------------------------------------------------
// Pairing and heartbeats
// ---------------------------------------------------------------------------

export type DeviceFacts = {
  os: string;
  arch: string;
  cpus: number;
  memoryMb: number;
  runnerVersion: string;
};

export type PairRequest = DeviceFacts & {
  /** The code shown in Settings, e.g. `K7PQ-2MZX`. */
  code: string;
  name: string;
};

export type PairResponse = {
  deviceId: string;
  /** Shown once. The runner stores it; WeStride keeps only its hash. */
  deviceToken: string;
};

export type HeartbeatRequest = DeviceFacts & {
  /** Ollama model tags the device can serve. */
  models: string[];
  /** The supporter set META_API_KEY on the device. */
  hasMetaKey: boolean;
  /** The job the runner is on, so its lease stays alive. */
  currentJobId: string | null;
};

export type HeartbeatResponse = {
  ok: true;
  /** The job the runner reported is no longer its to run; stop it. */
  dropJob: boolean;
};

// ---------------------------------------------------------------------------
// Leases
// ---------------------------------------------------------------------------

/** Which model the device should hand Muse Code. */
export type LeasedModel =
  | { provider: "meta"; model: string; contributorMode: boolean }
  | { provider: "local"; model: string };

export type LeasedJob = {
  jobId: string;
  /** Bearer for the events route. Valid for this job only. */
  runToken: string;
  eventsUrl: string;
  repo: {
    fullName: string;
    /** Public clone URL; no credentials are ever sent to a device. */
    cloneUrl: string;
    baseBranch: string;
    branch: string;
  };
  model: LeasedModel;
  maxSteps: number;
  prompt: string;
  commitMessage: string;
  /** Milliseconds the runner has before its lease lapses without a heartbeat. */
  leaseMs: number;
  /** Hard limit for the whole job, after which the runner gives up. */
  timeoutMs: number;
};

export type LeaseResponse = { job: LeasedJob | null };

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

/** One file as the agent left it. Content is base64 so binaries survive. */
export type ChangedFile = {
  path: string;
  /** `100644` for a normal file, `100755` for an executable. */
  mode: "100644" | "100755";
  contentBase64: string;
};

export type ResultRequest = {
  jobId: string;
  exitCode: number;
  museSessionId: string | null;
  summary: string | null;
  usage: MuseRunUsage | null;
  error: string | null;
  /** The commit the agent started from. */
  baseSha: string;
  changed: ChangedFile[];
  deleted: string[];
  durationMs: number;
};

export type ResultResponse = { ok: true; prUrl: string | null };

export type RunnerErrorResponse = { error: string };
