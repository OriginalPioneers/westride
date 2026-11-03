"use server";

import { auth } from "@clerk/nextjs/server";
import type {
  BuildSuggestion,
  BuildSuggestionKind,
  IdeaBuildSuggestion,
  IdeaFactoryArtifact,
  IdeaFactoryFinding,
  IdeaFactoryMessage,
  MuseFinding,
  MuseFindingVerdict,
  MuseRequest,
  MuseSynthesis,
  ProjectStatus,
} from "@westride/db";
import { listProjectsForIdea } from "@westride/db/build";
import type { TicketCounts } from "@westride/db/build-rules";
import {
  addAgentMessage,
  addUserMessage,
  completeEvaluation,
  completeFinding,
  createArtifact,
  createBuildSuggestion,
  createEvaluation,
  failEvaluation,
  failFinding,
  getEvaluation,
  getLatestBuildSuggestion,
  getLatestCompletedEvaluation,
  getMuseRequest,
  getOrCreateThread,
  isIdeaMember,
  linkBuildSuggestionProject,
  listActiveArtifacts,
  listArtifacts,
  listEvaluations,
  listMuseRequests,
  listThreads,
  logMuseRequest,
  markFindingRunning,
  setArtifactArchived,
  setArtifactChosen,
  sumMuseUsage,
  type EvaluationWithFindings,
  type MuseRequestSummary,
  type MuseUsageTotals,
  type ThreadWithMessages,
} from "@westride/db/idea-factory";
import { getIdea, type IdeaWithDetails } from "@westride/db/ideas";
import { MAX_PROJECT_DESCRIPTION } from "@westride/db/limits";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  agentsForIdea,
  getAgent,
  IDEA_COACH_SLUG,
  type AgentDefinition,
} from "@/lib/idea-factory/agents";
import { produceArtifacts } from "@/lib/idea-factory/artifact-producer";
import { isArtifactStorageConfigured, storeArtifact } from "@/lib/idea-factory/artifact-storage";
import { extractArtifactBlocks, slugifyCollection } from "@/lib/idea-factory/artifacts";
import {
  callMuse,
  deviceClientId,
  parseJsonOutput,
  type MuseAttempt,
} from "@/lib/idea-factory/muse";
import { isMuseModelId, MUSE_IMAGE_MODEL } from "@/lib/idea-factory/pricing";
import { renderEvaluationReport } from "@/lib/idea-factory/report-pdf";
import { settleMuseRequest } from "@/lib/cloud/billing";
import { getCloudStatus, resolveMuseAccess, type MuseAccess } from "@/lib/cloud/provider";
import {
  getMetaConnectionSummary,
  isMetaConnectionConfigured,
  type MetaConnectionSummary,
} from "@/lib/meta/connection";
import {
  BUILD_SUGGESTION_KINDS,
  BUILD_SUGGESTIONS_INSTRUCTIONS,
  BUILD_SUGGESTIONS_SCHEMA,
  buildAgentInstructions,
  buildChatInput,
  buildSuggestionsInput,
  buildSynthesisInput,
  EVALUATION_PROMPT,
  EVALUATION_SCHEMA,
  SYNTHESIS_INSTRUCTIONS,
  SYNTHESIS_SCHEMA,
} from "@/lib/idea-factory/prompts";
import { IDEA_TYPE_LABELS } from "@/lib/ideas/filters";
import { resolveMemberProfiles, type MemberProfile } from "@/lib/ideas/members";
import type { ProjectPrefill } from "../../../build/actions";

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

const MAX_MESSAGE = 6000;

const uuid = z.string().uuid();
const modelSchema = z
  .string()
  .refine(isMuseModelId, "Choose a supported Muse model.");

/** `needsConnection` tells the dialog to send the member back to connect Meta. */
type Failure = { status: "error"; message: string; needsConnection?: boolean };

function failure(message: string): Failure {
  return { status: "error", message };
}

/** The member's own Meta key, or WeStride Cloud's when they are using that instead. */
async function museKeyFor(userId: string): Promise<MuseAccess | Failure> {
  let resolved: Awaited<ReturnType<typeof resolveMuseAccess>>;
  try {
    resolved = await resolveMuseAccess(userId);
  } catch (error) {
    console.error("Meta key lookup failed", error);
    return failure("Your Meta key could not be refreshed. Try again in a moment.");
  }
  if (resolved.ok) {
    return resolved.access;
  }
  return {
    status: "error",
    message: resolved.message,
    needsConnection: true,
  };
}

type MemberContext = { userId: string; idea: IdeaWithDetails };

