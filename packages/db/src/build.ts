import {
  and,
  asc,
  desc,
  eq,
  inArray,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import {
  EMPTY_TICKET_COUNTS,
  isTicketStatus,
  ticketStatusChange,
  type TicketCounts,
} from "./build-rules";
import {
  projectMembers,
  projectMilestones,
  projectRepos,
  projects,
  tickets,
  type MilestoneStatus,
  type Project,
  type ProjectMember,
  type ProjectMemberRole,
  type ProjectMilestone,
  type ProjectRepo,
  type ProjectStatus,
  type Ticket,
  type TicketPriority,
  type TicketSource,
  type TicketStatus,
} from "./build-schema";
import { getDb } from "./client";

export type ProjectWithDetails = Project & {
  members: ProjectMember[];
  repos: ProjectRepo[];
  milestones: ProjectMilestone[];
  ticketCounts: TicketCounts;
};

export type TicketWithDetails = Ticket & {
  milestone: ProjectMilestone | null;
  repo: ProjectRepo | null;
};

export type ProjectMemberInput = {
  clerkUserId: string;
  role: ProjectMemberRole;
};

/**
 * Who is looking. Public projects are visible to everyone; private projects
 * only to their members. `null` is a signed-out visitor.
 */
export type ProjectViewer = { clerkUserId: string | null };

const ANYONE: ProjectViewer = { clerkUserId: null };

const OWNER_REQUIRED = "Keep at least one owner.";

function visibilityCondition(viewer: ProjectViewer): SQL {
  const isPublic = eq(projects.isPublic, true);
  if (!viewer.clerkUserId) {
    return isPublic;
  }
  const memberOf = getDb()
    .select({ id: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.clerkUserId, viewer.clerkUserId));
  return or(isPublic, inArray(projects.id, memberOf)) ?? isPublic;
}

function dedupeMembers(members: ProjectMemberInput[]): ProjectMemberInput[] {
  const byUser = new Map<string, ProjectMemberInput>();
  for (const member of members) {
    const clerkUserId = member.clerkUserId.trim();
    if (clerkUserId) {
      byUser.set(clerkUserId, { clerkUserId, role: member.role });
    }
  }
  return [...byUser.values()];
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

async function countTicketsByProject(
  projectIds: string[],
): Promise<Map<string, TicketCounts>> {
  const counts = new Map(
    projectIds.map((id) => [id, { ...EMPTY_TICKET_COUNTS }]),
  );
  if (projectIds.length === 0) {
    return counts;
  }
  const rows = await getDb()
    .select({
      projectId: tickets.projectId,
      status: tickets.status,
      count: sql<number>`count(*)::int`,
    })
    .from(tickets)
    .where(inArray(tickets.projectId, projectIds))
    .groupBy(tickets.projectId, tickets.status);
  for (const row of rows) {
    const entry = counts.get(row.projectId);
    if (entry && isTicketStatus(row.status)) {
      entry[row.status] = Number(row.count);
    }
  }
  return counts;
}

async function findProjects(
  where: SQL | undefined,
  limit?: number,
): Promise<ProjectWithDetails[]> {
  const rows = await getDb().query.projects.findMany({
    where,
    orderBy: [desc(projects.updatedAt), asc(projects.name)],
    limit,
    with: {
      members: {
        orderBy: (member, { asc: by }) => [by(member.role), by(member.createdAt)],
      },
      repos: {
        orderBy: (repo, { desc: byDesc, asc: by }) => [
          byDesc(repo.isPrimary),
          by(repo.owner),
          by(repo.name),
        ],
      },
      milestones: {
        orderBy: (milestone, { asc: by }) => [by(milestone.sortOrder)],
      },
    },
  });
  const counts = await countTicketsByProject(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    ticketCounts: counts.get(row.id) ?? { ...EMPTY_TICKET_COUNTS },
  }));
}

/** Every project the viewer may see, most recently updated first. */
export async function listProjects(
  viewer: ProjectViewer = ANYONE,
): Promise<ProjectWithDetails[]> {
  return findProjects(visibilityCondition(viewer));
}

/** Projects this member belongs to, including private ones. */
export async function listProjectsForMember(
  clerkUserId: string,
): Promise<ProjectWithDetails[]> {
  if (!clerkUserId) {
    return [];
  }
  return findProjects(
    inArray(
      projects.id,
      getDb()
        .select({ id: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.clerkUserId, clerkUserId)),
    ),
  );
}

