"use server";

import {
  applyTicketRanking,
  createMilestone,
  createTickets,
  listTickets,
  type NewTicketInput,
} from "@westride/db/build";
import { logMuseRequest } from "@westride/db/idea-factory";
import { getIdea } from "@westride/db/ideas";
import {
  failure,
  isFailure,
  requireProjectMember,
  revalidateProject,
  type Failure,
} from "@/lib/build/access";
import {
  BACKLOG_SCHEMA,
  RANKING_SCHEMA,
  buildBacklogPrompt,
  buildRankingPrompt,
  parseBacklogDraft,
  parseRankingDraft,
  type BacklogDraft,
  type PlanningContext,
  type RankingDraft,
} from "@/lib/build/planning";
import {
  acceptBacklogSchema,
  acceptRankingSchema,
  fieldErrorsFrom,
  planRequestSchema,
} from "@/lib/build/schema";
import { parseGithubRepoRef } from "@/lib/github/repo-ref";
import { findReadableRepo, readRepoReadme } from "@/lib/github/repos";
import { callMuse, type MuseAttempt } from "@/lib/idea-factory/muse";
import { isMuseModelId } from "@/lib/idea-factory/pricing";
import {
  getMetaConnectionSummary,
  getMuseApiKey,
  isMetaConnectionConfigured,
} from "@/lib/meta/connection";

// Muse can take a minute or two on a full backlog. The pages that call
// these actions export `maxDuration`, since a "use server" file cannot.

export type PlanningState = {
  /** Whether the member has a Meta account connected. */
  hasMetaConnection: boolean;
  canConnectMeta: boolean;
};

export async function getPlanningState(projectId: string): Promise<PlanningState | Failure> {
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  const summary = await getMetaConnectionSummary(context.userId);
  return {
    hasMetaConnection: summary !== null,
    canConnectMeta: isMetaConnectionConfigured(),
  };
}

async function museKeyFor(userId: string): Promise<string | Failure> {
  try {
    const apiKey = await getMuseApiKey(userId);
    if (apiKey) {
      return apiKey;
    }
  } catch (error) {
    console.error("Meta key lookup failed", error);
    return failure("Your Meta key could not be refreshed. Try again in a moment.");
  }
  return {
    status: "error",
    message: "Connect your Meta account in Settings to plan with Muse.",
    fieldErrors: {},
    needsConnection: true,
  };
}

async function record(input: {
  projectId: string;
  userId: string;
  model: string;
  attempt: MuseAttempt;
}): Promise<string | null> {
  try {
    const logged = await logMuseRequest({
      ideaId: null,
      projectId: input.projectId,
      clerkUserId: input.userId,
      agentSlug: null,
      purpose: "plan",
      model: input.model,
      endpoint: input.attempt.endpoint,
      requestBody: input.attempt.requestBody,
      responseBody: input.attempt.responseBody,
      statusCode: input.attempt.statusCode,
      inputTokens: input.attempt.usage.inputTokens,
      cachedTokens: input.attempt.usage.cachedTokens,
      outputTokens: input.attempt.usage.outputTokens,
      reasoningTokens: input.attempt.usage.reasoningTokens,
      totalTokens: input.attempt.usage.totalTokens,
      webSearchCalls: input.attempt.usage.webSearchCalls,
      estimatedCostMicros: input.attempt.usage.estimatedCostMicros,
      durationMs: input.attempt.durationMs,
      rateLimitRemainingTokens: input.attempt.rateLimit.remainingTokens,
      rateLimitRemainingRequests: input.attempt.rateLimit.remainingRequests,
      error: input.attempt.error,
    });
    return logged.id;
  } catch (error) {
    console.error("Muse request log failed", error);
    return null;
  }
}

async function gatherContext(
  projectId: string,
  userId: string,
  notes: string,
): Promise<PlanningContext | Failure> {
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  const { project } = context;
  const primary = project.repos.find((repo) => repo.isPrimary) ?? null;
  const [tickets, idea, readme] = await Promise.all([
    listTickets(projectId),
    project.ideaId ? getIdea(project.ideaId, { clerkUserId: userId }) : Promise.resolve(null),
    primary ? readPrimaryReadme(primary.htmlUrl, userId) : Promise.resolve(null),
  ]);
  return {
    project,
    tickets,
    idea: idea ? { name: idea.name, description: idea.description } : null,
    readme,
    notes,
  };
}

async function readPrimaryReadme(htmlUrl: string, userId: string): Promise<string | null> {
  const ref = parseGithubRepoRef(htmlUrl);
  if (!ref) {
    return null;
  }
  try {
    const access = await findReadableRepo(ref, userId);
    if (access.status !== "found") {
      return null;
    }
    return await readRepoReadme(ref, access.token);
  } catch (error) {
    console.error("README read for planning failed", error);
    return null;
  }
}

export type PlanResult =
  | { status: "ok"; mode: "backlog"; draft: BacklogDraft; museRequestId: string | null }
  | { status: "ok"; mode: "prioritize"; draft: RankingDraft; museRequestId: string | null }
  | Failure;

