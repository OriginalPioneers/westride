// ---------------------------------------------------------------------------
// Agent Studio: agents, their tickets, jobs, job events, and log.
// ---------------------------------------------------------------------------
import { and, asc, desc, eq, gt, inArray, isNotNull, lte, ne, or, sql, type SQL } from "drizzle-orm";
import {
  EMPTY_TICKET_COUNTS,
  EMPTY_USAGE_TOTALS,
  isTicketStatus,
  nextScheduledRunAt,
  ticketStatusChange,
  type TicketCounts,
  type UsageTotals,
} from "./agent-rules";
import {
  agentJobEvents,
  agentJobs,
  agentLogEntries,
  agentTickets,
  agents,
  type Agent,
  type AgentJob,
  type AgentJobEvent,
  type AgentJobKind,
  type AgentJobTrigger,
  type AgentLogEntry,
  type AgentSchedule,
  type AgentStatus,
  type AgentTicket,
  type AgentTicketSource,
  type RunnerKind,
} from "./agent-schema";
import { projectMembers, projects, type AgentRunStatus, type TicketPriority, type TicketStatus } from "./build-schema";
import { getDb } from "./client";
import { ideaMembers, ideas } from "./schema";

export type AgentViewer = { clerkUserId: string | null };

const ANYONE: AgentViewer = { clerkUserId: null };

export type AgentLink = { id: string; name: string };

export type AgentWithDetails = Agent & {
  idea: AgentLink | null;
  project: AgentLink | null;
  ticketCounts: TicketCounts;
  usage: UsageTotals;
  activeJobs: number;
};

/** What the viewer may do. Owners manage settings; collaborators work tickets and run jobs. */
export type AgentRole = "OWNER" | "COLLABORATOR";

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

function memberProjectIds(clerkUserId: string) {
  return getDb()
    .select({ id: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.clerkUserId, clerkUserId));
}

function memberIdeaIds(clerkUserId: string) {
  return getDb()
    .select({ id: ideaMembers.ideaId })
    .from(ideaMembers)
    .where(eq(ideaMembers.clerkUserId, clerkUserId));
}

function visibilityCondition(viewer: AgentViewer): SQL {
  const isPublic = eq(agents.isPublic, true);
  if (!viewer.clerkUserId) {
    return isPublic;
  }
  return (
    or(
      isPublic,
      eq(agents.ownerClerkUserId, viewer.clerkUserId),
      inArray(agents.projectId, memberProjectIds(viewer.clerkUserId)),
      inArray(agents.ideaId, memberIdeaIds(viewer.clerkUserId)),
    ) ?? isPublic
  );
}

