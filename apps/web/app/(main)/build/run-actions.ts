"use server";

import { getTicketById } from "@westride/db/build";
import { getAgentRun, listAgentRunEvents } from "@westride/db/build-agents";
import { failure, isFailure, requireProjectMember, revalidateProject, type Failure } from "@/lib/build/access";
import { isAgentRunnerConfigured } from "@/lib/build/agent/config";
import { cancelAgentRun, reconcileStaleRun } from "@/lib/build/agent/finish";
import { toRunSnapshot, type RunSnapshot } from "@/lib/build/agent/snapshot";
import { AgentStartError, FIRST_EVENT_SEQUENCE, startAgentRun } from "@/lib/build/agent/start";
import { fieldErrorsFrom, startRunSchema, uuidSchema } from "@/lib/build/schema";
import { isMuseModelId } from "@/lib/idea-factory/pricing";

// Sandbox creation and the clone can take a while. The ticket page exports
// `maxDuration`, since a "use server" file cannot.

export type StartRunResult =
  | { status: "ok"; runId: string }
  | (Failure & { needsConnection?: boolean; needsGithub?: boolean });

export async function startRunAction(
  projectId: string,
  ticketId: string,
  input: unknown,
): Promise<StartRunResult> {
  const parsed = startRunSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the run settings.", fieldErrorsFrom(parsed.error));
  }
  if (!isMuseModelId(parsed.data.model)) {
    return failure("Choose a supported Muse model.", { model: "Choose a supported Muse model." });
  }
  if (!isAgentRunnerConfigured()) {
    return failure("Muse Code agents are not set up on this WeStride server.");
  }
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  if (!uuidSchema.safeParse(ticketId).success) {
    return failure("That ticket does not exist.");
  }
  const ticket = await getTicketById(ticketId);
  if (!ticket || ticket.projectId !== projectId) {
    return failure("That ticket does not exist.");
  }
  if (ticket.status === "DONE") {
    return failure("This ticket is already done.");
  }
  const repo =
    (parsed.data.repoId
      ? context.project.repos.find((candidate) => candidate.id === parsed.data.repoId)
      : null) ??
    (ticket.repoId ? context.project.repos.find((candidate) => candidate.id === ticket.repoId) : null) ??
    context.project.repos.find((candidate) => candidate.isPrimary) ??
    context.project.repos[0] ??
    null;
  if (!repo) {
    return failure("Link a repository in Settings before running an agent.");
  }

  try {
    const { runId } = await startAgentRun({
      project: context.project,
      ticket,
      repo,
      userId: context.userId,
      model: parsed.data.model,
      maxSteps: parsed.data.maxSteps,
      instructions: parsed.data.instructions,
    });
    revalidateProject(projectId);
    return { status: "ok", runId };
  } catch (error) {
    if (error instanceof AgentStartError) {
      return {
        ...failure(error.message),
        needsConnection: error.needsConnection === "meta",
        needsGithub: error.needsConnection === "github",
      };
    }
    console.error("Agent run start failed", error);
    return failure("The agent could not be started. Try again.");
  }
}

export async function cancelRunAction(
  projectId: string,
  runId: string,
): Promise<{ status: "ok" } | Failure> {
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  if (!uuidSchema.safeParse(runId).success) {
    return failure("That run does not exist.");
  }
  const run = await getAgentRun(runId);
  if (!run || run.projectId !== projectId) {
    return failure("That run does not exist.");
  }
  try {
    await cancelAgentRun(run, context.userId);
    revalidateProject(projectId);
    return { status: "ok" };
  } catch (error) {
    console.error("Agent run cancel failed", error);
    return failure("The run could not be cancelled. Try again.");
  }
}

/** The run and its log after a sequence number. Polled by the live view. */
export async function readRunAction(
  projectId: string,
  runId: string,
  afterSequence: number = FIRST_EVENT_SEQUENCE,
): Promise<RunSnapshot | Failure> {
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  if (!uuidSchema.safeParse(runId).success) {
    return failure("That run does not exist.");
  }
  const stored = await getAgentRun(runId);
  if (!stored || stored.projectId !== projectId) {
    return failure("That run does not exist.");
  }
  const run = await reconcileStaleRun(stored);
  const events = await listAgentRunEvents(
    run.id,
    Number.isFinite(afterSequence) ? afterSequence : FIRST_EVENT_SEQUENCE,
  );
  return toRunSnapshot(run, events);
}
