import type { AgentJob, AgentJobEvent } from "@westride/db";
import { describeRunEvent, type RunLogEvent } from "@/lib/build/agent/snapshot";

export { describeRunEvent };
export type JobLogEvent = RunLogEvent;

/** A job in a shape the browser can hold while it polls. */
export type JobSummary = Pick<
  AgentJob,
  | "id"
  | "agentId"
  | "ticketId"
  | "ticketTitle"
  | "trigger"
  | "kind"
  | "status"
  | "model"
  | "maxSteps"
  | "repoFullName"
  | "branch"
  | "baseBranch"
  | "exitCode"
  | "headSha"
  | "prNumber"
  | "prUrl"
  | "summary"
  | "error"
  | "eventCount"
  | "modelCalls"
  | "inputTokens"
  | "cachedTokens"
  | "outputTokens"
  | "reasoningTokens"
  | "totalTokens"
  | "estimatedCostMicros"
  | "startedByClerkUserId"
  | "paidByClerkUserId"
> & {
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  lastEventAt: string | null;
};

export type JobSnapshot = {
  job: JobSummary;
  events: JobLogEvent[];
};

export function toJobSummary(job: AgentJob): JobSummary {
  return {
    id: job.id,
    agentId: job.agentId,
    ticketId: job.ticketId,
    ticketTitle: job.ticketTitle,
    trigger: job.trigger,
    kind: job.kind,
    status: job.status,
    model: job.model,
    maxSteps: job.maxSteps,
    repoFullName: job.repoFullName,
    branch: job.branch,
    baseBranch: job.baseBranch,
    exitCode: job.exitCode,
    headSha: job.headSha,
    prNumber: job.prNumber,
    prUrl: job.prUrl,
    summary: job.summary,
    error: job.error,
    eventCount: job.eventCount,
    modelCalls: job.modelCalls,
    inputTokens: job.inputTokens,
    cachedTokens: job.cachedTokens,
    outputTokens: job.outputTokens,
    reasoningTokens: job.reasoningTokens,
    totalTokens: job.totalTokens,
    estimatedCostMicros: Number(job.estimatedCostMicros),
    startedByClerkUserId: job.startedByClerkUserId,
    paidByClerkUserId: job.paidByClerkUserId,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
    lastEventAt: job.lastEventAt?.toISOString() ?? null,
  };
}

export function toJobSnapshot(job: AgentJob, events: AgentJobEvent[]): JobSnapshot {
  return {
    job: toJobSummary(job),
    events: events.map((event) => ({
      sequence: event.sequence,
      type: event.type,
      payload: event.payload,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}
