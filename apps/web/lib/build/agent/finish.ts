import "server-only";

import { Sandbox } from "@vercel/sandbox";
import type { AgentRun } from "@westride/db";
import { getProject, getTicketById, moveTicket } from "@westride/db/build";
import { addTicketComment, isRunActive, updateAgentRun } from "@westride/db/build-agents";
import { ticketKey } from "@westride/db/build-rules";
import { installationToken, repoInstallationId } from "@/lib/github/app";
import { githubJson } from "@/lib/github/http";
import { parseGithubRepoRef } from "@/lib/github/repo-ref";
import { getVercelSandboxCredentials } from "@/lib/vercel/connection";
import type { FinishedPayload, MuseModelUsage, MuseRunUsage } from "@westride/runner-protocol";
import { getAgentRunnerConfig } from "./config";

// The shapes are the runner protocol's; re-exported so existing imports hold.
export type { FinishedPayload, MuseModelUsage, MuseRunUsage };

const int = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

/** Normalises Muse Code's `run.usage` payload; null when it is not one. */
export function readMuseRunUsage(value: unknown): MuseRunUsage | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const models = Array.isArray(raw.models)
    ? raw.models
        .map((entry): MuseModelUsage | null => {
          if (!entry || typeof entry !== "object") {
            return null;
          }
          const row = entry as Record<string, unknown>;
          if (typeof row.model !== "string") {
            return null;
          }
          return {
            model: row.model,
            calls: int(row.calls),
            inputTokens: int(row.input_tokens ?? row.inputTokens),
            cachedTokens: int(row.cached_tokens ?? row.cachedTokens),
            outputTokens: int(row.output_tokens ?? row.outputTokens),
            reasoningTokens: int(row.reasoning_tokens ?? row.reasoningTokens),
          };
        })
        .filter((row): row is MuseModelUsage => row !== null)
    : [];
  if (models.length === 0 && raw.calls === undefined) {
    return null;
  }
  return {
    calls: int(raw.calls),
    completedCalls: int(raw.completed_calls ?? raw.completedCalls),
    failedCalls: int(raw.failed_calls ?? raw.failedCalls),
    models,
  };
}

export function readFinishedPayload(value: unknown): FinishedPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const exitCode = typeof raw.exitCode === "number" ? raw.exitCode : Number(raw.exitCode);
  if (!Number.isInteger(exitCode)) {
    return null;
  }
  const str = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : null);
  return {
    exitCode,
    museSessionId: str("museSessionId"),
    summary: str("summary"),
    headSha: str("headSha"),
    pushed: raw.pushed === true,
    commits: typeof raw.commits === "number" ? raw.commits : 0,
    usage: readMuseRunUsage(raw.usage),
    error: str("error"),
  };
}

const MAX_SUMMARY = 20_000;

/**
 * Stops the sandbox on the account of the member who started the run. If
 * they have since disconnected Vercel, the sandbox stops at its timeout.
 */
export async function stopSandboxFor(sandboxName: string, clerkUserId: string | null) {
  const credentials = clerkUserId ? await getVercelSandboxCredentials(clerkUserId) : null;
  if (!credentials) {
    console.warn("Sandbox stop skipped: no Vercel connection for its owner", sandboxName);
    return;
  }
  try {
    const sandbox = await Sandbox.get({ ...credentials, name: sandboxName });
    await sandbox.stop();
  } catch (error) {
    // Already stopped, or timed out. Either way it is not running up a bill.
    console.warn("Sandbox stop skipped", sandboxName, error instanceof Error ? error.message : error);
  }
}

async function stopSandbox(run: AgentRun) {
  if (!run.sandboxName) {
    return;
  }
  await stopSandboxFor(run.sandboxName, run.startedByClerkUserId);
}

async function openPullRequest(run: AgentRun, title: string, body: string) {
  const ref = parseGithubRepoRef(`https://github.com/${run.repoFullName}`);
  if (!ref) {
    throw new Error(`Bad repository name: ${run.repoFullName}`);
  }
  const token = await installationToken(await repoInstallationId(ref), {
    permissions: { contents: "read", pull_requests: "write", metadata: "read" },
  });
  const pr = await githubJson<{ number: number; html_url: string }>(
    `/repos/${ref.owner}/${ref.repo}/pulls`,
    {
      method: "POST",
      token,
      body: { title, head: run.branch, base: run.baseBranch, body, draft: false },
    },
  );
  return pr;
}

/**
 * Closes out a run: opens the pull request when there is something to
 * review, moves the ticket, leaves a comment, and stops the sandbox.
 * Safe to call twice; the second call finds the run already closed.
 */
