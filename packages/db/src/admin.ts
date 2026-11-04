// ---------------------------------------------------------------------------
// Admin portal queries.
//
// Everything here reads across members, so it is only ever called from the
// admin app after the caller's Clerk role has been checked. Lists are paged
// server-side and searched with ILIKE; counts come from the same conditions
// so the page total matches what is shown.
// ---------------------------------------------------------------------------
import { and, asc, desc, eq, gt, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { agentJobs, agents, type Agent } from "./agent-schema";
import { projectMembers, projects, type Project } from "./build-schema";
import { getDb } from "./client";
import {
  cloudAccounts,
  cloudCodeRedemptions,
  cloudLedgerEntries,
  cloudRedemptionCodes,
  type CloudAccount,
  type CloudLedgerEntry,
} from "./cloud-schema";
import { getCloudBalanceMicros, listLedgerEntries, recordLedgerEntry, sumCloudTotals, type CloudTotals } from "./cloud";
import { likePattern } from "./collection-filters";
import { DEVICE_ONLINE_WINDOW_MS } from "./devices";
import {
  chatConnections,
  githubConnections,
  ideaMembers,
  ideas,
  metaConnections,
  modalConnections,
  vercelConnections,
  type ChatPlatform,
  type Idea,
} from "./schema";
import { devices, pledges, type Device, type Pledge, type PledgeStatus } from "./support-schema";

export const ADMIN_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export type AdminPage<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminListParams = {
  /** Matched against names and, where it makes sense, descriptions and Clerk ids. */
  query?: string;
  /** 1-based. */
  page?: number;
  pageSize?: number;
};

type ContentListParams = AdminListParams & {
  /** Only rows the team has featured. */
  featuredOnly?: boolean;
};

function pageBounds(params: AdminListParams): { page: number; pageSize: number; offset: number } {
  const pageSize = Math.min(Math.max(Math.trunc(params.pageSize ?? ADMIN_PAGE_SIZE), 1), MAX_PAGE_SIZE);
  const page = Math.max(Math.trunc(params.page ?? 1), 1);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function whereAll(conditions: SQL[]): SQL | undefined {
  return conditions.length === 0 ? undefined : and(...conditions);
}

const countColumn = sql<number>`count(*)::int`;

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export type AdminOverview = {
  ideas: { total: number; public: number; featured: number };
  projects: { total: number; public: number; featured: number };
  agents: { total: number; active: number; featured: number };
  pledges: { total: number; active: number };
  devices: { total: number; active: number; online: number };
  codes: { total: number; active: number; redemptions: number };
  cloud: { accounts: number; balanceMicros: number; creditedMicros: number; spentMicros: number };
};

function countIf(condition: SQL): SQL<number> {
  return sql<number>`count(*) filter (where ${condition})::int`;
}

/** Headline numbers for the dashboard. One statement per table. */
export async function getAdminOverview(now = new Date()): Promise<AdminOverview> {
  const db = getDb();
  const onlineSince = new Date(now.getTime() - DEVICE_ONLINE_WINDOW_MS);
  const [[idea], [project], [agent], [pledge], [device], [code], [redemption], [cloud]] = await Promise.all([
    db
      .select({
        total: countColumn,
        public: countIf(eq(ideas.isPublic, true)),
        featured: countIf(eq(ideas.isFeatured, true)),
      })
      .from(ideas),
    db
      .select({
        total: countColumn,
        public: countIf(eq(projects.isPublic, true)),
        featured: countIf(eq(projects.isFeatured, true)),
      })
      .from(projects),
    db
      .select({
        total: countColumn,
        active: countIf(eq(agents.status, "ACTIVE")),
        featured: countIf(eq(agents.isFeatured, true)),
      })
      .from(agents),
    db
      .select({ total: countColumn, active: countIf(eq(pledges.status, "ACTIVE")) })
      .from(pledges),
    db
      .select({
        total: countColumn,
        active: countIf(eq(devices.status, "ACTIVE")),
        online: countIf(and(eq(devices.status, "ACTIVE"), gt(devices.lastSeenAt, onlineSince))!),
      })
      .from(devices),
    db
      .select({ total: countColumn, active: countIf(eq(cloudRedemptionCodes.isActive, true)) })
      .from(cloudRedemptionCodes),
    db.select({ total: countColumn }).from(cloudCodeRedemptions),
    db
      .select({
        accounts: sql<number>`count(distinct ${cloudLedgerEntries.clerkUserId})::int`,
        balance: sql<string>`coalesce(sum(${cloudLedgerEntries.amountMicros}), 0)`,
        credited: sql<string>`coalesce(sum(case when ${cloudLedgerEntries.amountMicros} > 0 then ${cloudLedgerEntries.amountMicros} else 0 end), 0)`,
        spent: sql<string>`coalesce(sum(case when ${cloudLedgerEntries.amountMicros} < 0 then -${cloudLedgerEntries.amountMicros} else 0 end), 0)`,
      })
      .from(cloudLedgerEntries),
  ]);
  return {
    ideas: { total: idea?.total ?? 0, public: idea?.public ?? 0, featured: idea?.featured ?? 0 },
    projects: { total: project?.total ?? 0, public: project?.public ?? 0, featured: project?.featured ?? 0 },
    agents: { total: agent?.total ?? 0, active: agent?.active ?? 0, featured: agent?.featured ?? 0 },
    pledges: { total: pledge?.total ?? 0, active: pledge?.active ?? 0 },
    devices: { total: device?.total ?? 0, active: device?.active ?? 0, online: device?.online ?? 0 },
    codes: { total: code?.total ?? 0, active: code?.active ?? 0, redemptions: redemption?.total ?? 0 },
    cloud: {
      accounts: cloud?.accounts ?? 0,
      balanceMicros: Number(cloud?.balance ?? 0),
      creditedMicros: Number(cloud?.credited ?? 0),
      spentMicros: Number(cloud?.spent ?? 0),
    },
  };
}

export type RecentContentKind = "idea" | "project" | "agent";

export type RecentContentRow = {
  kind: RecentContentKind;
  id: string;
  name: string;
  isPublic: boolean;
  isFeatured: boolean;
  createdAt: Date;
};

/** The newest ideas, projects, and agents, mixed, newest first. */
export async function listRecentContent(limit = 12): Promise<RecentContentRow[]> {
  const db = getDb();
  const [ideaRows, projectRows, agentRows] = await Promise.all([
    db
      .select({ id: ideas.id, name: ideas.name, isPublic: ideas.isPublic, isFeatured: ideas.isFeatured, createdAt: ideas.createdAt })
      .from(ideas)
      .orderBy(desc(ideas.createdAt))
      .limit(limit),
    db
      .select({ id: projects.id, name: projects.name, isPublic: projects.isPublic, isFeatured: projects.isFeatured, createdAt: projects.createdAt })
      .from(projects)
      .orderBy(desc(projects.createdAt))
      .limit(limit),
    db
      .select({ id: agents.id, name: agents.name, isPublic: agents.isPublic, isFeatured: agents.isFeatured, createdAt: agents.createdAt })
      .from(agents)
      .orderBy(desc(agents.createdAt))
      .limit(limit),
  ]);
  return [
    ...ideaRows.map((row) => ({ kind: "idea" as const, ...row })),
    ...projectRows.map((row) => ({ kind: "project" as const, ...row })),
    ...agentRows.map((row) => ({ kind: "agent" as const, ...row })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Ideas
// ---------------------------------------------------------------------------

export type AdminIdeaRow = Pick<
  Idea,
  "id" | "name" | "type" | "origin" | "imageUrl" | "isFeatured" | "isPublic" | "createdAt" | "updatedAt"
> & {
  /** Clerk user id of the first founder, or null for an unclaimed import. */
  founderClerkUserId: string | null;
  memberCount: number;
  followerCount: number;
};

const ideaFounder = sql<string | null>`(
  select ${ideaMembers.clerkUserId} from ${ideaMembers}
  where ${ideaMembers.ideaId} = ${ideas.id} and ${ideaMembers.role} = 'FOUNDER'
  order by ${ideaMembers.createdAt} asc limit 1
)`;
const ideaMemberCount = sql<number>`(
  select count(*)::int from ${ideaMembers} where ${ideaMembers.ideaId} = ${ideas.id}
)`;
const ideaFollowerCount = sql<number>`(
  select count(*)::int from idea_follows where idea_follows.idea_id = ${ideas.id}
)`;

export async function listIdeasForAdmin(params: ContentListParams = {}): Promise<AdminPage<AdminIdeaRow>> {
  const db = getDb();
  const { page, pageSize, offset } = pageBounds(params);
  const conditions: SQL[] = [];
  const query = params.query?.trim();
  if (query) {
    const pattern = likePattern(query);
    conditions.push(or(ilike(ideas.name, pattern), ilike(ideas.description, pattern), sql`${ideas.id}::text = ${query}`)!);
  }
  if (params.featuredOnly) {
    conditions.push(eq(ideas.isFeatured, true));
  }
  const where = whereAll(conditions);
  const [rows, [count]] = await Promise.all([
    db
      .select({
        id: ideas.id,
        name: ideas.name,
        type: ideas.type,
        origin: ideas.origin,
        imageUrl: ideas.imageUrl,
        isFeatured: ideas.isFeatured,
        isPublic: ideas.isPublic,
        createdAt: ideas.createdAt,
        updatedAt: ideas.updatedAt,
        founderClerkUserId: ideaFounder,
        memberCount: ideaMemberCount,
        followerCount: ideaFollowerCount,
      })
      .from(ideas)
      .where(where)
      .orderBy(desc(ideas.isFeatured), desc(ideas.updatedAt), asc(ideas.name))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: countColumn }).from(ideas).where(where),
  ]);
  return { rows, total: count?.total ?? 0, page, pageSize };
}

export async function setIdeaFeatured(id: string, isFeatured: boolean): Promise<boolean> {
  const rows = await getDb()
    .update(ideas)
    .set({ isFeatured })
    .where(eq(ideas.id, id))
    .returning({ id: ideas.id });
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Projects (Project Factory)
// ---------------------------------------------------------------------------

export type AdminProjectRow = Pick<
  Project,
  "id" | "name" | "status" | "origin" | "imageUrl" | "isFeatured" | "isPublic" | "createdAt" | "updatedAt"
> & {
  ideaId: string | null;
  ideaName: string | null;
  /** Clerk user id of the first owner, or null for an unclaimed import. */
  ownerClerkUserId: string | null;
  memberCount: number;
};

const projectOwner = sql<string | null>`(
  select ${projectMembers.clerkUserId} from ${projectMembers}
  where ${projectMembers.projectId} = ${projects.id} and ${projectMembers.role} = 'OWNER'
  order by ${projectMembers.createdAt} asc limit 1
)`;
const projectMemberCount = sql<number>`(
  select count(*)::int from ${projectMembers} where ${projectMembers.projectId} = ${projects.id}
)`;

export async function listProjectsForAdmin(params: ContentListParams = {}): Promise<AdminPage<AdminProjectRow>> {
  const db = getDb();
  const { page, pageSize, offset } = pageBounds(params);
  const conditions: SQL[] = [];
  const query = params.query?.trim();
  if (query) {
    const pattern = likePattern(query);
    conditions.push(
      or(ilike(projects.name, pattern), ilike(projects.description, pattern), sql`${projects.id}::text = ${query}`)!,
    );
  }
  if (params.featuredOnly) {
    conditions.push(eq(projects.isFeatured, true));
  }
  const where = whereAll(conditions);
  const [rows, [count]] = await Promise.all([
    db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        origin: projects.origin,
        imageUrl: projects.imageUrl,
        isFeatured: projects.isFeatured,
        isPublic: projects.isPublic,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        ideaId: projects.ideaId,
        ideaName: ideas.name,
        ownerClerkUserId: projectOwner,
        memberCount: projectMemberCount,
      })
      .from(projects)
      .leftJoin(ideas, eq(ideas.id, projects.ideaId))
      .where(where)
      .orderBy(desc(projects.isFeatured), desc(projects.updatedAt), asc(projects.name))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: countColumn }).from(projects).where(where),
  ]);
  return { rows, total: count?.total ?? 0, page, pageSize };
}