async function requireMember(ideaId: string): Promise<MemberContext | Failure> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in to use the Idea Factory.");
  }
  if (!uuid.safeParse(ideaId).success) {
    return failure("That idea does not exist.");
  }
  const [idea, member] = await Promise.all([
    getIdea(ideaId, { clerkUserId: userId }),
    isIdeaMember(ideaId, userId),
  ]);
  if (!idea || !member) {
    return failure("Only members of this idea can open its Idea Factory.");
  }
  return { userId, idea };
}

function isFailure(value: unknown): value is Failure {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    (value as Failure).status === "error"
  );
}

function summarize(request: MuseRequest): MuseRequestSummary {
  const summary: MuseRequestSummary & Partial<MuseRequest> = { ...request };
  delete summary.requestBody;
  delete summary.responseBody;
  return summary;
}

async function record(input: {
  ideaId: string;
  access: MuseAccess;
  agentSlug: string | null;
  purpose: string;
  model: string;
  attempt: MuseAttempt;
}): Promise<MuseRequestSummary | null> {
  try {
    const logged = await logMuseRequest({
      ideaId: input.ideaId,
      clerkUserId: input.access.clerkUserId,
      agentSlug: input.agentSlug,
      purpose: input.purpose,
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
    await settleMuseRequest(input.access, logged);
    return summarize(logged);
  } catch (error) {
    console.error("Muse request log failed", error);
    return null;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/** A Build Studio project linked to the idea, as the factory shows it. */
export type LinkedProject = {
  id: string;
  name: string;
  status: ProjectStatus;
  ticketCounts: TicketCounts;
  repos: { fullName: string; htmlUrl: string }[];
  updatedAt: Date;
};

export type FactoryData = {
  threads: ThreadWithMessages[];
  evaluations: EvaluationWithFindings[];
  requests: MuseRequestSummary[];
  usage: MuseUsageTotals;
  members: MemberProfile[];
  /** Every file the team made, archived ones included. */
  artifacts: IdeaFactoryArtifact[];
  /** Build Studio projects already linked to this idea. */
  projects: LinkedProject[];
  /** The newest set of suggested projects, if Muse has drafted one. */
  buildSuggestion: IdeaBuildSuggestion | null;
  /** The viewer's Meta connection, if they have one. */
  meta: MetaConnectionSummary | null;
  /** Whether Meta credentials can be kept on this deployment at all. */
  canConnectMeta: boolean;
  /** Whether "Connect Meta account" is configured on this deployment. */
  canConnectMetaAccount: boolean;
  /** Whether this server offers WeStride Cloud for model calls. */
  cloudAvailable: boolean;
  /** Whether the viewer's WeStride Cloud balance can pay for calls right now. */
  canUseCloud: boolean;
  /** Whether this deployment can keep files advisors make. */
  canStoreFiles: boolean;
};

function toLinkedProject(project: Awaited<ReturnType<typeof listProjectsForIdea>>[number]): LinkedProject {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    ticketCounts: project.ticketCounts,
    repos: project.repos.map((repo) => ({
      fullName: `${repo.owner}/${repo.name}`,
      htmlUrl: repo.htmlUrl,
    })),
    updatedAt: project.updatedAt,
  };
}

export async function loadFactory(
  ideaId: string,
): Promise<{ status: "ok"; data: FactoryData } | Failure> {
  const context = await requireMember(ideaId);
  if (isFailure(context)) {
    return context;
  }
  const { idea, userId } = context;

  const [
    threads,
    evaluations,
    requests,
    usage,
    profiles,
    artifacts,
    projects,
    buildSuggestion,
    meta,
    cloud,
  ] = await Promise.all([
    listThreads(ideaId),
    listEvaluations(ideaId),
    listMuseRequests(ideaId),
    sumMuseUsage(ideaId, userId),
    resolveMemberProfiles(idea.members.map((member) => member.clerkUserId)),
    listArtifacts(ideaId),
    listProjectsForIdea(ideaId, { clerkUserId: userId }),
    getLatestBuildSuggestion(ideaId),
    getMetaConnectionSummary(userId),
    getCloudStatus(userId),
  ]);

  return {
    status: "ok",
    data: {
      threads,
      evaluations,
      requests,
      usage,
      members: [...profiles.values()],
      artifacts,
      projects: projects.map(toLinkedProject),
      buildSuggestion,
      meta,
      canConnectMeta: isMetaConnectionConfigured(),
      canConnectMetaAccount: deviceClientId() !== null,
      cloudAvailable: cloud.aiAvailable,
      canUseCloud: cloud.canRunAi,
      canStoreFiles: isArtifactStorageConfigured(),
    },
  };
}

export async function getMuseRequestDetail(
  ideaId: string,
  requestId: string,
): Promise<{ status: "ok"; request: MuseRequest } | Failure> {
  const context = await requireMember(ideaId);
  if (isFailure(context)) {
    return context;
  }
  if (!uuid.safeParse(requestId).success) {
    return failure("That request does not exist.");
  }
  const request = await getMuseRequest(requestId, ideaId);
  return request ? { status: "ok", request } : failure("That request does not exist.");
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

const sendSchema = z.object({
  ideaId: uuid,
  agentSlug: z.string().min(1),
  content: z.string().trim().min(1, "Write a message.").max(MAX_MESSAGE),
  model: modelSchema,
  webSearch: z.boolean(),
});

export type SendResult =
  | {
      status: "ok";
      threadId: string;
      userMessage: IdeaFactoryMessage;
      agentMessage: IdeaFactoryMessage;
      /** Files the advisor made with this reply. */
      artifacts: IdeaFactoryArtifact[];
      /** Files the advisor tried to make but could not. */
      artifactErrors: string[];
      /** The chat call first, then one entry per image rendered. */
      requests: MuseRequestSummary[];
    }
  | {
      status: "error";
      message: string;
      needsConnection?: boolean;
      threadId?: string;
      userMessage?: IdeaFactoryMessage;
      request?: MuseRequestSummary | null;
    };

function agentForIdea(
  idea: IdeaWithDetails,
  slug: string,
): AgentDefinition | null {
  const agent = getAgent(slug);
  if (!agent) {
    return null;
  }
  return agentsForIdea(idea.type).some((item) => item.slug === slug) ? agent : null;
}

export async function sendAgentMessage(input: unknown): Promise<SendResult> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check the message and try again.");
  }
  const { ideaId, agentSlug, content, model, webSearch } = parsed.data;

  const context = await requireMember(ideaId);
  if (isFailure(context)) {
    return context;
  }
  const { idea, userId } = context;
  const agent = agentForIdea(idea, agentSlug);
  if (!agent) {
    return failure("That advisor is not on this idea's team.");
  }
  const access = await museKeyFor(userId);
  if (isFailure(access)) {
    return access;
  }

  const canStoreFiles = isArtifactStorageConfigured();
  const [thread, latestEvaluation, activeArtifacts] = await Promise.all([
    getOrCreateThread(ideaId, agentSlug),
    getLatestCompletedEvaluation(ideaId),
    canStoreFiles ? listActiveArtifacts(ideaId) : Promise.resolve(null),
  ]);
  const userMessage = await addUserMessage(thread.id, userId, content);

  const result = await callMuse({
    apiKey: access.apiKey,
    model,
    instructions: buildAgentInstructions({
      agent,
      idea,
      latestEvaluation,
      artifacts: activeArtifacts,
      today: today(),
    }),
    input: buildChatInput([...thread.messages, userMessage]),
    webSearch: webSearch && agent.usesWebSearch,
    reasoningEffort: "medium",
    // Documents the advisor writes ride along in the reply, so leave room.
    maxOutputTokens: 8000,
  });

  const request = await record({
    ideaId,
    access,
    agentSlug,
    purpose: "chat",
    model,
    attempt: result.attempt,
  });

  if (!result.text) {
    return {
      status: "error",
      message: result.attempt.error ?? "Muse did not answer.",
      threadId: thread.id,
      userMessage,
      request,
    };
  }

  // Files the advisor asked for come out of the text and become artifacts
  // attached to the reply. The reply is saved first so a slow image render
  // cannot lose the words.
  const extracted = extractArtifactBlocks(result.text);
  const agentMessage = await addAgentMessage({
    threadId: thread.id,
    content: extracted.text || result.text,
    sources: result.sources,
    requestId: request?.id ?? null,
  });

  const requests: MuseRequestSummary[] = request ? [request] : [];
  const artifactErrors: string[] = [];
  if (extracted.rejected > 0) {
    artifactErrors.push(
      extracted.rejected === 1
        ? "One file the advisor described could not be read."
        : `${extracted.rejected} files the advisor described could not be read.`,
    );
  }
  const blocks = agent.createsImages
    ? extracted.blocks
    : extracted.blocks.filter((block) => block.kind !== "image");
  if (blocks.length < extracted.blocks.length) {
    artifactErrors.push(`${agent.name} cannot draw images; ask the Creative Director.`);
  }
  const produced = await produceArtifacts({
    target: { ideaId, clerkUserId: userId, agentSlug, messageId: agentMessage.id },
    blocks,
    access,
  });
  for (const item of [...produced.produced, ...produced.failed]) {
    if (item.attempt) {
      const logged = await record({
        ideaId,
        access,
        agentSlug,
        purpose: "image",
        model: MUSE_IMAGE_MODEL.id,
        attempt: item.attempt,
      });
      if (logged) {
        requests.push(logged);
      }
    }
  }
  for (const failed of produced.failed) {
    artifactErrors.push(failed.message);
  }

  return {
    status: "ok",
    threadId: thread.id,
    userMessage,
    agentMessage,
    artifacts: produced.produced.map((item) => item.artifact),
    artifactErrors,
    requests,
  };
}

// ---------------------------------------------------------------------------
// Files the team keeps
// ---------------------------------------------------------------------------

const artifactSchema = z.object({
  ideaId: uuid,
  artifactId: uuid,
});

export type ArtifactResult = { status: "ok"; artifacts: IdeaFactoryArtifact[] } | Failure;

/** Archives a file so advisors stop considering it, or brings it back. */
export async function setArtifactArchivedAction(
  input: unknown,
  isArchived: boolean,
): Promise<ArtifactResult> {
  const parsed = artifactSchema.safeParse(input);
  if (!parsed.success) {
    return failure("That file does not exist.");
  }
  const context = await requireMember(parsed.data.ideaId);
  if (isFailure(context)) {
    return context;
  }
  const artifact = await setArtifactArchived(parsed.data.artifactId, parsed.data.ideaId, isArchived);
  return artifact ? { status: "ok", artifacts: [artifact] } : failure("That file does not exist.");
}

/** Marks a file as the one the team is going with, or clears that mark. */
export async function setArtifactChosenAction(
  input: unknown,
  isChosen: boolean,
): Promise<ArtifactResult> {
  const parsed = artifactSchema.safeParse(input);
  if (!parsed.success) {
    return failure("That file does not exist.");
  }
  const context = await requireMember(parsed.data.ideaId);
  if (isFailure(context)) {
    return context;
  }
  const artifacts = await setArtifactChosen(parsed.data.artifactId, parsed.data.ideaId, isChosen);
  return artifacts.length > 0 ? { status: "ok", artifacts } : failure("That file does not exist.");
}

const reportSchema = z.object({
  evaluationId: uuid,
});

export type ReportResult = { status: "ok"; artifact: IdeaFactoryArtifact } | Failure;

/**
 * Renders the evaluation as a US Letter PDF and keeps it with the idea's
 * files. Rendering again for the same evaluation returns the existing report.
 */
export async function generateEvaluationReport(input: unknown): Promise<ReportResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) {
    return failure("That evaluation does not exist.");
  }
  const evaluation = await getEvaluation(parsed.data.evaluationId);
  if (!evaluation) {
    return failure("That evaluation does not exist.");
  }
  const context = await requireMember(evaluation.ideaId);
  if (isFailure(context)) {
    return context;
  }
  if (evaluation.status === "RUNNING") {
    return failure("Wait for the evaluation to finish before making the report.");
  }
  if (!isArtifactStorageConfigured()) {
    return failure("File storage is not set up on this server, so reports cannot be kept.");
  }
  const { idea, userId } = context;

  const existing = (await listActiveArtifacts(idea.id)).find(
    (artifact) => artifact.kind === "REPORT" && artifact.evaluationId === evaluation.id,
  );
  if (existing) {
    return { status: "ok", artifact: existing };
  }

  try {
    const pdf = await renderEvaluationReport({ idea, evaluation });
    const stored = await storeArtifact({
      ideaId: idea.id,
      kind: "REPORT",
      bytes: pdf,
      contentType: "application/pdf",
    });
    const when = (evaluation.completedAt ?? evaluation.createdAt).toISOString().slice(0, 10);
    const artifact = await createArtifact({
      ideaId: idea.id,
      clerkUserId: userId,
      agentSlug: null,
      messageId: null,
      evaluationId: evaluation.id,
      kind: "REPORT",
      collection: "evaluation-reports",
      title: `${idea.name} — Idea Workshop report (${when})`,
      description: `Evaluation by ${evaluation.findings.length} advisors, ${when}.`,
      pathname: stored.pathname,
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
    });
    return { status: "ok", artifact };
  } catch (error) {
    console.error("Evaluation report failed", error);
    return failure("The report could not be made. Try again.");
  }
}