/** Projects building one idea that the viewer may see. */
export async function listProjectsForIdea(
  ideaId: string,
  viewer: ProjectViewer = ANYONE,
): Promise<ProjectWithDetails[]> {
  return findProjects(and(eq(projects.ideaId, ideaId), visibilityCondition(viewer)));
}

export async function getProject(
  id: string,
  viewer: ProjectViewer = ANYONE,
): Promise<ProjectWithDetails | null> {
  const [project] = await findProjects(
    and(eq(projects.id, id), visibilityCondition(viewer)),
    1,
  );
  return project ?? null;
}

export async function getProjectRole(
  projectId: string,
  clerkUserId: string,
): Promise<ProjectMemberRole | null> {
  const row = await getDb().query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.clerkUserId, clerkUserId),
    ),
    columns: { role: true },
  });
  return row?.role ?? null;
}

export async function isProjectMember(
  projectId: string,
  clerkUserId: string,
): Promise<boolean> {
  return (await getProjectRole(projectId, clerkUserId)) !== null;
}

export type ProjectInput = {
  name: string;
  /** Markdown. */
  description: string;
  isPublic: boolean;
  /** The idea this project builds, if any. */
  ideaId: string | null;
  /** At least one owner. A repeated user keeps the last role given. */
  members: ProjectMemberInput[];
};

export async function createProject(input: ProjectInput): Promise<{ id: string }> {
  const members = dedupeMembers(input.members);
  if (!members.some((member) => member.role === "OWNER")) {
    throw new Error(OWNER_REQUIRED);
  }
  const db = getDb();
  const [created] = await db
    .insert(projects)
    .values({
      name: input.name,
      description: input.description,
      isPublic: input.isPublic,
      ideaId: input.ideaId,
    })
    .returning({ id: projects.id });
  if (!created) {
    throw new Error("The project could not be saved.");
  }
  await db
    .insert(projectMembers)
    .values(members.map((member) => ({ projectId: created.id, ...member })));
  return created;
}

export type ProjectDetailsPatch = {
  name: string;
  description: string;
  isPublic: boolean;
  status: ProjectStatus;
  /** The full team after the edit. At least one owner is required. */
  members: ProjectMemberInput[];
};

/** Replaces the project's details and team. The caller checks who may edit. */
export async function updateProjectDetails(
  id: string,
  input: ProjectDetailsPatch,
): Promise<void> {
  const members = dedupeMembers(input.members);
  if (!members.some((member) => member.role === "OWNER")) {
    throw new Error(OWNER_REQUIRED);
  }
  const db = getDb();
  const statements: BatchItem<"pg">[] = [
    db
      .update(projects)
      .set({
        name: input.name,
        description: input.description,
        isPublic: input.isPublic,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id)),
    db.delete(projectMembers).where(
      and(
        eq(projectMembers.projectId, id),
        notInArray(
          projectMembers.clerkUserId,
          members.map((member) => member.clerkUserId),
        ),
      ),
    ),
    db
      .insert(projectMembers)
      .values(members.map((member) => ({ projectId: id, ...member })))
      .onConflictDoUpdate({
        target: [projectMembers.projectId, projectMembers.clerkUserId],
        set: { role: sql`excluded.role` },
      }),
  ];
  const [first, ...rest] = statements;
  await db.batch([first!, ...rest]);
}

async function touchProject(projectId: string): Promise<void> {
  await getDb()
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, projectId));
}

export async function deleteProject(id: string): Promise<boolean> {
  const removed = await getDb()
    .delete(projects)
    .where(eq(projects.id, id))
    .returning({ id: projects.id });
  return removed.length > 0;
}

// ---------------------------------------------------------------------------
// Repositories
// ---------------------------------------------------------------------------

export type ProjectRepoInput = Omit<
  ProjectRepo,
  "id" | "projectId" | "createdAt" | "isPrimary"
>;

/**
 * Links a repository, or refreshes its details when it is already linked.
 * The first repository on a project becomes its primary.
 */
