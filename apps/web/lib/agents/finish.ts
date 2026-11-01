import "server-only";

import type { Agent, AgentJob } from "@westride/db";
import {
  addAgentLog,
  getAgentRow,
  getAgentTicketById,
  isJobActive,
  moveAgentTicket,
  updateAgentJob,
} from "@westride/db/agents";
import { agentTicketKey } from "@westride/db/agent-rules";
import { getAgentRunnerConfig } from "@/lib/build/agent/config";
import { stopSandboxFor, type FinishedPayload } from "@/lib/build/agent/finish";
import { installationToken, repoInstallationId } from "@/lib/github/app";
import { githubJson } from "@/lib/github/http";
import { parseGithubRepoRef } from "@/lib/github/repo-ref";
import { usageFromMuseRun } from "./usage";

export { readFinishedPayload, type FinishedPayload } from "@/lib/build/agent/finish";

const MAX_SUMMARY = 20_000;

/** The sandbox lives on the payer's Vercel account, so it is stopped with their credentials. */
async function stopSandbox(job: AgentJob) {
  if (!job.sandboxName) {
    return;
  }
  await stopSandboxFor(job.sandboxName, job.paidByClerkUserId);
}

async function openPullRequest(job: AgentJob, title: string, body: string) {
  if (!job.repoFullName || !job.branch || !job.baseBranch) {
    throw new Error("The job has no repository to open a pull request in.");
  }
  const ref = parseGithubRepoRef(`https://github.com/${job.repoFullName}`);
  if (!ref) {
    throw new Error(`Bad repository name: ${job.repoFullName}`);
  }
  const token = await installationToken(await repoInstallationId(ref), {
    permissions: { contents: "read", pull_requests: "write", metadata: "read" },
  });
  return githubJson<{ number: number; html_url: string }>(`/repos/${ref.owner}/${ref.repo}/pulls`, {
    method: "POST",
    token,
    body: { title, head: job.branch, base: job.baseBranch, body, draft: false },
  });
}

/**
 * Closes out a code job: opens the pull request when there is something to
 * review, moves the ticket, records usage, writes the log, and stops the
 * sandbox. Safe to call twice; the second call finds the job already closed.
 */
export async function completeCodeJob(job: AgentJob, payload: FinishedPayload): Promise<void> {
  if (!isJobActive(job.status)) {
    return;
  }
  const [agent, ticket] = await Promise.all([
    getAgentRow(job.agentId),
    job.ticketId ? getAgentTicketById(job.ticketId) : null,
  ]);
  const key = agent && ticket ? agentTicketKey(agent.name, ticket.number) : "Ticket";
  const summary = payload.summary ? payload.summary.slice(0, MAX_SUMMARY) : null;
  const succeeded = payload.exitCode === 0 && !payload.error;
  let prNumber: number | null = null;
  let prUrl: string | null = null;
  let error = payload.error ?? null;

  if (payload.pushed) {
    try {
      const pr = await openPullRequest(
        job,
        `${key}: ${ticket?.title ?? job.ticketTitle}`,
        [
          summary ?? "_Muse Code did not leave a report._",
          "",
          "---",
          `Opened by **${agent?.name ?? "an agent"}**, a Muse Code agent run from WeStride Agent Studio${ticket ? ` for ${key}` : ""}.`,
          succeeded ? "" : `The run ended with exit code ${payload.exitCode}; review carefully.`,
        ].join("\n"),
      );
      prNumber = pr.number;
      prUrl = pr.html_url;
    } catch (prError) {
      const message = prError instanceof Error ? prError.message : String(prError);
      console.error("Pull request creation failed", job.id, prError);
      error = error ? `${error}; pull request failed: ${message}` : `Pull request failed: ${message}`;
    }
  }

  const status = succeeded && (!payload.pushed || prUrl) ? "SUCCEEDED" : "FAILED";
  await updateAgentJob(job.id, {
    status,
    exitCode: payload.exitCode,
    museSessionId: payload.museSessionId ?? null,
    headSha: payload.headSha ?? null,
    prNumber,
    prUrl,
    summary,
    error,
    finishedAt: new Date(),
    ...usageFromMuseRun(payload.usage),
  });

  await settleTicket({ agent, job, ticketId: ticket?.id ?? null, status, prUrl, prNumber, error, exitCode: payload.exitCode });
  await stopSandbox(job);
}

/** The outcome of a report job, already run. */
export type ReportOutcome = {
  succeeded: boolean;
  text: string | null;
  error: string | null;
};