// ---------------------------------------------------------------------------
// Suggested Build Studio projects
// ---------------------------------------------------------------------------

const suggestSchema = z.object({
  ideaId: uuid,
  model: modelSchema,
});

const MAX_SUGGESTED_PROJECTS = 8;

function cleanSuggestions(raw: unknown): { summary: string; projects: BuildSuggestion[] } | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as { summary?: unknown; projects?: unknown };
  if (typeof value.summary !== "string" || !Array.isArray(value.projects)) {
    return null;
  }
  const strings = (list: unknown): string[] =>
    Array.isArray(list)
      ? list.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
  const seen = new Set<string>();
  const projects = value.projects.flatMap((item): BuildSuggestion[] => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const entry = item as Partial<BuildSuggestion>;
    if (typeof entry.name !== "string" || !entry.name.trim()) {
      return [];
    }
    const name = entry.name.trim().slice(0, 60);
    let key = slugifyCollection(typeof entry.key === "string" && entry.key ? entry.key : name);
    while (!key || seen.has(key)) {
      key = `${key || "project"}-${seen.size + 1}`;
    }
    seen.add(key);
    const kind = (BUILD_SUGGESTION_KINDS as readonly string[]).includes(entry.kind ?? "")
      ? (entry.kind as BuildSuggestionKind)
      : "other";
    return [
      {
        key,
        name,
        repoName:
          slugifyCollection(typeof entry.repoName === "string" ? entry.repoName : name) || key,
        kind,
        summary: typeof entry.summary === "string" ? entry.summary.trim().slice(0, 300) : "",
        description:
          typeof entry.description === "string" ? entry.description.trim().slice(0, 4000) : "",
        stack: strings(entry.stack).slice(0, 12),
        firstMilestones: strings(entry.firstMilestones).slice(0, 6),
        dependsOn: strings(entry.dependsOn).map(slugifyCollection),
        projectId: null,
      },
    ];
  });
  if (projects.length === 0) {
    return null;
  }
  return { summary: value.summary, projects: projects.slice(0, MAX_SUGGESTED_PROJECTS) };
}

