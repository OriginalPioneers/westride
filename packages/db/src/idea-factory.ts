import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./client";
import {
  ideaFactoryEvaluations,
  ideaFactoryFindings,
  ideaFactoryMessages,
  ideaFactoryThreads,
  ideaMembers,
  museRequests,
  type IdeaFactoryEvaluation,
  type IdeaFactoryFinding,
  type IdeaFactoryMessage,
  type IdeaFactoryThread,
  type MuseFinding,
  type MuseFindingVerdict,
  type MuseRequest,
  type MuseSource,
  type MuseSynthesis,
  type NewMuseRequest,
} from "./schema";

export type ThreadWithMessages = IdeaFactoryThread & {
  messages: IdeaFactoryMessage[];
};

export type EvaluationWithFindings = IdeaFactoryEvaluation & {
  findings: IdeaFactoryFinding[];
};

/** Everything the log table shows. Bodies are loaded separately on demand. */
export type MuseRequestSummary = Omit<
  MuseRequest,
  "requestBody" | "responseBody"
>;

export type MuseUsageTotals = {
  requests: number;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  totalTokens: number;
  webSearchCalls: number;
  estimatedCostMicros: number;
};

const REQUEST_LOG_LIMIT = 200;

export async function isIdeaMember(
  ideaId: string,
  clerkUserId: string,
): Promise<boolean> {
  const row = await getDb().query.ideaMembers.findFirst({
    where: and(
      eq(ideaMembers.ideaId, ideaId),
      eq(ideaMembers.clerkUserId, clerkUserId),
    ),
    columns: { ideaId: true },
  });
  return Boolean(row);
}

// ---------------------------------------------------------------------------
// Threads and messages
// ---------------------------------------------------------------------------

export async function listThreads(ideaId: string): Promise<ThreadWithMessages[]> {
  return getDb().query.ideaFactoryThreads.findMany({
    where: eq(ideaFactoryThreads.ideaId, ideaId),
    orderBy: [asc(ideaFactoryThreads.createdAt)],
    with: {
      messages: {
        orderBy: (message, { asc: by }) => [by(message.createdAt)],
      },
    },
  });
}

export async function getOrCreateThread(
  ideaId: string,
  agentSlug: string,
): Promise<ThreadWithMessages> {
  const db = getDb();
  await db
    .insert(ideaFactoryThreads)
    .values({ ideaId, agentSlug })
    .onConflictDoNothing({
      target: [ideaFactoryThreads.ideaId, ideaFactoryThreads.agentSlug],
    });

  const thread = await db.query.ideaFactoryThreads.findFirst({
    where: and(
      eq(ideaFactoryThreads.ideaId, ideaId),
      eq(ideaFactoryThreads.agentSlug, agentSlug),
    ),
    with: {
      messages: {
        orderBy: (message, { asc: by }) => [by(message.createdAt)],
      },
    },
  });
  if (!thread) {
    throw new Error("The conversation could not be opened.");
  }
  return thread;
}

export async function addUserMessage(
  threadId: string,
  clerkUserId: string,
  content: string,
): Promise<IdeaFactoryMessage> {
  const db = getDb();
  const [message] = await db
    .insert(ideaFactoryMessages)
    .values({ threadId, role: "USER", clerkUserId, content })
    .returning();
  if (!message) {
    throw new Error("The message could not be saved.");
  }
  await db
    .update(ideaFactoryThreads)
    .set({ updatedAt: new Date() })
    .where(eq(ideaFactoryThreads.id, threadId));
  return message;
}

export async function addAgentMessage(input: {
  threadId: string;
  content: string;
  sources: MuseSource[];
  requestId: string | null;
}): Promise<IdeaFactoryMessage> {
  const db = getDb();
  const [message] = await db
    .insert(ideaFactoryMessages)
    .values({
      threadId: input.threadId,
      role: "AGENT",
      content: input.content,
      sources: input.sources,
      requestId: input.requestId,
    })
    .returning();
  if (!message) {
    throw new Error("The reply could not be saved.");
  }
  await db
    .update(ideaFactoryThreads)
    .set({ updatedAt: new Date() })
    .where(eq(ideaFactoryThreads.id, input.threadId));
  return message;
}

