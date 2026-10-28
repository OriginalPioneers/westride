"use server";

import { auth } from "@clerk/nextjs/server";
import type {
  IdeaFactoryFinding,
  IdeaFactoryMessage,
  MuseFinding,
  MuseFindingVerdict,
  MuseRequest,
  MuseSynthesis,
} from "@westride/db";
import {
  addAgentMessage,
  addUserMessage,
  completeEvaluation,
  completeFinding,
  createEvaluation,
  failEvaluation,
  failFinding,
  getEvaluation,
  getLatestCompletedEvaluation,
  getMuseRequest,
  getOrCreateThread,
  isIdeaMember,
  listEvaluations,
  listMuseRequests,
  listThreads,
  logMuseRequest,
  markFindingRunning,
  sumMuseUsage,
  type EvaluationWithFindings,
  type MuseRequestSummary,
  type MuseUsageTotals,
  type ThreadWithMessages,
} from "@westride/db/idea-factory";
import { getIdea, type IdeaWithDetails } from "@westride/db/ideas";
import { z } from "zod";
import {
  agentsForIdea,
  getAgent,
  IDEA_COACH_SLUG,
  type AgentDefinition,
} from "@/lib/idea-factory/agents";
import type { MuseCredential } from "@/lib/idea-factory/credentials";
import {
  callMuse,
  deviceClientId,
  listMuseModels,
  mintApiKey,
  MINTED_KEY_LIFETIME_MS,
  MuseError,
  parseJsonOutput,
  pollDeviceAuthorization,
  startDeviceAuthorization,
  type MuseAttempt,
} from "@/lib/idea-factory/muse";
import { isMuseModelId } from "@/lib/idea-factory/pricing";
import {
  buildAgentInstructions,
  buildChatInput,
  buildSynthesisInput,
  EVALUATION_PROMPT,
  EVALUATION_SCHEMA,
  SYNTHESIS_INSTRUCTIONS,
  SYNTHESIS_SCHEMA,
} from "@/lib/idea-factory/prompts";
import { resolveMemberProfiles, type MemberProfile } from "@/lib/ideas/members";

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

const MAX_MESSAGE = 6000;

const uuid = z.string().uuid();
const apiKeySchema = z.string().trim().min(8).max(512);
const accessSchema = z.object({ apiKey: apiKeySchema });
const modelSchema = z
  .string()
  .refine(isMuseModelId, "Choose a supported Muse model.");

type Failure = { status: "error"; message: string };

function failure(message: string): Failure {
  return { status: "error", message };
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
  userId: string;
  agentSlug: string | null;
  purpose: string;
  model: string;
  attempt: MuseAttempt;
}): Promise<MuseRequestSummary | null> {
  try {
    const logged = await logMuseRequest({
      ideaId: input.ideaId,
      clerkUserId: input.userId,
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

export type FactoryData = {
  threads: ThreadWithMessages[];
  evaluations: EvaluationWithFindings[];
  requests: MuseRequestSummary[];
  usage: MuseUsageTotals;
  members: MemberProfile[];
  /** Whether "Connect Meta account" is configured on this deployment. */
  canConnectMetaAccount: boolean;
};

export async function loadFactory(
  ideaId: string,
): Promise<{ status: "ok"; data: FactoryData } | Failure> {
  const context = await requireMember(ideaId);
  if (isFailure(context)) {
    return context;
  }
  const { idea, userId } = context;

  const [threads, evaluations, requests, usage, profiles] = await Promise.all([
    listThreads(ideaId),
    listEvaluations(ideaId),
    listMuseRequests(ideaId),
    sumMuseUsage(ideaId, userId),
    resolveMemberProfiles(idea.members.map((member) => member.clerkUserId)),
  ]);

  return {
    status: "ok",
    data: {
      threads,
      evaluations,
      requests,
      usage,
      members: [...profiles.values()],
      canConnectMetaAccount: deviceClientId() !== null,
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
// Connecting a Meta account
// ---------------------------------------------------------------------------

export type ConnectStart = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  intervalSeconds: number;
  expiresInSeconds: number;
};

export async function startMetaConnect(): Promise<
  { status: "ok"; start: ConnectStart } | Failure
> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in first.");
  }
  const clientId = deviceClientId();
  if (!clientId) {
    return failure("Connecting a Meta account is not configured. Paste an API key instead.");
  }
  try {
    const start = await startDeviceAuthorization(clientId);
    return { status: "ok", start };
  } catch (error) {
    console.error("Meta device authorization failed", error);
    return failure(
      error instanceof MuseError ? error.message : "Meta sign-in could not be started.",
    );
  }
}

export type ConnectPoll =
  | { status: "pending" }
  | { status: "slow_down"; intervalSeconds: number }
  | { status: "authorized"; credential: MuseCredential }
  | { status: "denied" }
  | { status: "expired" }
  | Failure;

export async function pollMetaConnect(deviceCode: string): Promise<ConnectPoll> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in first.");
  }
  const clientId = deviceClientId();
  if (!clientId || typeof deviceCode !== "string" || !deviceCode) {
    return failure("Meta sign-in is not available.");
  }
  try {
    const poll = await pollDeviceAuthorization(clientId, deviceCode);
    if (poll.status !== "authorized") {
      return poll;
    }
    const apiKey = await mintApiKey(poll.identityToken);
    return {
      status: "authorized",
      credential: {
        kind: "meta-account",
        apiKey,
        identityToken: poll.identityToken,
        expiresAt: Date.now() + MINTED_KEY_LIFETIME_MS,
        label: "Meta account",
        connectedAt: Date.now(),
      },
    };
  } catch (error) {
    console.error("Meta device poll failed", error);
    return failure(error instanceof MuseError ? error.message : "Meta sign-in failed.");
  }
}

/** Re-mints the daily key from a stored identity token. */
export async function refreshMetaKey(
  identityToken: string,
): Promise<{ status: "ok"; apiKey: string; expiresAt: number } | Failure> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in first.");
  }
  if (typeof identityToken !== "string" || !identityToken) {
    return failure("Connect your Meta account again.");
  }
  try {
    const apiKey = await mintApiKey(identityToken);
    return { status: "ok", apiKey, expiresAt: Date.now() + MINTED_KEY_LIFETIME_MS };
  } catch (error) {
    return failure(
      error instanceof MuseError ? error.message : "Your Meta key could not be refreshed.",
    );
  }
}