export type SuggestResult =
  | { status: "ok"; suggestion: IdeaBuildSuggestion; request: MuseRequestSummary | null }
  | (Failure & { request?: MuseRequestSummary | null });

/** Asks Muse how to split the idea into Build Studio projects. */
export async function suggestBuildProjects(input: unknown): Promise<SuggestResult> {
  const parsed = suggestSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check the request and try again.");
  }
  const context = await requireMember(parsed.data.ideaId);
  if (isFailure(context)) {
    return context;
  }
  const { idea, userId } = context;
  const access = await museKeyFor(userId);
  if (isFailure(access)) {
    return access;
  }
  const [latestEvaluation, projects] = await Promise.all([
    getLatestCompletedEvaluation(idea.id),
    listProjectsForIdea(idea.id, { clerkUserId: userId }),
  ]);

  const result = await callMuse({
    apiKey: access.apiKey,
    model: parsed.data.model,
    instructions: BUILD_SUGGESTIONS_INSTRUCTIONS,
    input: buildSuggestionsInput({
      idea,
      latestEvaluation,
      existingProjects: projects.map((project) => ({
        key: `existing-${project.id.slice(0, 8)}`,
        name: project.name,
        description: project.description,
        status: project.status,
        repos: project.repos.map((repo) => `${repo.owner}/${repo.name}`),
      })),
    }),
    webSearch: false,
    jsonFormat: { name: "build_suggestions", schema: BUILD_SUGGESTIONS_SCHEMA },
    reasoningEffort: "high",
    maxOutputTokens: 14_000,
  });

  const request = await record({
    ideaId: idea.id,
    access,
    agentSlug: null,
    purpose: "build-suggestions",
    model: parsed.data.model,
    attempt: result.attempt,
  });

  const cleaned = result.text ? cleanSuggestions(parseJsonOutput(result.text)) : null;
  if (!cleaned) {
    return {
      ...failure(
        result.attempt.error ?? "Muse answered in a shape the Idea Factory could not read.",
      ),
      request,
    };
  }
  const suggestion = await createBuildSuggestion({
    ideaId: idea.id,
    clerkUserId: userId,
    model: parsed.data.model,
    summary: cleaned.summary,
    projects: cleaned.projects,
    requestId: request?.id ?? null,
  });
  return { status: "ok", suggestion, request };
}

