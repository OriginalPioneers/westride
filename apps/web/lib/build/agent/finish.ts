import "server-only";

import { Sandbox } from "@vercel/sandbox";
import type { AgentRun, ComputeSource, RunnerKind } from "@westride/db";
import { getProject, getTicketById, moveTicket } from "@westride/db/build";
import { addTicketComment, isRunActive, updateAgentRun } from "@westride/db/build-agents";
import { ticketKey } from "@westride/db/build-rules";
import { VOLUNTEER_QUEUE_TIMEOUT_MS, clearDeviceJob } from "@westride/db/devices";
import { recordContribution } from "@westride/db/support";
import { usageFromMuseRun } from "@/lib/agents/usage";
import { settleAgentRun } from "@/lib/cloud/billing";
import { getModalConfig } from "@/lib/cloud/config";
import { terminateModalSandbox } from "@/lib/cloud/sandbox";
import { installationToken, repoInstallationId } from "@/lib/github/app";
import { commitFilesToBranch } from "@/lib/github/commit-files";
import { requireGithubAppConfig } from "@/lib/github/config";
import { githubJson } from "@/lib/github/http";
import { parseGithubRepoRef } from "@/lib/github/repo-ref";
import type { ModalCredentials } from "@/lib/modal/client";
import { getModalSandboxCredentials } from "@/lib/modal/connection";
import { getVercelSandboxCredentials } from "@/lib/vercel/connection";
import type {
  FinishedPayload,
  MuseModelUsage,
  MuseRunUsage,
  ResultRequest,
} from "@westride/runner-protocol";
import { getAgentRunnerConfig, getVolunteerRunnerConfig } from "./config";

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

/** WeStride Cloud's own Modal credentials, or null when compute is not configured here. */
function cloudModalCredentials(): ModalCredentials | null {
  const config = getModalConfig();
  return config
    ? {
        tokenId: config.tokenId,
        tokenSecret: config.tokenSecret,
        environment: config.environment,
        appName: config.appName,
      }
    : null;
}

/**
 * Stops the sandbox. A sandbox on the member's own account (Vercel or Modal)
 * needs the credentials of whoever paid for the run; if they have since
 * disconnected, it stops at its timeout. A WeStride Cloud sandbox is stopped
 * with WeStride's own Modal credentials.
 */
export async function stopSandboxFor(
  sandboxName: string,
  clerkUserId: string | null,
  runnerKind: RunnerKind | null = "VERCEL_SANDBOX",
  computeSource: ComputeSource = "OWN",
) {
  if (runnerKind === "MODAL_SANDBOX") {
    const credentials =
      computeSource === "WESTRIDE_CLOUD"
        ? cloudModalCredentials()
        : clerkUserId
          ? await getModalSandboxCredentials(clerkUserId)
          : null;
    if (!credentials) {
      console.warn("Sandbox stop skipped: no Modal credentials for its owner", sandboxName);
      return;
    }
    try {
      await terminateModalSandbox(sandboxName, credentials);
    } catch (error) {
      console.warn("Modal sandbox stop skipped", sandboxName, error instanceof Error ? error.message : error);
    }
    return;
  }
  if (runnerKind !== "VERCEL_SANDBOX") {
    return;
  }
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
  await stopSandboxFor(run.sandboxName, run.startedByClerkUserId, run.runnerKind, run.computeSource);
}