export async function linkProjectRepo(
  projectId: string,
  input: ProjectRepoInput,
): Promise<ProjectRepo> {
  const db = getDb();
  const existing = await db.query.projectRepos.findFirst({
    where: eq(projectRepos.projectId, projectId),
    columns: { id: true },
  });
  const [repo] = await db
    .insert(projectRepos)
    .values({ projectId, ...input, isPrimary: !existing })
    .onConflictDoUpdate({
      target: [projectRepos.projectId, projectRepos.repoId],
      set: {
        owner: input.owner,
        name: input.name,
        htmlUrl: input.htmlUrl,
        defaultBranch: input.defaultBranch,
        isPrivate: input.isPrivate,
      },
    })
    .returning();
  if (!repo) {
    throw new Error("The repository could not be linked.");
  }
  await touchProject(projectId);
  return repo;
}

/** Unlinks a repository. If it was primary, the next one takes over. */
export async function unlinkProjectRepo(
  projectId: string,
  repoRowId: string,
): Promise<void> {
  const db = getDb();
  const removed = await db
    .delete(projectRepos)
    .where(and(eq(projectRepos.id, repoRowId), eq(projectRepos.projectId, projectId)))
    .returning({ isPrimary: projectRepos.isPrimary });
  if (removed[0]?.isPrimary) {
    const next = await db.query.projectRepos.findFirst({
      where: eq(projectRepos.projectId, projectId),
      orderBy: [asc(projectRepos.createdAt)],
      columns: { id: true },
    });
    if (next) {
      await db
        .update(projectRepos)
        .set({ isPrimary: true })
        .where(eq(projectRepos.id, next.id));
    }
  }
  await touchProject(projectId);
}