const prefillSchema = z.object({
  ideaId: uuid,
  suggestionId: uuid,
  key: z.string().min(1),
});

/** What "Start this project" opens the new-project dialog with. */
export async function loadSuggestedProjectPrefill(
  input: unknown,
): Promise<{ status: "ok"; prefill: ProjectPrefill } | Failure> {
  const parsed = prefillSchema.safeParse(input);
  if (!parsed.success) {
    return failure("That suggestion does not exist.");
  }
  const context = await requireMember(parsed.data.ideaId);
  if (isFailure(context)) {
    return context;
  }
  const { idea, userId } = context;
  const suggestion = await getLatestBuildSuggestion(idea.id);
  const project = suggestion?.projects.find((item) => item.key === parsed.data.key);
  if (!suggestion || suggestion.id !== parsed.data.suggestionId || !project) {
    return failure("That suggestion is no longer current. Refresh the suggestions.");
  }
  const others = idea.members.filter((member) => member.clerkUserId !== userId);
  const profiles = await resolveMemberProfiles(others.map((member) => member.clerkUserId));
  const extras: string[] = [];
  if (project.stack.length > 0) {
    extras.push(`## Recommended stack\n${project.stack.map((item) => `- ${item}`).join("\n")}`);
  }
  if (project.firstMilestones.length > 0) {
    extras.push(
      `## First milestones\n${project.firstMilestones.map((item, index) => `${index + 1}. ${item}`).join("\n")}`,
    );
  }
  return {
    status: "ok",
    prefill: {
      ideaId: idea.id,
      name: project.name,
      description: [project.description || project.summary, ...extras]
        .join("\n\n")
        .slice(0, MAX_PROJECT_DESCRIPTION),
      invites: others.map((member) => ({
        ...(profiles.get(member.clerkUserId) ?? {
          clerkUserId: member.clerkUserId,
          name: "WeStride member",
          imageUrl: null,
        }),
        role: member.role === "FOUNDER" ? "OWNER" : "MEMBER",
      })),
      githubRepoUrl: null,
    },
  };
}

