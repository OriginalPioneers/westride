// ---------------------------------------------------------------------------
// Build Studio: agent runs, their event streams, and ticket comments.
// ---------------------------------------------------------------------------
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import {
  agentRunEvents,
  agentRuns,
  ticketComments,
  type AgentRun,
  type AgentRunEvent,
  type AgentRunStatus,
  type TicketComment,
} from "./build-schema";
import { getDb } from "./client";

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function listTicketComments(ticketId: string): Promise<TicketComment[]> {
  return getDb().query.ticketComments.findMany({
    where: eq(ticketComments.ticketId, ticketId),
    orderBy: [asc(ticketComments.createdAt)],
  });
}

export async function addTicketComment(input: {
  ticketId: string;
  authorClerkUserId: string | null;
  agentRunId?: string | null;
  body: string;
}): Promise<TicketComment> {
  const [comment] = await getDb()
    .insert(ticketComments)
    .values({
      ticketId: input.ticketId,
      authorClerkUserId: input.authorClerkUserId,
      agentRunId: input.agentRunId ?? null,
      body: input.body,
    })
    .returning();
  if (!comment) {
    throw new Error("The comment could not be saved.");
  }
  return comment;
}

/** Deletes a comment the author wrote. Returns false when it is not theirs. */
export async function deleteOwnTicketComment(
  commentId: string,
  authorClerkUserId: string,
): Promise<boolean> {
  const removed = await getDb()
    .delete(ticketComments)
    .where(
      and(
        eq(ticketComments.id, commentId),
        eq(ticketComments.authorClerkUserId, authorClerkUserId),
      ),
    )
    .returning({ id: ticketComments.id });
  return removed.length > 0;
}

// ---------------------------------------------------------------------------
// Agent runs
// ---------------------------------------------------------------------------

export const ACTIVE_RUN_STATUSES: readonly AgentRunStatus[] = ["QUEUED", "RUNNING"];

export function isRunActive(status: AgentRunStatus): boolean {
  return ACTIVE_RUN_STATUSES.includes(status);
}

export type NewAgentRunInput = {
  projectId: string;
  ticketId: string;
  repoId: string | null;
  repoFullName: string;
  startedByClerkUserId: string;
  branch: string;
  baseBranch: string;
  model: string;
  maxSteps: number;
  callbackTokenHash: string;
};

export async function createAgentRun(input: NewAgentRunInput): Promise<AgentRun> {
  const [run] = await getDb().insert(agentRuns).values(input).returning();
  if (!run) {
    throw new Error("The run could not be saved.");
  }
  return run;
}

export async function getAgentRun(runId: string): Promise<AgentRun | null> {
  const run = await getDb().query.agentRuns.findFirst({ where: eq(agentRuns.id, runId) });
  return run ?? null;
}

export async function listAgentRunsForTicket(ticketId: string): Promise<AgentRun[]> {
  return getDb().query.agentRuns.findMany({
    where: eq(agentRuns.ticketId, ticketId),
    orderBy: [desc(agentRuns.createdAt)],
  });
}

export async function listAgentRunsForProject(
  projectId: string,
  limit = 50,
): Promise<AgentRun[]> {
  return getDb().query.agentRuns.findMany({
    where: eq(agentRuns.projectId, projectId),
    orderBy: [desc(agentRuns.createdAt)],
    limit,
  });
}

/** The run still going on a ticket, if any. At most one is allowed. */
export async function getActiveRunForTicket(ticketId: string): Promise<AgentRun | null> {
  const run = await getDb().query.agentRuns.findFirst({
    where: and(
      eq(agentRuns.ticketId, ticketId),
      inArray(agentRuns.status, [...ACTIVE_RUN_STATUSES]),
    ),
    orderBy: [desc(agentRuns.createdAt)],
  });
  return run ?? null;
}

export async function countActiveRunsForProject(projectId: string): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(agentRuns)
    .where(
      and(
        eq(agentRuns.projectId, projectId),
        inArray(agentRuns.status, [...ACTIVE_RUN_STATUSES]),
      ),
    );
  return Number(row?.count ?? 0);
}

export type AgentRunPatch = Partial<
  Pick<
    AgentRun,
    | "status"
    | "sandboxName"
    | "museSessionId"
    | "exitCode"
    | "headSha"
    | "prNumber"
    | "prUrl"
    | "summary"
    | "error"
    | "startedAt"
    | "finishedAt"
  >
>;

export async function updateAgentRun(runId: string, patch: AgentRunPatch): Promise<AgentRun | null> {
  const [run] = await getDb()
    .update(agentRuns)
    .set(patch)
    .where(eq(agentRuns.id, runId))
    .returning();
  return run ?? null;
}

export type AgentRunEventInput = {
  sequence: number;
  type: string;
  payload: unknown;
};

/**
 * Appends events from the sandbox. Repeats of a sequence number are ignored,
 * so a retried delivery never duplicates a line in the log.
 */
export async function appendAgentRunEvents(
  runId: string,
  events: AgentRunEventInput[],
): Promise<number> {
  if (events.length === 0) {
    return 0;
  }
  const db = getDb();
  const inserted = await db
    .insert(agentRunEvents)
    .values(events.map((event) => ({ runId, ...event })))
    .onConflictDoNothing({ target: [agentRunEvents.runId, agentRunEvents.sequence] })
    .returning({ id: agentRunEvents.id });
  if (inserted.length > 0) {
    await db
      .update(agentRuns)
      .set({
        eventCount: sql`${agentRuns.eventCount} + ${inserted.length}`,
        lastEventAt: new Date(),
      })
      .where(eq(agentRuns.id, runId));
  }
  return inserted.length;
}

/** Events after a sequence number, oldest first. Used for live polling. */
export async function listAgentRunEvents(
  runId: string,
  afterSequence = -1,
  limit = 500,
): Promise<AgentRunEvent[]> {
  return getDb().query.agentRunEvents.findMany({
    where: and(eq(agentRunEvents.runId, runId), gt(agentRunEvents.sequence, afterSequence)),
    orderBy: [asc(agentRunEvents.sequence)],
    limit,
  });
}
