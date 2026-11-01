"use server";

import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import {
  getAgent,
  getAgentJob,
  getAgentTicketById,
  listAgentJobEvents,
} from "@westride/db/agents";
import { failure, isFailure, requireAgentCollaborator, revalidateAgent, type Failure } from "@/lib/agents/access";
import { cancelAgentJob, reconcileStaleJob } from "@/lib/agents/finish";
import { fieldErrorsFrom, runJobSchema, uuidSchema } from "@/lib/agents/schema";
import { toJobSnapshot, type JobSnapshot } from "@/lib/agents/snapshot";
import { AgentJobError, FIRST_EVENT_SEQUENCE, startAgentJob } from "@/lib/agents/start";

// Sandbox creation and the clone can take a while. The ticket page exports
// `maxDuration`, since a "use server" file cannot.

export type RunJobResult =
  | { status: "ok"; jobId: string }
  | (Failure & { needsConnection?: boolean; needsGithub?: boolean; needsVercel?: boolean });

export async function runJobAction(agentId: string, ticketId: string, input: unknown): Promise<RunJobResult> {
  const parsed = runJobSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the guidance.", fieldErrorsFrom(parsed.error));
  }
  const context = await requireAgentCollaborator(agentId);
  if (isFailure(context)) {
    return context;
  }
  if (!uuidSchema.safeParse(ticketId).success) {
    return failure("That ticket does not exist.");
  }
  const ticket = await getAgentTicketById(ticketId);
  if (!ticket || ticket.agentId !== agentId) {
    return failure("That ticket does not exist.");
  }
  if (ticket.status === "DONE") {
    return failure("This ticket is already done.");
  }
  try {
    const started = await startAgentJob({
      agent: context.agent,
      ticket,
      trigger: "MANUAL",
      startedByClerkUserId: context.userId,
      payerClerkUserId: context.userId,
      instructions: parsed.data.instructions,
    });
    if (started.work) {
      const work = started.work;
      after(async () => {
        try {
          await work();
        } catch (error) {
          console.error("Report job failed", started.jobId, error);
        }
      });
    }
    revalidateAgent(agentId);
    return { status: "ok", jobId: started.jobId };
  } catch (error) {
    if (error instanceof AgentJobError) {
      return {
        ...failure(error.message),
        needsConnection: error.needsConnection === "meta",
        needsGithub: error.needsConnection === "github",
        needsVercel: error.needsConnection === "vercel",
      };
    }
    console.error("Agent job start failed", error);
    return failure("The job could not be started. Try again.");
  }
}

export async function cancelJobAction(agentId: string, jobId: string): Promise<{ status: "ok" } | Failure> {
  const context = await requireAgentCollaborator(agentId);
  if (isFailure(context)) {
    return context;
  }
  if (!uuidSchema.safeParse(jobId).success) {
    return failure("That job does not exist.");
  }
  const job = await getAgentJob(jobId);
  if (!job || job.agentId !== agentId) {
    return failure("That job does not exist.");
  }
  try {
    await cancelAgentJob(job, context.userId);
    revalidateAgent(agentId);
    return { status: "ok" };
  } catch (error) {
    console.error("Agent job cancel failed", error);
    return failure("The job could not be cancelled. Try again.");
  }
}

/** The job and its log after a sequence number. Polled by the live view. */
export async function readJobAction(
  agentId: string,
  jobId: string,
  afterSequence: number = FIRST_EVENT_SEQUENCE,
): Promise<JobSnapshot | Failure> {
  const { userId } = await auth();
  if (!uuidSchema.safeParse(agentId).success || !uuidSchema.safeParse(jobId).success) {
    return failure("That job does not exist.");
  }
  // Anyone who can see the agent can watch its jobs.
  const agent = await getAgent(agentId, { clerkUserId: userId });
  if (!agent) {
    return failure("That job does not exist.");
  }
  const stored = await getAgentJob(jobId);
  if (!stored || stored.agentId !== agentId) {
    return failure("That job does not exist.");
  }
  const job = await reconcileStaleJob(stored);
  const events = await listAgentJobEvents(
    job.id,
    Number.isFinite(afterSequence) ? afterSequence : FIRST_EVENT_SEQUENCE,
  );
  return toJobSnapshot(job, events);
}