const linkSchema = prefillSchema.extend({ projectId: uuid });

/** Remembers which project a suggestion became, so the card shows it. */
export async function linkSuggestedProject(
  input: unknown,
): Promise<{ status: "ok"; suggestion: IdeaBuildSuggestion; project: LinkedProject | null } | Failure> {
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) {
    return failure("That suggestion does not exist.");
  }
  const context = await requireMember(parsed.data.ideaId);
  if (isFailure(context)) {
    return context;
  }
  const [suggestion, projects] = await Promise.all([
    linkBuildSuggestionProject({
      suggestionId: parsed.data.suggestionId,
      ideaId: parsed.data.ideaId,
      key: parsed.data.key,
      projectId: parsed.data.projectId,
    }),
    listProjectsForIdea(parsed.data.ideaId, { clerkUserId: context.userId }),
  ]);
  if (!suggestion) {
    return failure("That suggestion does not exist.");
  }
  revalidatePath(`/ideas/${parsed.data.ideaId}`);
  const project = projects.find((item) => item.id === parsed.data.projectId);
  return { status: "ok", suggestion, project: project ? toLinkedProject(project) : null };
}

/** Re-reads the projects linked to the idea, after one was created elsewhere. */
export async function refreshLinkedProjects(
  ideaId: string,
): Promise<{ status: "ok"; projects: LinkedProject[] } | Failure> {
  const context = await requireMember(ideaId);
  if (isFailure(context)) {
    return context;
  }
  const projects = await listProjectsForIdea(ideaId, { clerkUserId: context.userId });
  return { status: "ok", projects: projects.map(toLinkedProject) };
}

// ---------------------------------------------------------------------------
// Evaluate my idea
// ---------------------------------------------------------------------------

const startEvaluationSchema = z.object({
  ideaId: uuid,
  agentSlugs: z.array(z.string().min(1)).min(1, "Pick at least one advisor.").max(12),
  model: modelSchema,
});

export async function startEvaluation(
  input: unknown,
): Promise<{ status: "ok"; evaluation: EvaluationWithFindings } | Failure> {
  const parsed = startEvaluationSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check the selection and try again.");
  }
  const context = await requireMember(parsed.data.ideaId);
  if (isFailure(context)) {
    return context;
  }
  const { idea, userId } = context;

  const slugs = [...new Set(parsed.data.agentSlugs)].filter(
    (slug) => slug !== IDEA_COACH_SLUG && agentForIdea(idea, slug) !== null,
  );
  if (slugs.length === 0) {
    return failure("Pick at least one advisor from this idea's team.");
  }
  // Re-mints a lapsing key once here, before every advisor runs at once.
  const access = await museKeyFor(userId);
  if (isFailure(access)) {
    return access;
  }

  const evaluation = await createEvaluation({
    ideaId: idea.id,
    clerkUserId: userId,
    model: parsed.data.model,
    agentSlugs: slugs,
  });
  return { status: "ok", evaluation };
}