export async function setProjectFeatured(id: string, isFeatured: boolean): Promise<boolean> {
  const rows = await getDb()
    .update(projects)
    .set({ isFeatured })
    .where(eq(projects.id, id))
    .returning({ id: projects.id });
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Agents (Agent Studio)
// ---------------------------------------------------------------------------

export type AdminAgentRow = Pick<
  Agent,
  | "id"
  | "name"
  | "status"
  | "model"
  | "schedule"
  | "imageUrl"
  | "isFeatured"
  | "isPublic"
  | "ownerClerkUserId"
  | "createdAt"
  | "updatedAt"
> & {
  ideaId: string | null;
  ideaName: string | null;
  projectId: string | null;
  projectName: string | null;
  jobCount: number;
};

const agentJobCount = sql<number>`(
  select count(*)::int from ${agentJobs} where ${agentJobs.agentId} = ${agents.id}
)`;

export async function listAgentsForAdmin(params: ContentListParams = {}): Promise<AdminPage<AdminAgentRow>> {
  const db = getDb();
  const { page, pageSize, offset } = pageBounds(params);
  const conditions: SQL[] = [];
  const query = params.query?.trim();
  if (query) {
    const pattern = likePattern(query);
    conditions.push(
      or(
        ilike(agents.name, pattern),
        ilike(agents.description, pattern),
        eq(agents.ownerClerkUserId, query),
        sql`${agents.id}::text = ${query}`,
      )!,
    );
  }
  if (params.featuredOnly) {
    conditions.push(eq(agents.isFeatured, true));
  }
  const where = whereAll(conditions);
  const [rows, [count]] = await Promise.all([
    db
      .select({
        id: agents.id,
        name: agents.name,
        status: agents.status,
        model: agents.model,
        schedule: agents.schedule,
        imageUrl: agents.imageUrl,
        isFeatured: agents.isFeatured,
        isPublic: agents.isPublic,
        ownerClerkUserId: agents.ownerClerkUserId,
        createdAt: agents.createdAt,
        updatedAt: agents.updatedAt,
        ideaId: agents.ideaId,
        ideaName: ideas.name,
        projectId: agents.projectId,
        projectName: projects.name,
        jobCount: agentJobCount,
      })
      .from(agents)
      .leftJoin(ideas, eq(ideas.id, agents.ideaId))
      .leftJoin(projects, eq(projects.id, agents.projectId))
      .where(where)
      .orderBy(desc(agents.isFeatured), desc(agents.updatedAt), asc(agents.name))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: countColumn }).from(agents).where(where),
  ]);
  return { rows, total: count?.total ?? 0, page, pageSize };
}