export async function getAgentRole(
  agent: Pick<Agent, "ownerClerkUserId" | "projectId" | "ideaId">,
  clerkUserId: string | null,
): Promise<AgentRole | null> {
  if (!clerkUserId) {
    return null;
  }
  if (agent.ownerClerkUserId === clerkUserId) {
    return "OWNER";
  }
  const db = getDb();
  if (agent.projectId) {
    const row = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, agent.projectId),
        eq(projectMembers.clerkUserId, clerkUserId),
      ),
      columns: { role: true },
    });
    if (row) {
      return "COLLABORATOR";
    }
  }
  if (agent.ideaId) {
    const row = await db.query.ideaMembers.findFirst({
      where: and(eq(ideaMembers.ideaId, agent.ideaId), eq(ideaMembers.clerkUserId, clerkUserId)),
      columns: { role: true },
    });
    if (row) {
      return "COLLABORATOR";
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

async function countTicketsByAgent(agentIds: string[]): Promise<Map<string, TicketCounts>> {
  const counts = new Map(agentIds.map((id) => [id, { ...EMPTY_TICKET_COUNTS }]));
  if (agentIds.length === 0) {
    return counts;
  }
  const rows = await getDb()
    .select({
      agentId: agentTickets.agentId,
      status: agentTickets.status,
      count: sql<number>`count(*)::int`,
    })
    .from(agentTickets)
    .where(inArray(agentTickets.agentId, agentIds))
    .groupBy(agentTickets.agentId, agentTickets.status);
  for (const row of rows) {
    const entry = counts.get(row.agentId);
    if (entry && isTicketStatus(row.status)) {
      entry[row.status] = Number(row.count);
    }
  }
  return counts;
}

const usageColumns = {
  jobs: sql<number>`count(*)::int`,
  modelCalls: sql<number>`coalesce(sum(${agentJobs.modelCalls}), 0)::int`,
  inputTokens: sql<number>`coalesce(sum(${agentJobs.inputTokens}), 0)::bigint`,
  cachedTokens: sql<number>`coalesce(sum(${agentJobs.cachedTokens}), 0)::bigint`,
  outputTokens: sql<number>`coalesce(sum(${agentJobs.outputTokens}), 0)::bigint`,
  reasoningTokens: sql<number>`coalesce(sum(${agentJobs.reasoningTokens}), 0)::bigint`,
  totalTokens: sql<number>`coalesce(sum(${agentJobs.totalTokens}), 0)::bigint`,
  estimatedCostMicros: sql<number>`coalesce(sum(${agentJobs.estimatedCostMicros}), 0)::bigint`,
};

function toUsage(row: Record<keyof typeof usageColumns, unknown> | undefined): UsageTotals {
  return {
    jobs: Number(row?.jobs ?? 0),
    modelCalls: Number(row?.modelCalls ?? 0),
    inputTokens: Number(row?.inputTokens ?? 0),
    cachedTokens: Number(row?.cachedTokens ?? 0),
    outputTokens: Number(row?.outputTokens ?? 0),
    reasoningTokens: Number(row?.reasoningTokens ?? 0),
    totalTokens: Number(row?.totalTokens ?? 0),
    estimatedCostMicros: Number(row?.estimatedCostMicros ?? 0),
  };
}

async function usageByAgent(agentIds: string[]): Promise<Map<string, UsageTotals>> {
  const usage = new Map(agentIds.map((id) => [id, { ...EMPTY_USAGE_TOTALS }]));
  if (agentIds.length === 0) {
    return usage;
  }
  const rows = await getDb()
    .select({ agentId: agentJobs.agentId, ...usageColumns })
    .from(agentJobs)
    .where(inArray(agentJobs.agentId, agentIds))
    .groupBy(agentJobs.agentId);
  for (const row of rows) {
    usage.set(row.agentId, toUsage(row));
  }
  return usage;
}

export const ACTIVE_JOB_STATUSES: readonly AgentRunStatus[] = ["QUEUED", "RUNNING"];

export function isJobActive(status: AgentRunStatus): boolean {
  return ACTIVE_JOB_STATUSES.includes(status);
}

async function activeJobsByAgent(agentIds: string[]): Promise<Map<string, number>> {
  const counts = new Map(agentIds.map((id) => [id, 0]));
  if (agentIds.length === 0) {
    return counts;
  }
  const rows = await getDb()
    .select({ agentId: agentJobs.agentId, count: sql<number>`count(*)::int` })
    .from(agentJobs)
    .where(
      and(
        inArray(agentJobs.agentId, agentIds),
        inArray(agentJobs.status, [...ACTIVE_JOB_STATUSES]),
      ),
    )
    .groupBy(agentJobs.agentId);
  for (const row of rows) {
    counts.set(row.agentId, Number(row.count));
  }
  return counts;
}

async function findAgents(where: SQL | undefined, limit?: number): Promise<AgentWithDetails[]> {
  const rows = await getDb().query.agents.findMany({
    where,
    orderBy: [desc(agents.updatedAt), asc(agents.name)],
    limit,
    with: {
      idea: { columns: { id: true, name: true } },
      project: { columns: { id: true, name: true } },
    },
  });
  const ids = rows.map((row) => row.id);
  const [counts, usage, active] = await Promise.all([
    countTicketsByAgent(ids),
    usageByAgent(ids),
    activeJobsByAgent(ids),
  ]);
  return rows.map((row) => ({
    ...row,
    idea: row.idea ?? null,
    project: row.project ?? null,
    ticketCounts: counts.get(row.id) ?? { ...EMPTY_TICKET_COUNTS },
    usage: usage.get(row.id) ?? { ...EMPTY_USAGE_TOTALS },
    activeJobs: active.get(row.id) ?? 0,
  }));
}

/** Every agent the viewer may see, most recently updated first. Archived ones included. */
export async function listAgents(viewer: AgentViewer = ANYONE): Promise<AgentWithDetails[]> {
  return findAgents(visibilityCondition(viewer));
}

export async function listAgentsForProject(
  projectId: string,
  viewer: AgentViewer = ANYONE,
): Promise<AgentWithDetails[]> {
  return findAgents(and(eq(agents.projectId, projectId), visibilityCondition(viewer)));
}

export async function listAgentsForIdea(
  ideaId: string,
  viewer: AgentViewer = ANYONE,
): Promise<AgentWithDetails[]> {
  return findAgents(and(eq(agents.ideaId, ideaId), visibilityCondition(viewer)));
}

export async function getAgent(
  id: string,
  viewer: AgentViewer = ANYONE,
): Promise<AgentWithDetails | null> {
  const [agent] = await findAgents(and(eq(agents.id, id), visibilityCondition(viewer)), 1);
  return agent ?? null;
}

/** The bare row, with no visibility check. For server-side work on the agent's behalf. */
export async function getAgentRow(id: string): Promise<Agent | null> {
  const row = await getDb().query.agents.findFirst({ where: eq(agents.id, id) });
  return row ?? null;
}

export type AgentRepoInput = {
  repoId: number;
  owner: string;
  name: string;
  htmlUrl: string;
  defaultBranch: string;
  isPrivate: boolean;
};

export type AgentScheduleInput = {
  schedule: AgentSchedule;
  scheduleHourUtc: number | null;
  scheduleWeekday: number | null;
  standingTask: string;
};

export type AgentInput = {
  name: string;
  description: string;
  instructions: string;
  isPublic: boolean;
  ideaId: string | null;
  projectId: string | null;
  model: string;
  maxSteps: number;
  allowSponsorTokens: boolean;
  allowVolunteerCompute: boolean;
  volunteerLocalModel: string | null;
  repo: AgentRepoInput | null;
} & AgentScheduleInput;

function repoColumns(repo: AgentRepoInput | null) {
  return {
    repoId: repo?.repoId ?? null,
    repoOwner: repo?.owner ?? null,
    repoName: repo?.name ?? null,
    repoHtmlUrl: repo?.htmlUrl ?? null,
    repoDefaultBranch: repo?.defaultBranch ?? null,
    repoIsPrivate: repo?.isPrivate ?? null,
  };
}

function scheduleColumns(input: AgentScheduleInput, status: AgentStatus, from = new Date()) {
  const spec = {
    schedule: input.schedule,
    scheduleHourUtc: input.schedule === "HOURLY" || input.schedule === "NONE" ? null : input.scheduleHourUtc,
    scheduleWeekday: input.schedule === "WEEKLY" ? input.scheduleWeekday : null,
  };
  return {
    ...spec,
    standingTask: input.standingTask,
    nextRunAt: status === "ACTIVE" ? nextScheduledRunAt(spec, from) : null,
  };
}

export async function createAgent(
  ownerClerkUserId: string,
  input: AgentInput,
): Promise<{ id: string }> {
  const [created] = await getDb()
    .insert(agents)
    .values({
      name: input.name,
      description: input.description,
      instructions: input.instructions,
      isPublic: input.isPublic,
      ownerClerkUserId,
      ideaId: input.ideaId,
      projectId: input.projectId,
      model: input.model,
      maxSteps: input.maxSteps,
      allowSponsorTokens: input.allowSponsorTokens,
      allowVolunteerCompute: input.allowVolunteerCompute,
      volunteerLocalModel: input.volunteerLocalModel,
      ...repoColumns(input.repo),
      ...scheduleColumns(input, "ACTIVE"),
    })
    .returning({ id: agents.id });
  if (!created) {
    throw new Error("The agent could not be saved.");
  }
  return created;
}

export type AgentDetailsPatch = Omit<AgentInput, keyof AgentScheduleInput | "repo">;

export async function updateAgentDetails(id: string, input: AgentDetailsPatch): Promise<void> {
  await getDb()
    .update(agents)
    .set({
      name: input.name,
      description: input.description,
      instructions: input.instructions,
      isPublic: input.isPublic,
      ideaId: input.ideaId,
      projectId: input.projectId,
      model: input.model,
      maxSteps: input.maxSteps,
      allowSponsorTokens: input.allowSponsorTokens,
      allowVolunteerCompute: input.allowVolunteerCompute,
      volunteerLocalModel: input.volunteerLocalModel,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id));
}

export async function updateAgentRepo(id: string, repo: AgentRepoInput | null): Promise<void> {
  await getDb()
    .update(agents)
    .set({ ...repoColumns(repo), updatedAt: new Date() })
    .where(eq(agents.id, id));
}

export async function updateAgentSchedule(
  id: string,
  status: AgentStatus,
  input: AgentScheduleInput,
): Promise<Date | null> {
  const columns = scheduleColumns(input, status);
  await getDb()
    .update(agents)
    .set({ ...columns, updatedAt: new Date() })
    .where(eq(agents.id, id));
  return columns.nextRunAt;
}

/** Pausing clears the next run; resuming computes it again from now. */
export async function setAgentStatus(agent: Agent, status: AgentStatus): Promise<void> {
  const nextRunAt =
    status === "ACTIVE"
      ? nextScheduledRunAt({
          schedule: agent.schedule,
          scheduleHourUtc: agent.scheduleHourUtc,
          scheduleWeekday: agent.scheduleWeekday,
        })
      : null;
  await getDb()
    .update(agents)
    .set({ status, nextRunAt, updatedAt: new Date() })
    .where(eq(agents.id, agent.id));
}

export async function deleteAgent(id: string): Promise<boolean> {
  const removed = await getDb().delete(agents).where(eq(agents.id, id)).returning({ id: agents.id });
  return removed.length > 0;
}

async function touchAgent(agentId: string): Promise<void> {
  await getDb().update(agents).set({ updatedAt: new Date() }).where(eq(agents.id, agentId));
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

/**
 * Agents whose next run is due. Each one is claimed by moving its next run
 * forward in the same statement that reads it, so two ticks never run the
 * same slot twice. Returns the claimed agents with the slot they are for.
 */
export async function claimDueAgents(
  now: Date = new Date(),
  limit = 5,
): Promise<{ agent: Agent; dueAt: Date }[]> {
  const db = getDb();
  const due = await db.query.agents.findMany({
    where: and(
      eq(agents.status, "ACTIVE"),
      ne(agents.schedule, "NONE"),
      isNotNull(agents.nextRunAt),
      lte(agents.nextRunAt, now),
    ),
    orderBy: [asc(agents.nextRunAt)],
    limit,
  });
  const claimed: { agent: Agent; dueAt: Date }[] = [];
  for (const agent of due) {
    const dueAt = agent.nextRunAt!;
    const next = nextScheduledRunAt(
      {
        schedule: agent.schedule,
        scheduleHourUtc: agent.scheduleHourUtc,
        scheduleWeekday: agent.scheduleWeekday,
      },
      now,
    );
    const [row] = await db
      .update(agents)
      .set({ nextRunAt: next, lastRunAt: now })
      .where(and(eq(agents.id, agent.id), eq(agents.nextRunAt, dueAt)))
      .returning();
    if (row) {
      claimed.push({ agent: row, dueAt });
    }
  }
  return claimed;
}

/** Whether any agent is due, so a page can decide to tick without the full claim. */
export async function hasDueAgents(now: Date = new Date()): Promise<boolean> {
  const row = await getDb().query.agents.findFirst({
    where: and(
      eq(agents.status, "ACTIVE"),
      ne(agents.schedule, "NONE"),
      isNotNull(agents.nextRunAt),
      lte(agents.nextRunAt, now),
    ),
    columns: { id: true },
  });
  return row !== undefined;
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

/** Oldest-created first inside each status, after the manual order. */
export async function listAgentTickets(agentId: string): Promise<AgentTicket[]> {
  return getDb().query.agentTickets.findMany({
    where: eq(agentTickets.agentId, agentId),
    orderBy: [asc(agentTickets.sortOrder), asc(agentTickets.createdAt)],
  });
}

export async function getAgentTicket(agentId: string, number: number): Promise<AgentTicket | null> {
  const ticket = await getDb().query.agentTickets.findFirst({
    where: and(eq(agentTickets.agentId, agentId), eq(agentTickets.number, number)),
  });
  return ticket ?? null;
}

export async function getAgentTicketById(id: string): Promise<AgentTicket | null> {
  const ticket = await getDb().query.agentTickets.findFirst({ where: eq(agentTickets.id, id) });
  return ticket ?? null;
}

const PRIORITY_RANK: Record<TicketPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

/** The ticket a scheduled wake-up picks: highest priority, then queue order. */
export async function nextQueuedAgentTicket(agentId: string): Promise<AgentTicket | null> {
  const backlog = await getDb().query.agentTickets.findMany({
    where: and(eq(agentTickets.agentId, agentId), eq(agentTickets.status, "BACKLOG")),
    orderBy: [asc(agentTickets.sortOrder), asc(agentTickets.createdAt)],
    limit: 50,
  });
  backlog.sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      a.sortOrder - b.sortOrder ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );
  return backlog[0] ?? null;
}

export type AgentTicketInput = {
  title: string;
  description: string;
  priority: TicketPriority;
};

async function nextAgentTicketNumber(agentId: string): Promise<number> {
  const [row] = await getDb()
    .update(agents)
    .set({ nextTicketNumber: sql`${agents.nextTicketNumber} + 1`, updatedAt: new Date() })
    .where(eq(agents.id, agentId))
    .returning({ next: agents.nextTicketNumber });
  if (!row) {
    throw new Error(`Unknown agent: ${agentId}`);
  }
  return row.next - 1;
}

/** New tickets join the end of the queue. */
async function bottomSortOrder(agentId: string, status: TicketStatus): Promise<number> {
  const [row] = await getDb()
    .select({ max: sql<number | null>`max(${agentTickets.sortOrder})` })
    .from(agentTickets)
    .where(and(eq(agentTickets.agentId, agentId), eq(agentTickets.status, status)));
  const max = row?.max;
  return max === null || max === undefined ? 0 : Number(max) + 1;
}

export async function createAgentTicket(
  agentId: string,
  input: AgentTicketInput & {
    source?: AgentTicketSource;
    createdByClerkUserId: string | null;
  },
): Promise<AgentTicket> {
  const [number, sortOrder] = await Promise.all([
    nextAgentTicketNumber(agentId),
    bottomSortOrder(agentId, "BACKLOG"),
  ]);
  const [created] = await getDb()
    .insert(agentTickets)
    .values({
      agentId,
      number,
      title: input.title,
      description: input.description,
      priority: input.priority,
      source: input.source ?? "MEMBER",
      createdByClerkUserId: input.createdByClerkUserId,
      sortOrder,
    })
    .returning();
  if (!created) {
    throw new Error("The ticket could not be saved.");
  }
  return created;
}

export async function updateAgentTicket(
  agentId: string,
  ticketId: string,
  input: AgentTicketInput,
): Promise<AgentTicket | null> {
  const [updated] = await getDb()
    .update(agentTickets)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(agentTickets.id, ticketId), eq(agentTickets.agentId, agentId)))
    .returning();
  if (updated) {
    await touchAgent(agentId);
  }
  return updated ?? null;
}

/** Moves a ticket to a status, at the end of that column. BLOCKED needs a reason. */
export async function moveAgentTicket(
  agentId: string,
  ticketId: string,
  status: TicketStatus,
  blockedReason?: string | null,
): Promise<AgentTicket | null> {
  const db = getDb();
  const current = await db.query.agentTickets.findFirst({
    where: and(eq(agentTickets.id, ticketId), eq(agentTickets.agentId, agentId)),
    columns: { status: true, completedAt: true },
  });
  if (!current) {
    return null;
  }
  const change = ticketStatusChange(current, status, blockedReason);
  const sortOrder =
    current.status === status ? undefined : await bottomSortOrder(agentId, status);
  const [updated] = await db
    .update(agentTickets)
    .set({ ...change, sortOrder, updatedAt: new Date() })
    .where(eq(agentTickets.id, ticketId))
    .returning();
  await touchAgent(agentId);
  return updated ?? null;
}

export async function deleteAgentTicket(agentId: string, ticketId: string): Promise<boolean> {
  const removed = await getDb()
    .delete(agentTickets)
    .where(and(eq(agentTickets.id, ticketId), eq(agentTickets.agentId, agentId)))
    .returning({ id: agentTickets.id });
  if (removed.length > 0) {
    await touchAgent(agentId);
  }
  return removed.length > 0;
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export type NewAgentJobInput = {
  agentId: string;
  ticketId: string;
  ticketTitle: string;
  trigger: AgentJobTrigger;
  kind: AgentJobKind;
  startedByClerkUserId: string | null;
  paidByClerkUserId: string;
  model: string;
  maxSteps: number;
  pledgeId?: string | null;
  runnerKind?: RunnerKind | null;
  prompt?: string | null;
  repoFullName?: string | null;
  branch?: string | null;
  baseBranch?: string | null;
  callbackTokenHash?: string | null;
};

export async function createAgentJob(input: NewAgentJobInput): Promise<AgentJob> {
  const [job] = await getDb().insert(agentJobs).values(input).returning();
  if (!job) {
    throw new Error("The job could not be saved.");
  }
  return job;
}

export async function getAgentJob(jobId: string): Promise<AgentJob | null> {
  const job = await getDb().query.agentJobs.findFirst({ where: eq(agentJobs.id, jobId) });
  return job ?? null;
}

export async function listAgentJobs(agentId: string, limit = 100): Promise<AgentJob[]> {
  return getDb().query.agentJobs.findMany({
    where: eq(agentJobs.agentId, agentId),
    orderBy: [desc(agentJobs.createdAt)],
    limit,
  });
}

export async function listAgentJobsForTicket(ticketId: string): Promise<AgentJob[]> {
  return getDb().query.agentJobs.findMany({
    where: eq(agentJobs.ticketId, ticketId),
    orderBy: [desc(agentJobs.createdAt)],
  });
}

/** Active jobs across the agents a member pays for. For the studio header. */
export async function listActiveJobsForPayer(clerkUserId: string): Promise<AgentJob[]> {
  return getDb().query.agentJobs.findMany({
    where: and(
      eq(agentJobs.paidByClerkUserId, clerkUserId),
      inArray(agentJobs.status, [...ACTIVE_JOB_STATUSES]),
    ),
    orderBy: [desc(agentJobs.createdAt)],
  });
}

export async function getActiveJobForTicket(ticketId: string): Promise<AgentJob | null> {
  const job = await getDb().query.agentJobs.findFirst({
    where: and(eq(agentJobs.ticketId, ticketId), inArray(agentJobs.status, [...ACTIVE_JOB_STATUSES])),
    orderBy: [desc(agentJobs.createdAt)],
  });
  return job ?? null;
}

export async function countActiveJobsForAgent(agentId: string): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(agentJobs)
    .where(and(eq(agentJobs.agentId, agentId), inArray(agentJobs.status, [...ACTIVE_JOB_STATUSES])));
  return Number(row?.count ?? 0);
}

export type AgentJobUsagePatch = Pick<
  AgentJob,
  | "modelCalls"
  | "inputTokens"
  | "cachedTokens"
  | "outputTokens"
  | "reasoningTokens"
  | "totalTokens"
  | "estimatedCostMicros"
>;

export type AgentJobPatch = Partial<
  Pick<
    AgentJob,
    | "status"
    | "sandboxName"
    | "museSessionId"
    | "museRequestId"
    | "exitCode"
    | "headSha"
    | "prNumber"
    | "prUrl"
    | "summary"
    | "error"
    | "startedAt"
    | "finishedAt"
    | "deviceId"
    | "leaseExpiresAt"
    | "callbackTokenHash"
    | "prompt"
    | "paidByClerkUserId"
    | "pledgeId"
  > &
    AgentJobUsagePatch
>;

export async function updateAgentJob(jobId: string, patch: AgentJobPatch): Promise<AgentJob | null> {
  const [job] = await getDb().update(agentJobs).set(patch).where(eq(agentJobs.id, jobId)).returning();
  return job ?? null;
}

export type AgentJobEventInput = { sequence: number; type: string; payload: unknown };

/** Appends events. Repeats of a sequence number are ignored. */
export async function appendAgentJobEvents(jobId: string, events: AgentJobEventInput[]): Promise<number> {
  if (events.length === 0) {
    return 0;
  }
  const db = getDb();
  const inserted = await db
    .insert(agentJobEvents)
    .values(events.map((event) => ({ jobId, ...event })))
    .onConflictDoNothing({ target: [agentJobEvents.jobId, agentJobEvents.sequence] })
    .returning({ id: agentJobEvents.id });
  if (inserted.length > 0) {
    await db
      .update(agentJobs)
      .set({ eventCount: sql`${agentJobs.eventCount} + ${inserted.length}`, lastEventAt: new Date() })
      .where(eq(agentJobs.id, jobId));
  }
  return inserted.length;
}

export async function listAgentJobEvents(
  jobId: string,
  afterSequence = -1,
  limit = 500,
): Promise<AgentJobEvent[]> {
  return getDb().query.agentJobEvents.findMany({
    where: and(eq(agentJobEvents.jobId, jobId), gt(agentJobEvents.sequence, afterSequence)),
    orderBy: [asc(agentJobEvents.sequence)],
    limit,
  });
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

export async function sumAgentUsage(agentId: string): Promise<UsageTotals> {
  const [row] = await getDb().select(usageColumns).from(agentJobs).where(eq(agentJobs.agentId, agentId));
  return toUsage(row);
}

/** Everything a member's Meta key has paid for across every agent. */
export async function sumUsageForPayer(clerkUserId: string): Promise<UsageTotals> {
  const [row] = await getDb()
    .select(usageColumns)
    .from(agentJobs)
    .where(eq(agentJobs.paidByClerkUserId, clerkUserId));
  return toUsage(row);
}

export type UsageBreakdownRow = UsageTotals & { key: string };

export async function sumAgentUsageByModel(agentId: string): Promise<UsageBreakdownRow[]> {
  const rows = await getDb()
    .select({ key: agentJobs.model, ...usageColumns })
    .from(agentJobs)
    .where(eq(agentJobs.agentId, agentId))
    .groupBy(agentJobs.model)
    .orderBy(desc(sql`sum(${agentJobs.estimatedCostMicros})`));
  return rows.map((row) => ({ key: row.key, ...toUsage(row) }));
}

export async function sumAgentUsageByTrigger(agentId: string): Promise<UsageBreakdownRow[]> {
  const rows = await getDb()
    .select({ key: agentJobs.trigger, ...usageColumns })
    .from(agentJobs)
    .where(eq(agentJobs.agentId, agentId))
    .groupBy(agentJobs.trigger);
  return rows.map((row) => ({ key: row.key, ...toUsage(row) }));
}

/** Per-day spend for the last `days` days, oldest first. Days with no jobs are omitted. */
export async function sumAgentUsageByDay(agentId: string, days = 30): Promise<UsageBreakdownRow[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const day = sql<string>`to_char(date_trunc('day', ${agentJobs.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`;
  const rows = await getDb()
    .select({ key: day, ...usageColumns })
    .from(agentJobs)
    .where(and(eq(agentJobs.agentId, agentId), gt(agentJobs.createdAt, since)))
    .groupBy(day)
    .orderBy(asc(day));
  return rows.map((row) => ({ key: row.key, ...toUsage(row) }));
}

// ---------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------

export type AgentLogInput = {
  kind: "agent" | "ticket" | "job" | "schedule" | "settings";
  message: string;
  ticketId?: string | null;
  jobId?: string | null;
  actorClerkUserId?: string | null;
};

export async function addAgentLog(agentId: string, input: AgentLogInput): Promise<AgentLogEntry> {
  const [entry] = await getDb()
    .insert(agentLogEntries)
    .values({
      agentId,
      kind: input.kind,
      message: input.message,
      ticketId: input.ticketId ?? null,
      jobId: input.jobId ?? null,
      actorClerkUserId: input.actorClerkUserId ?? null,
    })
    .returning();
  if (!entry) {
    throw new Error("The log entry could not be saved.");
  }
  return entry;
}

export async function listAgentLog(agentId: string, limit = 200): Promise<AgentLogEntry[]> {
  return getDb().query.agentLogEntries.findMany({
    where: eq(agentLogEntries.agentId, agentId),
    orderBy: [desc(agentLogEntries.createdAt)],
    limit,
  });
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

/** Ideas and projects the member belongs to, for the link pickers. */
export async function listAgentLinkOptions(
  clerkUserId: string,
): Promise<{ ideas: AgentLink[]; projects: AgentLink[] }> {
  const db = getDb();
  const [ideaRows, projectRows] = await Promise.all([
    db
      .select({ id: ideas.id, name: ideas.name })
      .from(ideas)
      .where(inArray(ideas.id, memberIdeaIds(clerkUserId)))
      .orderBy(asc(ideas.name)),
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(inArray(projects.id, memberProjectIds(clerkUserId)))
      .orderBy(asc(projects.name)),
  ]);
  return { ideas: ideaRows, projects: projectRows };
}

export type AgentContextLink = { name: string; description: string };

/** The linked idea and project in the shape a job prompt wants. */
export async function getAgentContextLinks(
  agent: Pick<Agent, "ideaId" | "projectId">,
): Promise<{ idea: AgentContextLink | null; project: AgentContextLink | null }> {
  const db = getDb();
  const [idea, project] = await Promise.all([
    agent.ideaId
      ? db.query.ideas.findFirst({
          where: eq(ideas.id, agent.ideaId),
          columns: { name: true, description: true },
        })
      : null,
    agent.projectId
      ? db.query.projects.findFirst({
          where: eq(projects.id, agent.projectId),
          columns: { name: true, description: true },
        })
      : null,
  ]);
  return { idea: idea ?? null, project: project ?? null };
}

export {
  EMPTY_TICKET_COUNTS,
  EMPTY_USAGE_TOTALS,
  OPEN_TICKET_STATUSES,
  TICKET_STATUSES,
  addUsageTotals,
  agentTicketKey,
  describeSchedule,
  nextScheduledRunAt,
  ticketProgressPercent,
  totalTickets,
  type ScheduleSpec,
  type TicketCounts,
  type UsageTotals,
} from "./agent-rules";
