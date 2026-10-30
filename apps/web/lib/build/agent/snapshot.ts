import type { AgentRun, AgentRunEvent } from "@westride/db";

/** A run and its log, in a shape the browser can hold. */
export type RunLogEvent = {
  sequence: number;
  type: string;
  payload: unknown;
  createdAt: string;
};

export type RunSummary = Pick<
  AgentRun,
  | "id"
  | "ticketId"
  | "status"
  | "branch"
  | "baseBranch"
  | "repoFullName"
  | "model"
  | "maxSteps"
  | "exitCode"
  | "headSha"
  | "prNumber"
  | "prUrl"
  | "summary"
  | "error"
  | "eventCount"
  | "startedByClerkUserId"
> & {
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  lastEventAt: string | null;
};

export type RunSnapshot = {
  run: RunSummary;
  events: RunLogEvent[];
};

export function toRunSummary(run: AgentRun): RunSummary {
  return {
    id: run.id,
    ticketId: run.ticketId,
    status: run.status,
    branch: run.branch,
    baseBranch: run.baseBranch,
    repoFullName: run.repoFullName,
    model: run.model,
    maxSteps: run.maxSteps,
    exitCode: run.exitCode,
    headSha: run.headSha,
    prNumber: run.prNumber,
    prUrl: run.prUrl,
    summary: run.summary,
    error: run.error,
    eventCount: run.eventCount,
    startedByClerkUserId: run.startedByClerkUserId,
    createdAt: run.createdAt.toISOString(),
    startedAt: run.startedAt?.toISOString() ?? null,
    finishedAt: run.finishedAt?.toISOString() ?? null,
    lastEventAt: run.lastEventAt?.toISOString() ?? null,
  };
}

export function toRunSnapshot(run: AgentRun, events: AgentRunEvent[]): RunSnapshot {
  return {
    run: toRunSummary(run),
    events: events.map((event) => ({
      sequence: event.sequence,
      type: event.type,
      payload: event.payload,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

/**
 * One readable line per event for the work log. Muse Code's JSONL shape is
 * its own; this looks in the common places and falls back to the type.
 */
export function describeRunEvent(event: RunLogEvent): { title: string; detail: string | null } {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  const str = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);

  switch (event.type) {
    case "setup":
    case "git": {
      const title = str(payload.message) ?? `${event.type} · ${str(payload.step) ?? ""}`.trim();
      const detail = str(payload.log) ?? str(payload.version) ?? str(payload.baseSha) ?? null;
      return { title, detail };
    }
    case "log":
      return {
        title: str(payload.stream) === "stderr" ? "stderr" : (str(payload.stream) ?? "log"),
        detail: str(payload.text),
      };
    case "finished": {
      const code = payload.exitCode;
      return {
        title: `Runner finished (exit code ${typeof code === "number" ? code : "?"})`,
        detail: str(payload.error) ?? (payload.pushed ? "Changes pushed." : "No changes pushed."),
      };
    }
    case "muse":
    default: {
      const kind = str(payload.type) ?? str(payload.event) ?? str(payload.kind) ?? "event";
      const text =
        pickText(payload.text) ??
        pickText(payload.content) ??
        pickText(payload.message) ??
        pickText(payload.delta) ??
        pickText(payload.output) ??
        null;
      const tool =
        str(payload.tool) ??
        str(payload.tool_name) ??
        str(payload.name) ??
        (typeof payload.command === "string" ? payload.command : null);
      const title = tool ? `${kind} · ${tool}` : kind;
      const args = payload.arguments ?? payload.args ?? payload.input ?? null;
      const detail =
        text ??
        (args && typeof args === "object"
          ? JSON.stringify(args).slice(0, 600)
          : typeof args === "string"
            ? args.slice(0, 600)
            : null);
      return { title, detail };
    }
  }
}

function pickText(value: unknown): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value.trim() ? value : null;
  }
  if (Array.isArray(value)) {
    const parts = value.map(pickText).filter((part): part is string => part !== null);
    return parts.length ? parts.join("\n") : null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return pickText(record.text) ?? pickText(record.content) ?? pickText(record.message);
  }
  return null;
}