/** Confirms a pasted key works before it is kept in the browser. */
export async function verifyMuseKey(
  apiKey: string,
): Promise<{ status: "ok"; models: string[] } | Failure> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in first.");
  }
  const parsed = apiKeySchema.safeParse(apiKey);
  if (!parsed.success) {
    return failure("That does not look like a Meta Model API key.");
  }
  const result = await listMuseModels(parsed.data);
  return result.ok ? { status: "ok", models: result.models } : failure(result.error);
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

const sendSchema = z.object({
  ideaId: uuid,
  agentSlug: z.string().min(1),
  content: z.string().trim().min(1, "Write a message.").max(MAX_MESSAGE),
  access: accessSchema,
  model: modelSchema,
  webSearch: z.boolean(),
});

export type SendResult =
  | {
      status: "ok";
      threadId: string;
      userMessage: IdeaFactoryMessage;
      agentMessage: IdeaFactoryMessage;
      request: MuseRequestSummary | null;
    }
  | {
      status: "error";
      message: string;
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
  const { ideaId, agentSlug, content, access, model, webSearch } = parsed.data;

  const context = await requireMember(ideaId);
  if (isFailure(context)) {
    return context;
  }
  const { idea, userId } = context;
  const agent = agentForIdea(idea, agentSlug);
  if (!agent) {
    return failure("That advisor is not on this idea's team.");
  }

  const [thread, latestEvaluation] = await Promise.all([
    getOrCreateThread(ideaId, agentSlug),
    getLatestCompletedEvaluation(ideaId),
  ]);
  const userMessage = await addUserMessage(thread.id, userId, content);

  const result = await callMuse({
    apiKey: access.apiKey,
    model,
    instructions: buildAgentInstructions({
      agent,
      idea,
      latestEvaluation,
      today: today(),
    }),
    input: buildChatInput([...thread.messages, userMessage]),
    webSearch: webSearch && agent.usesWebSearch,
    reasoningEffort: "medium",
    maxOutputTokens: 4000,
  });

  const request = await record({
    ideaId,
    userId,
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

  const agentMessage = await addAgentMessage({
    threadId: thread.id,
    content: result.text,
    sources: result.sources,
    requestId: request?.id ?? null,
  });

  return { status: "ok", threadId: thread.id, userMessage, agentMessage, request };
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
  access: accessSchema,
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
  | { status: "error"; message: string; finding?: IdeaFactoryFinding; request?: MuseRequestSummary | null };

export async function runEvaluationAgent(input: unknown): Promise<RunAgentResult> {
  const parsed = runAgentSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the request and try again.");
  }
  const { evaluationId, agentSlug, access, webSearch } = parsed.data;

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

  await markFindingRunning(evaluationId, agentSlug);
  const previous = await getLatestCompletedEvaluation(idea.id);

  const result = await callMuse({
    apiKey: access.apiKey,
    model: evaluation.model,
    instructions: buildAgentInstructions({
      agent,
      idea,
      latestEvaluation: previous?.id === evaluationId ? null : previous,
      today: today(),
    }),
    input: EVALUATION_PROMPT,
    webSearch: webSearch && agent.usesWebSearch,
    jsonFormat: { name: "idea_evaluation", schema: EVALUATION_SCHEMA },
    reasoningEffort: "medium",
    maxOutputTokens: 6000,
  });

  const request = await record({
    ideaId: idea.id,
    userId,
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
  access: accessSchema,
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
  | { status: "error"; message: string; evaluation?: EvaluationWithFindings; request?: MuseRequestSummary | null };

export async function synthesizeEvaluation(input: unknown): Promise<SynthesizeResult> {
  const parsed = synthesizeSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the request and try again.");
  }
  const { evaluationId, access } = parsed.data;

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

  const result = await callMuse({
    apiKey: access.apiKey,
    model: evaluation.model,
    instructions: `${SYNTHESIS_INSTRUCTIONS}\n\nThe idea: "${idea.name}" (${idea.type === "BUSINESS" ? "business" : "non-profit"}).\n${idea.description.trim().slice(0, 3000)}`,
    input: buildSynthesisInput(evaluation),
    webSearch: false,
    jsonFormat: { name: "idea_synthesis", schema: SYNTHESIS_SCHEMA },
    reasoningEffort: "high",
    maxOutputTokens: 5000,
  });

  const request = await record({
    ideaId: idea.id,
    userId,
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