/** Asks Muse for a plan. Writes nothing to the board; the member accepts next. */
export async function planWithMuse(projectId: string, input: unknown): Promise<PlanResult> {
  const parsed = planRequestSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the planning request.", fieldErrorsFrom(parsed.error));
  }
  if (!isMuseModelId(parsed.data.model)) {
    return failure("Choose a supported Muse model.", { model: "Choose a supported Muse model." });
  }
  const member = await requireProjectMember(projectId);
  if (isFailure(member)) {
    return member;
  }
  const apiKey = await museKeyFor(member.userId);
  if (isFailure(apiKey)) {
    return apiKey;
  }
  const context = await gatherContext(projectId, member.userId, parsed.data.notes);
  if (isFailure(context)) {
    return context;
  }
  if (parsed.data.mode === "prioritize" && !context.tickets.some((t) => t.status !== "DONE")) {
    return failure("There are no open tickets to prioritise yet. Draft a backlog first.");
  }

  const prompt =
    parsed.data.mode === "backlog" ? buildBacklogPrompt(context) : buildRankingPrompt(context);
  const result = await callMuse({
    apiKey,
    model: parsed.data.model,
    instructions: prompt.instructions,
    input: prompt.input,
    webSearch: false,
    jsonFormat: {
      name: parsed.data.mode === "backlog" ? "build_backlog" : "build_ranking",
      schema: parsed.data.mode === "backlog" ? BACKLOG_SCHEMA : RANKING_SCHEMA,
    },
    reasoningEffort: "medium",
    maxOutputTokens: 16_000,
  });
  const museRequestId = await record({
    projectId,
    userId: member.userId,
    model: parsed.data.model,
    attempt: result.attempt,
  });

  if (!result.text) {
    return failure(result.attempt.error ?? "Muse returned nothing. Try again.");
  }
  if (parsed.data.mode === "backlog") {
    const draft = parseBacklogDraft(result.text);
    if (!draft) {
      return failure("Muse's answer could not be read as a plan. Try again.");
    }
    return { status: "ok", mode: "backlog", draft, museRequestId };
  }
  const draft = parseRankingDraft(result.text, context);
  if (!draft) {
    return failure("Muse's answer could not be read as a ranking. Try again.");
  }
  return { status: "ok", mode: "prioritize", draft, museRequestId };
}

export type AcceptBacklogResult =
  | { status: "ok"; milestonesAdded: number; ticketsAdded: number }
  | Failure;

/** Adds the parts of a backlog draft the member kept. */
export async function acceptBacklogPlan(
  projectId: string,
  input: unknown,
): Promise<AcceptBacklogResult> {
  const parsed = acceptBacklogSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the plan and try again.", fieldErrorsFrom(parsed.error));
  }
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  const { project, userId } = context;
  if (parsed.data.milestones.length === 0 && parsed.data.tickets.length === 0) {
    return failure("Pick at least one milestone or ticket to add.");
  }

  try {
    // Milestones first, so tickets can point at them by title.
    const milestoneIds = new Map(
      project.milestones.map((milestone) => [milestone.title.toLowerCase(), milestone.id]),
    );
    let milestonesAdded = 0;
    for (const draft of parsed.data.milestones) {
      const key = draft.title.toLowerCase();
      if (milestoneIds.has(key)) {
        continue;
      }
      const created = await createMilestone(projectId, {
        title: draft.title,
        description: draft.description,
        status: "PLANNED",
        targetDate: draft.targetDate,
      });
      milestoneIds.set(key, created.id);
      milestonesAdded += 1;
    }

    const primaryRepo = project.repos.find((repo) => repo.isPrimary) ?? null;
    // createTickets keeps plan order: first ticket on top, lowest number.
    const inputs: NewTicketInput[] = parsed.data.tickets.map((draft) => ({
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
      milestoneId: draft.milestone ? (milestoneIds.get(draft.milestone.toLowerCase()) ?? null) : null,
      repoId: primaryRepo?.id ?? null,
      assigneeClerkUserId: null,
      source: "MUSE",
      museRequestId: parsed.data.museRequestId,
    }));
    const created = await createTickets(projectId, userId, inputs);
    revalidateProject(projectId);
    return { status: "ok", milestonesAdded, ticketsAdded: created.length };
  } catch (error) {
    console.error("Accepting Muse plan failed", error);
    return failure("The plan could not be added. Try again.");
  }
}

export async function acceptRankingPlan(
  projectId: string,
  input: unknown,
): Promise<{ status: "ok"; updated: number } | Failure> {
  const parsed = acceptRankingSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the ranking and try again.", fieldErrorsFrom(parsed.error));
  }
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  try {
    const updated = await applyTicketRanking(
      projectId,
      parsed.data.ranking.map((entry, rank) => ({ ...entry, rank })),
    );
    revalidateProject(projectId);
    return { status: "ok", updated };
  } catch (error) {
    console.error("Applying Muse ranking failed", error);
    return failure("The ranking could not be applied. Try again.");
  }
}