export async function setAgentFeatured(id: string, isFeatured: boolean): Promise<boolean> {
  const rows = await getDb()
    .update(agents)
    .set({ isFeatured })
    .where(eq(agents.id, id))
    .returning({ id: agents.id });
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Pledges
// ---------------------------------------------------------------------------

export type AdminPledgeRow = Pledge & {
  ideaName: string;
  ideaIsPublic: boolean;
};

export type PledgeListParams = AdminListParams & {
  status?: PledgeStatus;
};

export async function listPledgesForAdmin(params: PledgeListParams = {}): Promise<AdminPage<AdminPledgeRow>> {
  const db = getDb();
  const { page, pageSize, offset } = pageBounds(params);
  const conditions: SQL[] = [];
  const query = params.query?.trim();
  if (query) {
    const pattern = likePattern(query);
    conditions.push(or(ilike(ideas.name, pattern), eq(pledges.clerkUserId, query), ilike(pledges.note, pattern))!);
  }
  if (params.status) {
    conditions.push(eq(pledges.status, params.status));
  }
  const where = whereAll(conditions);
  const [rows, [count]] = await Promise.all([
    db
      .select({ pledge: pledges, ideaName: ideas.name, ideaIsPublic: ideas.isPublic })
      .from(pledges)
      .innerJoin(ideas, eq(ideas.id, pledges.ideaId))
      .where(where)
      .orderBy(desc(pledges.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: countColumn }).from(pledges).innerJoin(ideas, eq(ideas.id, pledges.ideaId)).where(where),
  ]);
  return {
    rows: rows.map((row) => ({ ...row.pledge, ideaName: row.ideaName, ideaIsPublic: row.ideaIsPublic })),
    total: count?.total ?? 0,
    page,
    pageSize,
  };
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export type DeviceListParams = AdminListParams & {
  /** Leave out revoked devices. */
  activeOnly?: boolean;
};

export async function listDevicesForAdmin(params: DeviceListParams = {}): Promise<AdminPage<Device>> {
  const db = getDb();
  const { page, pageSize, offset } = pageBounds(params);
  const conditions: SQL[] = [];
  const query = params.query?.trim();
  if (query) {
    const pattern = likePattern(query);
    conditions.push(
      or(ilike(devices.name, pattern), eq(devices.clerkUserId, query), ilike(devices.os, pattern), ilike(devices.arch, pattern))!,
    );
  }
  if (params.activeOnly) {
    conditions.push(eq(devices.status, "ACTIVE"));
  }
  const where = whereAll(conditions);
  const [rows, [count]] = await Promise.all([
    db
      .select()
      .from(devices)
      .where(where)
      .orderBy(desc(devices.lastSeenAt), desc(devices.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: countColumn }).from(devices).where(where),
  ]);
  return { rows, total: count?.total ?? 0, page, pageSize };
}

// ---------------------------------------------------------------------------
// One member, across everything
// ---------------------------------------------------------------------------

export type AdminUserIdea = Pick<Idea, "id" | "name" | "isPublic" | "isFeatured" | "createdAt"> & {
  role: "FOUNDER" | "MEMBER";
};
export type AdminUserProject = Pick<Project, "id" | "name" | "status" | "isPublic" | "isFeatured" | "createdAt"> & {
  role: "OWNER" | "MEMBER";
};
export type AdminUserAgent = Pick<Agent, "id" | "name" | "status" | "isPublic" | "isFeatured" | "schedule" | "createdAt">;
export type AdminUserRedemption = { code: string; amountMicros: number; createdAt: Date };

export type AdminUserSummary = {
  ideas: AdminUserIdea[];
  projects: AdminUserProject[];
  agents: AdminUserAgent[];
  pledges: AdminPledgeRow[];
  devices: Device[];
  cloud: {
    account: CloudAccount | null;
    balanceMicros: number;
    totals: CloudTotals;
    ledger: CloudLedgerEntry[];
    redemptions: AdminUserRedemption[];
  };
  connections: {
    github: string | null;
    meta: string | null;
    vercel: string | null;
    modal: boolean;
    chat: ChatPlatform[];
  };
};

/** Everything WeStride holds about one member, for the admin's user page. */
export async function getUserSummaryForAdmin(clerkUserId: string): Promise<AdminUserSummary> {
  const db = getDb();
  const [
    ideaRows,
    projectRows,
    agentRows,
    pledgeRows,
    deviceRows,
    account,
    balanceMicros,
    totals,
    ledger,
    redemptionRows,
    github,
    meta,
    vercel,
    modal,
    chat,
  ] = await Promise.all([
    db
      .select({
        id: ideas.id,
        name: ideas.name,
        isPublic: ideas.isPublic,
        isFeatured: ideas.isFeatured,
        createdAt: ideas.createdAt,
        role: ideaMembers.role,
      })
      .from(ideaMembers)
      .innerJoin(ideas, eq(ideas.id, ideaMembers.ideaId))
      .where(eq(ideaMembers.clerkUserId, clerkUserId))
      .orderBy(desc(ideas.updatedAt)),
    db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        isPublic: projects.isPublic,
        isFeatured: projects.isFeatured,
        createdAt: projects.createdAt,
        role: projectMembers.role,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .where(eq(projectMembers.clerkUserId, clerkUserId))
      .orderBy(desc(projects.updatedAt)),
    db
      .select({
        id: agents.id,
        name: agents.name,
        status: agents.status,
        isPublic: agents.isPublic,
        isFeatured: agents.isFeatured,
        schedule: agents.schedule,
        createdAt: agents.createdAt,
      })
      .from(agents)
      .where(eq(agents.ownerClerkUserId, clerkUserId))
      .orderBy(desc(agents.updatedAt)),
    db
      .select({ pledge: pledges, ideaName: ideas.name, ideaIsPublic: ideas.isPublic })
      .from(pledges)
      .innerJoin(ideas, eq(ideas.id, pledges.ideaId))
      .where(eq(pledges.clerkUserId, clerkUserId))
      .orderBy(desc(pledges.createdAt)),
    db.select().from(devices).where(eq(devices.clerkUserId, clerkUserId)).orderBy(desc(devices.createdAt)),
    db.query.cloudAccounts.findFirst({ where: eq(cloudAccounts.clerkUserId, clerkUserId) }),
    getCloudBalanceMicros(clerkUserId),
    sumCloudTotals(clerkUserId),
    listLedgerEntries(clerkUserId, 50),
    db
      .select({
        code: cloudRedemptionCodes.code,
        amountMicros: cloudRedemptionCodes.amountMicros,
        createdAt: cloudCodeRedemptions.createdAt,
      })
      .from(cloudCodeRedemptions)
      .innerJoin(cloudRedemptionCodes, eq(cloudRedemptionCodes.id, cloudCodeRedemptions.codeId))
      .where(eq(cloudCodeRedemptions.clerkUserId, clerkUserId))
      .orderBy(desc(cloudCodeRedemptions.createdAt)),
    db.query.githubConnections.findFirst({
      where: eq(githubConnections.clerkUserId, clerkUserId),
      columns: { login: true },
    }),
    db.query.metaConnections.findFirst({
      where: eq(metaConnections.clerkUserId, clerkUserId),
      columns: { label: true },
    }),
    db.query.vercelConnections.findFirst({
      where: eq(vercelConnections.clerkUserId, clerkUserId),
      columns: { username: true },
    }),
    db.query.modalConnections.findFirst({
      where: eq(modalConnections.clerkUserId, clerkUserId),
      columns: { clerkUserId: true },
    }),
    db
      .select({ platform: chatConnections.platform })
      .from(chatConnections)
      .where(eq(chatConnections.clerkUserId, clerkUserId)),
  ]);
  return {
    ideas: ideaRows,
    projects: projectRows,
    agents: agentRows,
    pledges: pledgeRows.map((row) => ({ ...row.pledge, ideaName: row.ideaName, ideaIsPublic: row.ideaIsPublic })),
    devices: deviceRows,
    cloud: {
      account: account ?? null,
      balanceMicros,
      totals,
      ledger,
      redemptions: redemptionRows,
    },
    connections: {
      github: github?.login ?? null,
      meta: meta?.label ?? null,
      vercel: vercel?.username ?? null,
      modal: Boolean(modal),
      chat: chat.map((row) => row.platform),
    },
  };
}

/**
 * Clerk ids that appear anywhere in WeStride's own tables, so the admin can
 * tell which Clerk accounts have done something here. Capped; the user list
 * itself comes from Clerk.
 */
export async function listActiveClerkUserIds(limit = 1000): Promise<Set<string>> {
  const db = getDb();
  const [members, owners, agentOwners, supporters, deviceOwners] = await Promise.all([
    db.selectDistinct({ id: ideaMembers.clerkUserId }).from(ideaMembers).limit(limit),
    db.selectDistinct({ id: projectMembers.clerkUserId }).from(projectMembers).limit(limit),
    db.selectDistinct({ id: agents.ownerClerkUserId }).from(agents).limit(limit),
    db.selectDistinct({ id: pledges.clerkUserId }).from(pledges).limit(limit),
    db.selectDistinct({ id: devices.clerkUserId }).from(devices).limit(limit),
  ]);
  return new Set([...members, ...owners, ...agentOwners, ...supporters, ...deviceOwners].map((row) => row.id));
}

/** Cloud balances for a set of members, for the user list. Members with no ledger are left out. */
export async function sumCloudBalances(clerkUserIds: string[]): Promise<Map<string, number>> {
  if (clerkUserIds.length === 0) {
    return new Map();
  }
  const rows = await getDb()
    .select({
      clerkUserId: cloudLedgerEntries.clerkUserId,
      balance: sql<string>`coalesce(sum(${cloudLedgerEntries.amountMicros}), 0)`,
    })
    .from(cloudLedgerEntries)
    .where(inArray(cloudLedgerEntries.clerkUserId, clerkUserIds))
    .groupBy(cloudLedgerEntries.clerkUserId);
  return new Map(rows.map((row) => [row.clerkUserId, Number(row.balance)]));
}

// ---------------------------------------------------------------------------
// Cloud adjustments
// ---------------------------------------------------------------------------

export type CloudAdjustmentInput = {
  clerkUserId: string;
  /** USD in millionths. Positive credits, negative debits. */
  amountMicros: number;
  /** Shown in the member's ledger. */
  description: string;
  /** Clerk user id of the admin, kept in the reference for the audit trail. */
  adminClerkUserId: string;
};

/** A manual correction to a member's WeStride Cloud balance. */
export async function adjustCloudBalance(input: CloudAdjustmentInput): Promise<CloudLedgerEntry | null> {
  return recordLedgerEntry({
    clerkUserId: input.clerkUserId,
    kind: "ADJUSTMENT",
    amountMicros: input.amountMicros,
    reference: `adjustment:${input.adminClerkUserId}:${crypto.randomUUID()}`,
    description: input.description,
  });
}