// ---------------------------------------------------------------------------
// Evaluations
// ---------------------------------------------------------------------------

export async function listEvaluations(
  ideaId: string,
): Promise<EvaluationWithFindings[]> {
  return getDb().query.ideaFactoryEvaluations.findMany({
    where: eq(ideaFactoryEvaluations.ideaId, ideaId),
    orderBy: [desc(ideaFactoryEvaluations.createdAt)],
    with: {
      findings: {
        orderBy: (finding, { asc: by }) => [by(finding.createdAt)],
      },
    },
  });
}

export async function getEvaluation(
  id: string,
): Promise<EvaluationWithFindings | null> {
  const evaluation = await getDb().query.ideaFactoryEvaluations.findFirst({
    where: eq(ideaFactoryEvaluations.id, id),
    with: {
      findings: {
        orderBy: (finding, { asc: by }) => [by(finding.createdAt)],
      },
    },
  });
  return evaluation ?? null;
}

/** The most recent finished evaluation, which every agent reads as context. */
export async function getLatestCompletedEvaluation(
  ideaId: string,
): Promise<EvaluationWithFindings | null> {
  const evaluation = await getDb().query.ideaFactoryEvaluations.findFirst({
    where: and(
      eq(ideaFactoryEvaluations.ideaId, ideaId),
      eq(ideaFactoryEvaluations.status, "COMPLETED"),
    ),
    orderBy: [desc(ideaFactoryEvaluations.completedAt)],
    with: {
      findings: {
        orderBy: (finding, { asc: by }) => [by(finding.createdAt)],
      },
    },
  });
  return evaluation ?? null;
}

export async function createEvaluation(input: {
  ideaId: string;
  clerkUserId: string;
  model: string;
  agentSlugs: string[];
}): Promise<EvaluationWithFindings> {
  const db = getDb();
  const [evaluation] = await db
    .insert(ideaFactoryEvaluations)
    .values({
      ideaId: input.ideaId,
      clerkUserId: input.clerkUserId,
      model: input.model,
    })
    .returning();
  if (!evaluation) {
    throw new Error("The evaluation could not be started.");
  }

  const findings =
    input.agentSlugs.length > 0
      ? await db
          .insert(ideaFactoryFindings)
          .values(
            input.agentSlugs.map((agentSlug) => ({
              evaluationId: evaluation.id,
              agentSlug,
            })),
          )
          .returning()
      : [];

  return { ...evaluation, findings };
}

export async function markFindingRunning(
  evaluationId: string,
  agentSlug: string,
): Promise<void> {
  await getDb()
    .update(ideaFactoryFindings)
    .set({ status: "RUNNING", error: null })
    .where(
      and(
        eq(ideaFactoryFindings.evaluationId, evaluationId),
        eq(ideaFactoryFindings.agentSlug, agentSlug),
      ),
    );
}

export async function completeFinding(input: {
  evaluationId: string;
  agentSlug: string;
  verdict: MuseFindingVerdict;
  summary: string;
  findings: MuseFinding[];
  nextSteps: string[];
  requestId: string | null;
}): Promise<IdeaFactoryFinding> {
  const [finding] = await getDb()
    .update(ideaFactoryFindings)
    .set({
      status: "COMPLETED",
      verdict: input.verdict,
      summary: input.summary,
      findings: input.findings,
      nextSteps: input.nextSteps,
      requestId: input.requestId,
      error: null,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(ideaFactoryFindings.evaluationId, input.evaluationId),
        eq(ideaFactoryFindings.agentSlug, input.agentSlug),
      ),
    )
    .returning();
  if (!finding) {
    throw new Error("The finding could not be saved.");
  }
  return finding;
}

export async function failFinding(input: {
  evaluationId: string;
  agentSlug: string;
  error: string;
  requestId: string | null;
}): Promise<IdeaFactoryFinding> {
  const [finding] = await getDb()
    .update(ideaFactoryFindings)
    .set({
      status: "FAILED",
      error: input.error,
      requestId: input.requestId,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(ideaFactoryFindings.evaluationId, input.evaluationId),
        eq(ideaFactoryFindings.agentSlug, input.agentSlug),
      ),
    )
    .returning();
  if (!finding) {
    throw new Error("The finding could not be updated.");
  }
  return finding;
}