/** Bills a WeStride Cloud run to the member's balance. No-op for runs on their own accounts. */
async function settleCloudCharges(run: AgentRun, ticketTitle: string) {
  if (run.museSource !== "WESTRIDE_CLOUD" && run.computeSource !== "WESTRIDE_CLOUD") {
    return;
  }
  const vcpus = getAgentRunnerConfig()?.vcpus ?? 2;
  await settleAgentRun(run, vcpus, ticketTitle);
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
          `Opened by a Muse Code agent run from WeStride Project Factory${ticket && project ? ` for ${key}` : ""}.`,
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
  const closed = await updateAgentRun(run.id, {
    status,
    exitCode: payload.exitCode,
    museSessionId: payload.museSessionId ?? null,
    headSha: payload.headSha ?? null,
    prNumber,
    prUrl,
    summary,
    error,
    finishedAt,
    ...usageFromMuseRun(payload.usage),
  });
  if (closed) {
    await settleCloudCharges(closed, ticket?.title ?? run.branch);
    await creditRunToPledge(closed);
  }

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
    if (run.runnerKind === "VOLUNTEER_DEVICE") {
      lines.push(
        run.computeTarget === "LOCAL"
          ? "The run happened on your own computer."
          : "The run happened on a supporter's computer.",
      );
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

  if (run.runnerKind === "VOLUNTEER_DEVICE") {
    // Nothing to stop: the computer wipes its checkout itself. Free it for the next run.
    if (run.deviceId) {
      await clearDeviceJob(run.deviceId, run.id, status === "SUCCEEDED");
    }
    return;
  }
  await stopSandbox(run);
}

/**
 * A linked computer finished a run and sent back the files it changed.
 * WeStride writes them as one commit on the run's branch with its own
 * installation token, then closes the run like any other, opening the pull
 * request when there is something to review. The computer never pushes.
 */
export async function completeDeviceRun(run: AgentRun, result: ResultRequest): Promise<void> {
  if (!isRunActive(run.status)) {
    return;
  }
  const payload: FinishedPayload = {
    exitCode: result.exitCode,
    museSessionId: result.museSessionId,
    summary: result.summary,
    usage: result.usage,
    error: result.error,
    headSha: result.baseSha,
    pushed: false,
    commits: 0,
  };
  const hasChanges = result.changed.length > 0 || result.deleted.length > 0;
  if (hasChanges) {
    const ref = parseGithubRepoRef(`https://github.com/${run.repoFullName}`);
    if (ref) {
      const { commitAuthor } = requireGithubAppConfig();
      const [ticket, project] = await Promise.all([
        getTicketById(run.ticketId),
        getProject(run.projectId, { clerkUserId: run.startedByClerkUserId }),
      ]);
      const key = project && ticket ? ticketKey(project.name, ticket.number) : run.branch;
      const where = run.computeTarget === "LOCAL" ? "the member's own computer" : "a supporter's computer";
      try {
        const committed = await commitFilesToBranch({
          ref,
          baseSha: result.baseSha,
          branch: run.branch,
          message: `${ticket ? `${key}: ${ticket.title}` : key}\n\nCommitted by WeStride from ${where} after a Muse Code run.`,
          changed: result.changed,
          deleted: result.deleted,
          author: {
            name: commitAuthor?.name ?? "WeStride Muse Code",
            email: commitAuthor?.email ?? "build@westride.org",
          },
        });
        payload.headSha = committed.headSha;
        payload.pushed = true;
        payload.commits = 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Committing a device's result failed", run.id, error);
        payload.error = payload.error ? `${payload.error}; commit failed: ${message}` : `Commit failed: ${message}`;
      }
    }
  }
  await completeAgentRun(run, payload);
}

/** Credits a finished SPONSORS run to the pledge whose computer ran it. No-op otherwise. */
async function creditRunToPledge(run: AgentRun): Promise<void> {
  if (!run.pledgeId) {
    return;
  }
  const started = run.startedAt ?? run.createdAt;
  const finished = run.finishedAt ?? new Date();
  try {
    await recordContribution({
      pledgeId: run.pledgeId,
      jobId: null,
      runId: run.id,
      deviceId: run.deviceId,
      estimatedCostMicros: run.estimatedCostMicros,
      inputTokens: run.inputTokens,
      outputTokens: run.outputTokens,
      wallClockSeconds: Math.max(0, Math.round((finished.getTime() - started.getTime()) / 1000)),
    });
  } catch (error) {
    console.error("Pledge contribution could not be recorded for run", run.id, error);
  }
}

/** A member stopped the run. */
export async function cancelAgentRun(run: AgentRun, byClerkUserId: string): Promise<void> {
  if (!isRunActive(run.status)) {
    return;
  }
  const closed = await updateAgentRun(run.id, {
    status: "CANCELLED",
    error: "Cancelled by a team member.",
    finishedAt: new Date(),
  });
  const ticket = await getTicketById(run.ticketId);
  if (closed) {
    // A cancelled sandbox still ran; its time is billed. Model usage is unknown and not charged.
    await settleCloudCharges(closed, ticket?.title ?? run.branch);
  }
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
  if (run.runnerKind === "VOLUNTEER_DEVICE") {
    // The computer learns on its next heartbeat that the run is gone.
    if (run.deviceId) {
      await clearDeviceJob(run.deviceId, run.id, false);
    }
    return;
  }
  await stopSandbox(run);
}

/**
 * A sandbox that hit its host's timeout never sends `finished`. Anything
 * still marked active well past the timeout is closed as failed. A run on a
 * linked computer expires when no computer takes it, or when the one that
 * did stops heartbeating.
 */
export async function reconcileStaleRun(run: AgentRun): Promise<AgentRun> {
  if (!isRunActive(run.status)) {
    return run;
  }
  if (run.runnerKind === "VOLUNTEER_DEVICE") {
    return reconcileStaleDeviceRun(run);
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

async function reconcileStaleDeviceRun(run: AgentRun, now = new Date()): Promise<AgentRun> {
  const mine = run.computeTarget === "LOCAL";
  const computer = mine ? "your computer" : "the supporter's computer";
  let message: string | null = null;
  if (run.status === "QUEUED" && !run.deviceId) {
    if (now.getTime() - run.createdAt.getTime() > VOLUNTEER_QUEUE_TIMEOUT_MS) {
      message = mine
        ? "None of your computers picked this run up in time."
        : "No supporter's computer picked this run up in time.";
    }
  } else if (run.status === "RUNNING") {
    const config = getVolunteerRunnerConfig();
    const hardLimit = (run.startedAt ?? run.createdAt).getTime() + (config?.jobTimeoutMs ?? 45 * 60_000) + 5 * 60_000;
    if (run.leaseExpiresAt && run.leaseExpiresAt.getTime() < now.getTime()) {
      message = `${computer[0]!.toUpperCase()}${computer.slice(1)} stopped responding before the run finished.`;
    } else if (now.getTime() > hardLimit) {
      message = `The run ran past its time limit on ${computer}.`;
    }
  }
  if (!message) {
    return run;
  }
  await completeAgentRun(run, { exitCode: 124, error: message });
  return { ...run, status: "FAILED", error: message };
}