const runAgentSchema = z.object({
  evaluationId: uuid,
  agentSlug: z.string().min(1),
  webSearch: z.boolean(),
});

type EvaluationAnswer = {
  verdict: MuseFindingVerdict;
  summary: string;
  findings: MuseFinding[];
  nextSteps: string[];
};

const VERDICTS: MuseFindingVerdict[] = ["PROMISING", "CAUTION", "BLOCKER"];
const EVIDENCE: MuseFinding["evidenceClass"][] = [
  "VERIFIED",
  "ESTIMATE",
  "ASSUMPTION",
  "HYPOTHESIS",
];

function cleanAnswer(raw: unknown): EvaluationAnswer | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as Partial<EvaluationAnswer>;
  if (
    typeof value.summary !== "string" ||
    !Array.isArray(value.findings) ||
    !VERDICTS.includes(value.verdict as MuseFindingVerdict)
  ) {
    return null;
  }
  const findings: MuseFinding[] = value.findings.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const finding = item as Partial<MuseFinding>;
    if (typeof finding.claim !== "string" || !finding.claim) {
      return [];
    }
    return [
      {
        claim: finding.claim,
        detail: typeof finding.detail === "string" ? finding.detail : "",
        evidenceClass: EVIDENCE.includes(finding.evidenceClass as MuseFinding["evidenceClass"])
          ? (finding.evidenceClass as MuseFinding["evidenceClass"])
          : "HYPOTHESIS",
        sources: Array.isArray(finding.sources)
          ? finding.sources.flatMap((source) => {
              const entry = source as Partial<MuseFinding["sources"][number]> | null;
              if (!entry || typeof entry.url !== "string" || !/^https?:\/\//.test(entry.url)) {
                return [];
              }
              return [
                {
                  url: entry.url,
                  title: typeof entry.title === "string" ? entry.title : null,
                  date: typeof entry.date === "string" ? entry.date : null,
                },
              ];
            })
          : [],
      },
    ];
  });
  return {
    verdict: value.verdict as MuseFindingVerdict,
    summary: value.summary,
    findings,
    nextSteps: Array.isArray(value.nextSteps)
      ? value.nextSteps.filter((step): step is string => typeof step === "string")
      : [],
  };
}

export type RunAgentResult =
  | { status: "ok"; finding: IdeaFactoryFinding; request: MuseRequestSummary | null }
  | {
      status: "error";
      message: string;
      needsConnection?: boolean;
      finding?: IdeaFactoryFinding;
      request?: MuseRequestSummary | null;
    };

export async function runEvaluationAgent(input: unknown): Promise<RunAgentResult> {
  const parsed = runAgentSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the request and try again.");
  }
  const { evaluationId, agentSlug, webSearch } = parsed.data;

  const evaluation = await getEvaluation(evaluationId);
  if (!evaluation) {
    return failure("That evaluation does not exist.");
  }
  const context = await requireMember(evaluation.ideaId);
  if (isFailure(context)) {
    return context;
  }
  const { idea, userId } = context;
  const agent = agentForIdea(idea, agentSlug);
  const slot = evaluation.findings.find((finding) => finding.agentSlug === agentSlug);
  if (!agent || !slot) {
    return failure("That advisor is not part of this evaluation.");
  }
  if (slot.status === "COMPLETED") {
    return { status: "ok", finding: slot, request: null };
  }
  const access = await museKeyFor(userId);
  if (isFailure(access)) {
    return access;
  }

  await markFindingRunning(evaluationId, agentSlug);
  const previous = await getLatestCompletedEvaluation(idea.id);

  const result = await callMuse({
    apiKey: access.apiKey,
    model: evaluation.model,
    instructions: buildAgentInstructions({
      agent,
      idea,
      latestEvaluation: previous?.id === evaluationId ? null : previous,
      // Evaluations answer in JSON; file-making instructions would only confuse that.
      artifacts: null,
      today: today(),
    }),
    input: EVALUATION_PROMPT,
    webSearch: webSearch && agent.usesWebSearch,
    jsonFormat: { name: "idea_evaluation", schema: EVALUATION_SCHEMA },
    reasoningEffort: "medium",
    // Reasoning tokens count toward this cap. Web search plus a structured
    // report can pass 6,000 and truncate the JSON, which fails the advisor.
    maxOutputTokens: 16_000,
  });

  const request = await record({
    ideaId: idea.id,
    access,
    agentSlug,
    purpose: "evaluation",
    model: evaluation.model,
    attempt: result.attempt,
  });

  const answer = result.text ? cleanAnswer(parseJsonOutput(result.text)) : null;
  if (!answer) {
    const message =
      result.attempt.error ?? "Muse answered in a shape the Idea Factory could not read.";
    const finding = await failFinding({
      evaluationId,
      agentSlug,
      error: message,
      requestId: request?.id ?? null,
    });
    return { status: "error", message, finding, request };
  }

  const finding = await completeFinding({
    evaluationId,
    agentSlug,
    verdict: answer.verdict,
    summary: answer.summary,
    findings: answer.findings,
    nextSteps: answer.nextSteps,
    requestId: request?.id ?? null,
  });
  return { status: "ok", finding, request };
}