export async function completeEvaluation(input: {
  evaluationId: string;
  synthesis: MuseSynthesis;
  requestId: string | null;
}): Promise<void> {
  await getDb()
    .update(ideaFactoryEvaluations)
    .set({
      status: "COMPLETED",
      synthesis: input.synthesis,
      synthesisRequestId: input.requestId,
      error: null,
      completedAt: new Date(),
    })
    .where(eq(ideaFactoryEvaluations.id, input.evaluationId));
}

export async function failEvaluation(input: {
  evaluationId: string;
  error: string;
  requestId: string | null;
}): Promise<void> {
  await getDb()
    .update(ideaFactoryEvaluations)
    .set({
      status: "FAILED",
      error: input.error,
      synthesisRequestId: input.requestId,
      completedAt: new Date(),
    })
    .where(eq(ideaFactoryEvaluations.id, input.evaluationId));
}

// ---------------------------------------------------------------------------
// Request log
// ---------------------------------------------------------------------------

export async function logMuseRequest(
  input: NewMuseRequest,
): Promise<MuseRequest> {
  const [request] = await getDb().insert(museRequests).values(input).returning();
  if (!request) {
    throw new Error("The request could not be logged.");
  }
  return request;
}

const summaryColumns = {
  id: true,
  ideaId: true,
  clerkUserId: true,
  agentSlug: true,
  purpose: true,
  model: true,
  endpoint: true,
  statusCode: true,
  inputTokens: true,
  cachedTokens: true,
  outputTokens: true,
  reasoningTokens: true,
  totalTokens: true,
  webSearchCalls: true,
  estimatedCostMicros: true,
  durationMs: true,
  rateLimitRemainingTokens: true,
  rateLimitRemainingRequests: true,
  error: true,
  createdAt: true,
} as const;

export async function listMuseRequests(
  ideaId: string,
): Promise<MuseRequestSummary[]> {
  return getDb().query.museRequests.findMany({
    where: eq(museRequests.ideaId, ideaId),
    orderBy: [desc(museRequests.createdAt)],
    limit: REQUEST_LOG_LIMIT,
    columns: summaryColumns,
  });
}

export async function getMuseRequest(
  id: string,
  ideaId: string,
): Promise<MuseRequest | null> {
  const request = await getDb().query.museRequests.findFirst({
    where: and(eq(museRequests.id, id), eq(museRequests.ideaId, ideaId)),
  });
  return request ?? null;
}

/** Totals for one member on one idea: their own Meta account's spend. */
export async function sumMuseUsage(
  ideaId: string,
  clerkUserId: string,
): Promise<MuseUsageTotals> {
  const [row] = await getDb()
    .select({
      requests: sql<number>`count(*)::int`,
      inputTokens: sql<number>`coalesce(sum(${museRequests.inputTokens}), 0)::int`,
      cachedTokens: sql<number>`coalesce(sum(${museRequests.cachedTokens}), 0)::int`,
      outputTokens: sql<number>`coalesce(sum(${museRequests.outputTokens}), 0)::int`,
      totalTokens: sql<number>`coalesce(sum(${museRequests.totalTokens}), 0)::int`,
      webSearchCalls: sql<number>`coalesce(sum(${museRequests.webSearchCalls}), 0)::int`,
      estimatedCostMicros: sql<number>`coalesce(sum(${museRequests.estimatedCostMicros}), 0)::bigint`,
    })
    .from(museRequests)
    .where(
      and(
        eq(museRequests.ideaId, ideaId),
        eq(museRequests.clerkUserId, clerkUserId),
      ),
    );

  return {
    requests: Number(row?.requests ?? 0),
    inputTokens: Number(row?.inputTokens ?? 0),
    cachedTokens: Number(row?.cachedTokens ?? 0),
    outputTokens: Number(row?.outputTokens ?? 0),
    totalTokens: Number(row?.totalTokens ?? 0),
    webSearchCalls: Number(row?.webSearchCalls ?? 0),
    estimatedCostMicros: Number(row?.estimatedCostMicros ?? 0),
  };
}
