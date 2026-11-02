import "server-only";

import type { AgentJob, AgentRun, MuseKeySource } from "@westride/db";
import { recordLedgerEntry } from "@westride/db/cloud";
import { MUSE_IMAGE_MODEL, MUSE_TRANSCRIBE_MODEL, getMuseModel } from "../idea-factory/pricing";
import { getCloudRates } from "./config";
import { applyAiMarkup, computeCostMicros, wallClockSeconds } from "./pricing";
import type { MuseAccess } from "./provider";

/**
 * Charges land on the ledger after the work, from the usage Muse reported
 * and the time the sandbox ran, each under a reference that can only be
 * written once. Every function here is a no-op for work that ran on the
 * member's own accounts, so callers can call them unconditionally.
 */

type AiUsage = {
  reference: string;
  description: string;
  model: string;
  /** Meta's list-price estimate, before WeStride's margin. */
  estimatedCostMicros: number;
  inputTokens?: number;
  outputTokens?: number;
};

async function chargeAi(clerkUserId: string, usage: AiUsage): Promise<void> {
  const charge = applyAiMarkup(usage.estimatedCostMicros, getCloudRates());
  if (charge <= 0) {
    return;
  }
  try {
    await recordLedgerEntry({
      clerkUserId,
      kind: "AI_USAGE",
      amountMicros: -charge,
      reference: usage.reference,
      description: usage.description,
      model: usage.model,
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
    });
  } catch (error) {
    // Billing must never break the member's work; the reference lets a repair job find gaps.
    console.error("WeStride Cloud charge failed", usage.reference, error);
  }
}

function modelLabel(model: string): string {
  if (model === MUSE_IMAGE_MODEL.id) return MUSE_IMAGE_MODEL.label;
  if (model === MUSE_TRANSCRIBE_MODEL.id) return MUSE_TRANSCRIBE_MODEL.label;
  return getMuseModel(model)?.label ?? model;
}

/**
 * Settles one logged Muse request. `requestId` is the `muse_requests` row,
 * so a retried action that logs a second row charges a second time, as it
 * should: Meta billed us twice too.
 */
export async function settleMuseRequest(
  access: MuseAccess,
  request: {
    id: string;
    model: string;
    purpose: string;
    estimatedCostMicros: number;
    inputTokens: number;
    outputTokens: number;
  },
): Promise<void> {
  if (access.source !== "WESTRIDE_CLOUD") {
    return;
  }
  await chargeAi(access.clerkUserId, {
    reference: `muse:${request.id}`,
    description: `${modelLabel(request.model)} · ${request.purpose}`,
    model: request.model,
    estimatedCostMicros: request.estimatedCostMicros,
    inputTokens: request.inputTokens,
    outputTokens: request.outputTokens,
  });
}

/** Image and transcription calls are not logged to `muse_requests`; they settle by their own key. */
export async function settleMuseUsage(
  access: MuseAccess,
  usage: { reference: string; model: string; purpose: string; estimatedCostMicros: number },
): Promise<void> {
  if (access.source !== "WESTRIDE_CLOUD") {
    return;
  }
  await chargeAi(access.clerkUserId, {
    reference: usage.reference,
    description: `${modelLabel(usage.model)} · ${usage.purpose}`,
    model: usage.model,
    estimatedCostMicros: usage.estimatedCostMicros,
  });
}

async function chargeCompute(
  clerkUserId: string,
  input: { reference: string; description: string; startedAt: Date | null; finishedAt: Date | null; vcpus: number },
): Promise<void> {
  const seconds = wallClockSeconds(input.startedAt, input.finishedAt ?? new Date());
  const charge = computeCostMicros({ wallClockSeconds: seconds, vcpus: input.vcpus }, getCloudRates());
  if (charge <= 0) {
    return;
  }
  try {
    await recordLedgerEntry({
      clerkUserId,
      kind: "COMPUTE_USAGE",
      amountMicros: -charge,
      reference: input.reference,
      description: input.description,
      computeSeconds: seconds,
      vcpus: input.vcpus,
    });
  } catch (error) {
    console.error("WeStride Cloud compute charge failed", input.reference, error);
  }
}

/**
 * Settles a finished Agent Studio job: its model calls when they ran on the
 * shared key, and its sandbox time when it ran on Modal. Safe to call more
 * than once.
 */
export async function settleAgentJob(job: AgentJob, vcpus: number): Promise<void> {
  const title = job.ticketTitle.trim() || "Agent job";
  if (job.museSource === "WESTRIDE_CLOUD") {
    await chargeAi(job.paidByClerkUserId, {
      reference: `job:${job.id}`,
      description: `${modelLabel(job.model)} · ${title}`,
      model: job.model,
      estimatedCostMicros: job.estimatedCostMicros,
      inputTokens: job.inputTokens,
      outputTokens: job.outputTokens,
    });
  }
  if (job.runnerKind === "MODAL_SANDBOX") {
    await chargeCompute(job.paidByClerkUserId, {
      reference: `job-compute:${job.id}`,
      description: `Sandbox · ${title}`,
      startedAt: job.startedAt ?? job.createdAt,
      finishedAt: job.finishedAt,
      vcpus,
    });
  }
}

/** Settles a finished Build Studio run the same way. */
export async function settleAgentRun(run: AgentRun, vcpus: number, ticketTitle: string): Promise<void> {
  const title = ticketTitle.trim() || "Muse Code run";
  if (run.museSource === "WESTRIDE_CLOUD") {
    await chargeAi(run.startedByClerkUserId, {
      reference: `run:${run.id}`,
      description: `${modelLabel(run.model)} · ${title}`,
      model: run.model,
      estimatedCostMicros: run.estimatedCostMicros,
      inputTokens: run.inputTokens,
      outputTokens: run.outputTokens,
    });
  }
  if (run.runnerKind === "MODAL_SANDBOX") {
    await chargeCompute(run.startedByClerkUserId, {
      reference: `run-compute:${run.id}`,
      description: `Sandbox · ${title}`,
      startedAt: run.startedAt ?? run.createdAt,
      finishedAt: run.finishedAt,
      vcpus,
    });
  }
}

export type { MuseKeySource };