export async function setPrimaryProjectRepo(
  projectId: string,
  repoRowId: string,
): Promise<void> {
  const db = getDb();
  await db.batch([
    db
      .update(projectRepos)
      .set({ isPrimary: false })
      .where(eq(projectRepos.projectId, projectId)),
    db
      .update(projectRepos)
      .set({ isPrimary: true })
      .where(and(eq(projectRepos.id, repoRowId), eq(projectRepos.projectId, projectId))),
  ]);
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export type MilestoneInput = {
  title: string;
  description: string;
  status: MilestoneStatus;
  /** ISO date (YYYY-MM-DD), or null. */
  targetDate: string | null;
};

export async function createMilestone(
  projectId: string,
  input: MilestoneInput,
): Promise<ProjectMilestone> {
  const db = getDb();
  const [last] = await db
    .select({ sortOrder: projectMilestones.sortOrder })
    .from(projectMilestones)
    .where(eq(projectMilestones.projectId, projectId))
    .orderBy(desc(projectMilestones.sortOrder))
    .limit(1);
  const [milestone] = await db
    .insert(projectMilestones)
    .values({ projectId, ...input, sortOrder: (last?.sortOrder ?? -1) + 1 })
    .returning();
  if (!milestone) {
    throw new Error("The milestone could not be saved.");
  }
  await touchProject(projectId);
  return milestone;
}

export async function updateMilestone(
  projectId: string,
  milestoneId: string,
  input: MilestoneInput,
): Promise<ProjectMilestone | null> {
  const [milestone] = await getDb()
    .update(projectMilestones)
    .set({ ...input, updatedAt: new Date() })
    .where(
      and(
        eq(projectMilestones.id, milestoneId),
        eq(projectMilestones.projectId, projectId),
      ),
    )
    .returning();
  return milestone ?? null;
}

export async function deleteMilestone(
  projectId: string,
  milestoneId: string,
): Promise<boolean> {
  const removed = await getDb()
    .delete(projectMilestones)
    .where(
      and(
        eq(projectMilestones.id, milestoneId),
        eq(projectMilestones.projectId, projectId),
      ),
    )
    .returning({ id: projectMilestones.id });
  return removed.length > 0;
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

const ticketRelations = {
  milestone: true,
  repo: true,
} as const;

/** All of a project's tickets, in board order within each status. */
export async function listTickets(projectId: string): Promise<TicketWithDetails[]> {
  return getDb().query.tickets.findMany({
    where: eq(tickets.projectId, projectId),
    orderBy: [asc(tickets.sortOrder), desc(tickets.createdAt)],
    with: ticketRelations,
  });
}

export async function getTicket(
  projectId: string,
  number: number,
): Promise<TicketWithDetails | null> {
  const ticket = await getDb().query.tickets.findFirst({
    where: and(eq(tickets.projectId, projectId), eq(tickets.number, number)),
    with: ticketRelations,
  });
  return ticket ?? null;
}

export async function getTicketById(id: string): Promise<TicketWithDetails | null> {
  const ticket = await getDb().query.tickets.findFirst({
    where: eq(tickets.id, id),
    with: ticketRelations,
  });
  return ticket ?? null;
}

export type TicketInput = {
  title: string;
  /** Markdown. */
  description: string;
  priority: TicketPriority;
  milestoneId: string | null;
  repoId: string | null;
  assigneeClerkUserId: string | null;
};

export type NewTicketInput = TicketInput & {
  status?: TicketStatus;
  blockedReason?: string | null;
  source?: TicketSource;
  museRequestId?: string | null;
};

/**
 * Hands out the next number atomically, so two members creating tickets at
 * once never collide. A failed insert skips a number, which is harmless.
 */
async function nextTicketNumber(projectId: string): Promise<number> {
  const [row] = await getDb()
    .update(projects)
    .set({
      nextTicketNumber: sql`${projects.nextTicketNumber} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning({ next: projects.nextTicketNumber });
  if (!row) {
    throw new Error(`Unknown project: ${projectId}`);
  }
  return row.next - 1;
}

/** New tickets go to the top of their column. */
async function topSortOrder(projectId: string, status: TicketStatus): Promise<number> {
  const [row] = await getDb()
    .select({ min: sql<number | null>`min(${tickets.sortOrder})` })
    .from(tickets)
    .where(and(eq(tickets.projectId, projectId), eq(tickets.status, status)));
  const min = row?.min;
  return min === null || min === undefined ? 0 : Number(min) - 1;
}

export async function createTicket(
  projectId: string,
  createdByClerkUserId: string,
  input: NewTicketInput,
  sortOrderOverride?: number,
): Promise<TicketWithDetails> {
  const status = input.status ?? "BACKLOG";
  const change = ticketStatusChange(
    { status: "BACKLOG", completedAt: null },
    status,
    input.blockedReason,
  );
  const [number, sortOrder] = await Promise.all([
    nextTicketNumber(projectId),
    sortOrderOverride === undefined
      ? topSortOrder(projectId, status)
      : Promise.resolve(sortOrderOverride),
  ]);
  const [created] = await getDb()
    .insert(tickets)
    .values({
      projectId,
      number,
      title: input.title,
      description: input.description,
      priority: input.priority,
      milestoneId: input.milestoneId,
      repoId: input.repoId,
      assigneeClerkUserId: input.assigneeClerkUserId,
      source: input.source ?? "MEMBER",
      museRequestId: input.museRequestId ?? null,
      createdByClerkUserId,
      sortOrder,
      ...change,
    })
    .returning({ id: tickets.id });
  if (!created) {
    throw new Error("The ticket could not be saved.");
  }
  const ticket = await getTicketById(created.id);
  if (!ticket) {
    throw new Error("The ticket could not be read back.");
  }
  return ticket;
}

/**
 * Creates several tickets at once. The batch keeps the order given: the first
 * input gets the lowest number and sits on top of its column, the rest follow
 * beneath it, all above whatever was already there. Used by Muse planning.
 */
export async function createTickets(
  projectId: string,
  createdByClerkUserId: string,
  inputs: NewTicketInput[],
): Promise<TicketWithDetails[]> {
  const tops = new Map<TicketStatus, number>();
  const slots: number[] = [];
  for (const input of inputs.slice().reverse()) {
    const status = input.status ?? "BACKLOG";
    const top = tops.get(status) ?? (await topSortOrder(projectId, status));
    slots.unshift(top);
    tops.set(status, top - 1);
  }
  const created: TicketWithDetails[] = [];
  for (const [index, input] of inputs.entries()) {
    created.push(await createTicket(projectId, createdByClerkUserId, input, slots[index]));
  }
  return created;
}

export async function updateTicket(
  projectId: string,
  ticketId: string,
  input: TicketInput,
): Promise<TicketWithDetails | null> {
  const [updated] = await getDb()
    .update(tickets)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(tickets.id, ticketId), eq(tickets.projectId, projectId)))
    .returning({ id: tickets.id });
  if (!updated) {
    return null;
  }
  await touchProject(projectId);
  return getTicketById(updated.id);
}

/**
 * Moves a ticket to a status and places it at the top of that column.
 * BLOCKED needs a reason; DONE records when.
 */
export async function moveTicket(
  projectId: string,
  ticketId: string,
  status: TicketStatus,
  blockedReason?: string | null,
): Promise<TicketWithDetails | null> {
  const db = getDb();
  const current = await db.query.tickets.findFirst({
    where: and(eq(tickets.id, ticketId), eq(tickets.projectId, projectId)),
    columns: { status: true, completedAt: true },
  });
  if (!current) {
    return null;
  }
  const change = ticketStatusChange(current, status, blockedReason);
  const sortOrder =
    current.status === status ? undefined : await topSortOrder(projectId, status);
  await db
    .update(tickets)
    .set({ ...change, sortOrder, updatedAt: new Date() })
    .where(eq(tickets.id, ticketId));
  await touchProject(projectId);
  return getTicketById(ticketId);
}

export type TicketRankInput = {
  ticketId: string;
  priority: TicketPriority;
  /** Position in the backlog, 0 first. */
  rank: number;
};

/**
 * Applies a prioritised ordering to a set of open tickets. Tickets not in
 * the list keep their current priority and sort after the ranked ones.
 */
export async function applyTicketRanking(
  projectId: string,
  ranking: TicketRankInput[],
): Promise<number> {
  if (ranking.length === 0) {
    return 0;
  }
  const db = getDb();
  const owned = await db.query.tickets.findMany({
    where: and(
      eq(tickets.projectId, projectId),
      inArray(
        tickets.id,
        ranking.map((entry) => entry.ticketId),
      ),
    ),
    columns: { id: true },
  });
  const known = new Set(owned.map((row) => row.id));
  const statements = ranking
    .filter((entry) => known.has(entry.ticketId))
    .map((entry) =>
      db
        .update(tickets)
        .set({ priority: entry.priority, sortOrder: entry.rank, updatedAt: new Date() })
        .where(eq(tickets.id, entry.ticketId)),
    );
  if (statements.length === 0) {
    return 0;
  }
  const [first, ...rest] = statements;
  await db.batch([first!, ...rest]);
  await touchProject(projectId);
  return statements.length;
}

/** Places a ticket at a position among its status column (0 = top). */
export async function reorderTicket(
  projectId: string,
  ticketId: string,
  status: TicketStatus,
  index: number,
  blockedReason?: string | null,
): Promise<TicketWithDetails | null> {
  const db = getDb();
  const current = await db.query.tickets.findFirst({
    where: and(eq(tickets.id, ticketId), eq(tickets.projectId, projectId)),
    columns: { id: true, status: true, completedAt: true },
  });
  if (!current) {
    return null;
  }
  const change = ticketStatusChange(current, status, blockedReason);
  const column = await db.query.tickets.findMany({
    where: and(eq(tickets.projectId, projectId), eq(tickets.status, status)),
    orderBy: [asc(tickets.sortOrder), desc(tickets.createdAt)],
    columns: { id: true },
  });
  const ids = column.map((row) => row.id).filter((id) => id !== ticketId);
  ids.splice(Math.max(0, Math.min(index, ids.length)), 0, ticketId);
  const statements = ids.map((id, position) =>
    id === ticketId
      ? db
          .update(tickets)
          .set({ ...change, sortOrder: position, updatedAt: new Date() })
          .where(eq(tickets.id, id))
      : db.update(tickets).set({ sortOrder: position }).where(eq(tickets.id, id)),
  );
  const [first, ...rest] = statements;
  await db.batch([first!, ...rest]);
  await touchProject(projectId);
  return getTicketById(ticketId);
}

export async function deleteTicket(projectId: string, ticketId: string): Promise<boolean> {
  const removed = await getDb()
    .delete(tickets)
    .where(and(eq(tickets.id, ticketId), eq(tickets.projectId, projectId)))
    .returning({ id: tickets.id });
  if (removed.length > 0) {
    await touchProject(projectId);
  }
  return removed.length > 0;
}

export {
  EMPTY_TICKET_COUNTS,
  OPEN_TICKET_STATUSES,
  TICKET_STATUSES,
  isTicketStatus,
  projectKeyPrefix,
  ticketKey,
  ticketProgressPercent,
  ticketStatusChange,
  totalTickets,
  type TicketCounts,
  type TicketStatusChange,
} from "./build-rules";