const synthesizeSchema = z.object({
  evaluationId: uuid,
});

function cleanSynthesis(raw: unknown): MuseSynthesis | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as Partial<MuseSynthesis>;
  if (typeof value.overview !== "string" || typeof value.recommendation !== "string") {
    return null;
  }
  const strings = (list: unknown): string[] =>
    Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : [];
  return {
    overview: value.overview,
    agreements: strings(value.agreements),
    disagreements: Array.isArray(value.disagreements)
      ? value.disagreements.flatMap((item) => {
          const entry = item as Partial<MuseSynthesis["disagreements"][number]> | null;
          if (!entry || typeof entry.topic !== "string") {
            return [];
          }
          return [
            {
              topic: entry.topic,
              positions: typeof entry.positions === "string" ? entry.positions : "",
              resolution: typeof entry.resolution === "string" ? entry.resolution : "",
            },
          ];
        })
      : [],
    risks: strings(value.risks),
    recommendation: value.recommendation,
    questionsForYou: strings(value.questionsForYou),
  };
}

export type SynthesizeResult =
  | { status: "ok"; evaluation: EvaluationWithFindings; request: MuseRequestSummary | null }
  | {
      status: "error";
      message: string;
      needsConnection?: boolean;
      evaluation?: EvaluationWithFindings;
      request?: MuseRequestSummary | null;
    };

export async function synthesizeEvaluation(input: unknown): Promise<SynthesizeResult> {
  const parsed = synthesizeSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the request and try again.");
  }
  const { evaluationId } = parsed.data;

  const evaluation = await getEvaluation(evaluationId);
  if (!evaluation) {
    return failure("That evaluation does not exist.");
  }
  const context = await requireMember(evaluation.ideaId);
  if (isFailure(context)) {
    return context;
  }
  const { idea, userId } = context;

  if (evaluation.status === "COMPLETED") {
    return { status: "ok", evaluation, request: null };
  }
  const completed = evaluation.findings.filter((finding) => finding.status === "COMPLETED");
  if (completed.length === 0) {
    const message = "No advisor finished, so there is nothing to synthesise.";
    await failEvaluation({ evaluationId, error: message, requestId: null });
    const failed = await getEvaluation(evaluationId);
    return { status: "error", message, evaluation: failed ?? evaluation, request: null };
  }
  const access = await museKeyFor(userId);
  if (isFailure(access)) {
    return access;
  }

  const result = await callMuse({
    apiKey: access.apiKey,
    model: evaluation.model,
    instructions: `${SYNTHESIS_INSTRUCTIONS}\n\nThe idea: "${idea.name}" (${IDEA_TYPE_LABELS[idea.type].toLowerCase()}).\n${idea.description.trim().slice(0, 3000)}`,
    input: buildSynthesisInput(evaluation),
    webSearch: false,
    jsonFormat: { name: "idea_synthesis", schema: SYNTHESIS_SCHEMA },
    reasoningEffort: "high",
    maxOutputTokens: 12_000,
  });

  const request = await record({
    ideaId: idea.id,
    access,
    agentSlug: null,
    purpose: "synthesis",
    model: evaluation.model,
    attempt: result.attempt,
  });

  const synthesis = result.text ? cleanSynthesis(parseJsonOutput(result.text)) : null;
  if (!synthesis) {
    const message =
      result.attempt.error ?? "Muse answered in a shape the Idea Factory could not read.";
    await failEvaluation({ evaluationId, error: message, requestId: request?.id ?? null });
    const failed = await getEvaluation(evaluationId);
    return { status: "error", message, evaluation: failed ?? evaluation, request };
  }

  await completeEvaluation({ evaluationId, synthesis, requestId: request?.id ?? null });
  const done = await getEvaluation(evaluationId);
  return { status: "ok", evaluation: done ?? evaluation, request };
}