export async function completeReportJob(job: AgentJob, outcome: ReportOutcome): Promise<void> {
  if (!isJobActive(job.status)) {
    return;
  }
  const agent = await getAgentRow(job.agentId);
  const status = outcome.succeeded ? "SUCCEEDED" : "FAILED";
  await settleTicket({
    agent,
    job,
    ticketId: job.ticketId,
    status,
    prUrl: null,
    prNumber: null,
    error: outcome.error,
    exitCode: outcome.succeeded ? 0 : 1,
  });
}

async function settleTicket(input: {
  agent: Agent | null;
  job: AgentJob;
  ticketId: string | null;
  status: "SUCCEEDED" | "FAILED";
  prUrl: string | null;
  prNumber: number | null;
  error: string | null;
  exitCode: number;
}) {
  const { agent, job, status, prUrl, prNumber, error } = input;
  const ticket = input.ticketId ? await getAgentTicketById(input.ticketId) : null;
  const key = agent && ticket ? agentTicketKey(agent.name, ticket.number) : job.ticketTitle;

  let message: string;
  if (status === "SUCCEEDED" && prUrl) {
    message = `Finished ${key} and opened pull request #${prNumber}.`;
  } else if (status === "SUCCEEDED" && job.kind === "CODE") {
    message = `Finished ${key} without changing any files.`;
  } else if (status === "SUCCEEDED") {
    message = `Finished ${key} and left a report.`;
  } else {
    message = `Could not finish ${key}${error ? `: ${error}` : ` (exit code ${input.exitCode}).`}`;
  }
  await addAgentLog(job.agentId, { kind: "job", message, ticketId: ticket?.id ?? null, jobId: job.id });

  if (ticket && ticket.status === "IN_PROGRESS") {
    if (status === "SUCCEEDED" && (prUrl || job.kind === "REPORT")) {
      await moveAgentTicket(job.agentId, ticket.id, "IN_REVIEW");
    } else if (status === "FAILED") {
      await moveAgentTicket(
        job.agentId,
        ticket.id,
        "BLOCKED",
        (error ?? `The run exited with code ${input.exitCode}.`).slice(0, 600),
      );
    } else {
      await moveAgentTicket(job.agentId, ticket.id, "BACKLOG");
    }
  }
}

/** A member stopped the job. */
export async function cancelAgentJob(job: AgentJob, byClerkUserId: string): Promise<void> {
  if (!isJobActive(job.status)) {
    return;
  }
  await updateAgentJob(job.id, {
    status: "CANCELLED",
    error: "Cancelled by a team member.",
    finishedAt: new Date(),
  });
  const ticket = job.ticketId ? await getAgentTicketById(job.ticketId) : null;
  await addAgentLog(job.agentId, {
    kind: "job",
    message: `Cancelled the job for ${job.ticketTitle}.`,
    ticketId: ticket?.id ?? null,
    jobId: job.id,
    actorClerkUserId: byClerkUserId,
  });
  if (ticket && ticket.status === "IN_PROGRESS") {
    await moveAgentTicket(job.agentId, ticket.id, "BACKLOG");
  }
  await stopSandbox(job);
}

/** How long a report job may sit before it is presumed lost. */
const REPORT_TIMEOUT_MS = 10 * 60_000;

/**
 * A sandbox that hit Vercel's timeout never sends `finished`, and a report
 * whose server function was cut off never settles. Anything still active
 * well past its limit is closed as failed.
 */
export async function reconcileStaleJob(job: AgentJob): Promise<AgentJob> {
  if (!isJobActive(job.status)) {
    return job;
  }
  const since = (job.startedAt ?? job.createdAt).getTime();
  const message =
    job.kind === "CODE"
      ? "The sandbox timed out before the agent reported back."
      : "The report did not finish in time.";
  if (job.kind === "CODE") {
    const config = getAgentRunnerConfig();
    const timeoutMs = config?.sandboxTimeoutMs ?? 45 * 60_000;
    if (Date.now() - since < timeoutMs + 5 * 60_000) {
      return job;
    }
    await completeCodeJob(job, { exitCode: 124, error: message });
  } else {
    if (Date.now() - since < REPORT_TIMEOUT_MS) {
      return job;
    }
    await updateAgentJob(job.id, { status: "FAILED", error: message, finishedAt: new Date() });
    await completeReportJob(job, { succeeded: false, text: null, error: message });
  }
  return { ...job, status: "FAILED", error: message };
}