export async function completeAgentRun(run: AgentRun, payload: FinishedPayload): Promise<void> {
  if (!isRunActive(run.status)) {
    return;
  }
  const [ticket, project] = await Promise.all([
    getTicketById(run.ticketId),
    getProject(run.projectId, { clerkUserId: run.startedByClerkUserId }),
  ]);
  const key = project && ticket ? ticketKey(project.name, ticket.number) : "Ticket";
  const summary = payload.summary ? payload.summary.slice(0, MAX_SUMMARY) : null;
  const finishedAt = new Date();

  const succeeded = payload.exitCode === 0 && !payload.error;
  let prNumber: number | null = null;
  let prUrl: string | null = null;
  let error = payload.error ?? null;

  if (payload.pushed) {
    try {
      const pr = await openPullRequest(
        run,
        `${key}: ${ticket?.title ?? run.branch}`,
        [
          summary ?? "_Muse Code did not leave a report._",
          "",
          "---",
          `Opened by a Muse Code agent run from WeStride Build Studio${ticket && project ? ` for ${key}` : ""}.`,
          succeeded ? "" : `The run ended with exit code ${payload.exitCode}; review carefully.`,
        ].join("\n"),
      );
      prNumber = pr.number;
      prUrl = pr.html_url;
    } catch (prError) {
      const message = prError instanceof Error ? prError.message : String(prError);
      console.error("Pull request creation failed", run.id, prError);
      error = error ? `${error}; pull request failed: ${message}` : `Pull request failed: ${message}`;
    }
  } else if (succeeded && !error) {
    error = null;
  }

  const status = succeeded && (!payload.pushed || prUrl) ? "SUCCEEDED" : "FAILED";
  await updateAgentRun(run.id, {
    status,
    exitCode: payload.exitCode,
    museSessionId: payload.museSessionId ?? null,
    headSha: payload.headSha ?? null,
    prNumber,
    prUrl,
    summary,
    error,
    finishedAt,
  });

  if (ticket && project) {
    const lines: string[] = [];
    if (status === "SUCCEEDED" && prUrl) {
      lines.push(`Muse Code finished and opened [pull request #${prNumber}](${prUrl}) from \`${run.branch}\`.`);
    } else if (status === "SUCCEEDED") {
      lines.push("Muse Code finished without changing any files.");
    } else {
      lines.push(`Muse Code's run failed${error ? `: ${error}` : ` (exit code ${payload.exitCode}).`}`);
      if (prUrl) {
        lines.push(`It did push work to [pull request #${prNumber}](${prUrl}); review it carefully.`);
      }
    }
    if (summary) {
      lines.push("", summary);
    }
    await addTicketComment({
      ticketId: ticket.id,
      authorClerkUserId: null,
      agentRunId: run.id,
      body: lines.join("\n"),
    });

    if (ticket.status === "IN_PROGRESS") {
      if (status === "SUCCEEDED" && prUrl) {
        await moveTicket(project.id, ticket.id, "IN_REVIEW");
      } else if (status === "FAILED") {
        await moveTicket(
          project.id,
          ticket.id,
          "BLOCKED",
          (error ?? `Muse Code exited with code ${payload.exitCode}.`).slice(0, 600),
        );
      } else {
        await moveTicket(project.id, ticket.id, "BACKLOG");
      }
    }
  }

  await stopSandbox(run);
}

/** A member stopped the run. */
export async function cancelAgentRun(run: AgentRun, byClerkUserId: string): Promise<void> {
  if (!isRunActive(run.status)) {
    return;
  }
  await updateAgentRun(run.id, {
    status: "CANCELLED",
    error: "Cancelled by a team member.",
    finishedAt: new Date(),
  });
  const ticket = await getTicketById(run.ticketId);
  if (ticket) {
    await addTicketComment({
      ticketId: ticket.id,
      authorClerkUserId: byClerkUserId,
      agentRunId: run.id,
      body: "Cancelled the Muse Code run.",
    });
    if (ticket.status === "IN_PROGRESS") {
      await moveTicket(run.projectId, ticket.id, "BACKLOG");
    }
  }
  await stopSandbox(run);
}

/**
 * A sandbox that hit Vercel's timeout never sends `finished`. Anything still
 * marked active well past the timeout is closed as failed.
 */
export async function reconcileStaleRun(run: AgentRun): Promise<AgentRun> {
  if (!isRunActive(run.status)) {
    return run;
  }
  const config = getAgentRunnerConfig();
  const timeoutMs = config?.sandboxTimeoutMs ?? 45 * 60_000;
  const since = (run.startedAt ?? run.createdAt).getTime();
  if (Date.now() - since < timeoutMs + 5 * 60_000) {
    return run;
  }
  await completeAgentRun(run, {
    exitCode: 124,
    error: "The sandbox timed out before the agent reported back.",
  });
  return { ...run, status: "FAILED", error: "The sandbox timed out before the agent reported back." };
}
