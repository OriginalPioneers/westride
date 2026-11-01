// ---------------------------------------------------------------------------
// Supporters: pledges, the contribution ledger, and capital links.
// ---------------------------------------------------------------------------
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { agentJobs, agents } from "./agent-schema";
import { getDb } from "./client";
import { ideaMembers, ideas, type Idea } from "./schema";
import {
  ideaCapitalLinks,
  pledgeContributions,
  pledges,
  type IdeaCapitalLink,
  type Pledge,
  type PledgeContribution,
  type PledgeKind,
  type PledgeStatus,
} from "./support-schema";

export const MAX_CAPITAL_LINKS = 5;

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Idea settings
// ---------------------------------------------------------------------------

export type IdeaSupportSettings = {
  wantsTokens: boolean;
  wantsCompute: boolean;
  wantsCapital: boolean;
  /** Replaces the list. HTTPS links, already validated. */
  capitalLinks: { url: string; label: string }[];
};

const FOUNDER_ONLY = "Only a founder can change how this idea is supported.";

export async function updateIdeaSupportSettings(
  ideaId: string,
  editorClerkUserId: string,
  input: IdeaSupportSettings,
): Promise<void> {
  const db = getDb();
  const editor = await db.query.ideaMembers.findFirst({
    where: and(
      eq(ideaMembers.ideaId, ideaId),
      eq(ideaMembers.clerkUserId, editorClerkUserId),
      eq(ideaMembers.role, "FOUNDER"),
    ),
    columns: { ideaId: true },
  });
  if (!editor) {
    throw new Error(FOUNDER_ONLY);
  }
  const links = input.capitalLinks.slice(0, MAX_CAPITAL_LINKS);
  await db.batch([
    db
      .update(ideas)
      .set({
        wantsTokens: input.wantsTokens,
        wantsCompute: input.wantsCompute,
        wantsCapital: input.wantsCapital,
        updatedAt: new Date(),
      })
      .where(eq(ideas.id, ideaId)),
    db.delete(ideaCapitalLinks).where(eq(ideaCapitalLinks.ideaId, ideaId)),
    ...(links.length > 0
      ? [
          db.insert(ideaCapitalLinks).values(
            links.map((link, index) => ({
              ideaId,
              url: link.url,
              label: link.label,
              sortOrder: index,
            })),
          ),
        ]
      : []),
  ]);
}

export async function listCapitalLinks(ideaId: string): Promise<IdeaCapitalLink[]> {
  return getDb().query.ideaCapitalLinks.findMany({
    where: eq(ideaCapitalLinks.ideaId, ideaId),
    orderBy: [asc(ideaCapitalLinks.sortOrder), asc(ideaCapitalLinks.createdAt)],
  });
}

// ---------------------------------------------------------------------------
// Pledges
// ---------------------------------------------------------------------------

export type PledgeInput = {
  ideaId: string;
  clerkUserId: string;
  kind: PledgeKind;
  /** TOKENS only; ignored for COMPUTE. */
  capMicros: number | null;
  resetsMonthly: boolean;
  note: string;
};

/** Creates the pledge, or updates the supporter's existing one of that kind. */
export async function savePledge(input: PledgeInput): Promise<Pledge> {
  const isTokens = input.kind === "TOKENS";
  const values = {
    ideaId: input.ideaId,
    clerkUserId: input.clerkUserId,
    kind: input.kind,
    status: "ACTIVE" as const,
    capMicros: isTokens ? input.capMicros : null,
    resetsMonthly: isTokens ? input.resetsMonthly : false,
    note: input.note,
  };
  const [row] = await getDb()
    .insert(pledges)
    .values(values)
    .onConflictDoUpdate({
      target: [pledges.ideaId, pledges.clerkUserId, pledges.kind],
      set: {
        status: "ACTIVE",
        capMicros: values.capMicros,
        resetsMonthly: values.resetsMonthly,
        note: values.note,
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!row) {
    throw new Error("The pledge could not be saved.");
  }
  return row;
}

export async function getPledge(id: string): Promise<Pledge | null> {
  const row = await getDb().query.pledges.findFirst({ where: eq(pledges.id, id) });
  return row ?? null;
}

export async function setPledgeStatus(
  id: string,
  clerkUserId: string,
  status: PledgeStatus,
): Promise<boolean> {
  const updated = await getDb()
    .update(pledges)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(pledges.id, id), eq(pledges.clerkUserId, clerkUserId)))
    .returning({ id: pledges.id });
  return updated.length > 0;
}

export type PledgeWithIdea = Pledge & {
  idea: Pick<Idea, "id" | "name" | "imageUrl" | "isPublic">;
};

/** Everything one supporter has pledged, newest first. Revoked pledges are kept for the record. */
export async function listPledgesForSupporter(clerkUserId: string): Promise<PledgeWithIdea[]> {
  const rows = await getDb()
    .select({ pledge: pledges, idea: { id: ideas.id, name: ideas.name, imageUrl: ideas.imageUrl, isPublic: ideas.isPublic } })
    .from(pledges)
    .innerJoin(ideas, eq(ideas.id, pledges.ideaId))
    .where(eq(pledges.clerkUserId, clerkUserId))
    .orderBy(desc(pledges.createdAt));
  return rows.map((row) => ({ ...row.pledge, idea: row.idea }));
}

/** The supporter's pledges on one idea, one per kind at most. */
export async function listPledgesForSupporterOnIdea(
  clerkUserId: string,
  ideaId: string,
): Promise<Pledge[]> {
  return getDb().query.pledges.findMany({
    where: and(eq(pledges.clerkUserId, clerkUserId), eq(pledges.ideaId, ideaId)),
    orderBy: [asc(pledges.kind)],
  });
}

/** Active pledges on an idea, for the team's view and for choosing a payer. */
export async function listActivePledgesForIdea(ideaId: string, kind?: PledgeKind): Promise<Pledge[]> {
  return getDb().query.pledges.findMany({
    where: and(
      eq(pledges.ideaId, ideaId),
      eq(pledges.status, "ACTIVE"),
      kind ? eq(pledges.kind, kind) : undefined,
    ),
    orderBy: [asc(pledges.createdAt)],
  });
}

/** The supporters whose devices may run jobs for an idea. */
export async function listComputeSupporterIds(ideaId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ clerkUserId: pledges.clerkUserId })
    .from(pledges)
    .where(and(eq(pledges.ideaId, ideaId), eq(pledges.kind, "COMPUTE"), eq(pledges.status, "ACTIVE")));
  return rows.map((row) => row.clerkUserId);
}

/** Ideas a supporter has an active COMPUTE pledge on. */
export async function listComputePledgeIdeaIds(clerkUserId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ ideaId: pledges.ideaId })
    .from(pledges)
    .where(
      and(eq(pledges.clerkUserId, clerkUserId), eq(pledges.kind, "COMPUTE"), eq(pledges.status, "ACTIVE")),
    );
  return rows.map((row) => row.ideaId);
}

/**
 * Rolls a monthly pledge into a new period when its last one is over. Done
 * lazily, when a payer is chosen or a pledge is shown, so no cron is needed.
 */
export async function refreshPledgePeriod(pledge: Pledge, now = new Date()): Promise<Pledge> {
  if (!pledge.resetsMonthly || now.getTime() - pledge.periodStartedAt.getTime() < MONTH_MS) {
    return pledge;
  }
  const [row] = await getDb()
    .update(pledges)
    .set({ periodStartedAt: now, spentMicrosThisPeriod: 0, updatedAt: now })
    .where(and(eq(pledges.id, pledge.id), eq(pledges.periodStartedAt, pledge.periodStartedAt)))
    .returning();
  return row ?? (await getPledge(pledge.id)) ?? pledge;
}

/** What a TOKENS pledge can still cover. Null means no cap was set. */
export function remainingMicros(pledge: Pledge): number | null {
  if (pledge.capMicros === null) {
    return null;
  }
  return Math.max(0, pledge.capMicros - pledge.spentMicrosThisPeriod);
}

// ---------------------------------------------------------------------------
// Contributions
// ---------------------------------------------------------------------------

export type ContributionInput = {
  pledgeId: string;
  jobId: string;
  deviceId: string | null;
  estimatedCostMicros: number;
  inputTokens: number;
  outputTokens: number;
  wallClockSeconds: number;
};

/**
 * Credits a finished job to its pledge. Once per job: a second call for the
 * same job is ignored, so finishing twice never double counts.
 */
export async function recordContribution(input: ContributionInput): Promise<PledgeContribution | null> {
  const db = getDb();
  const pledge = await getPledge(input.pledgeId);
  if (!pledge) {
    return null;
  }
  const [row] = await db
    .insert(pledgeContributions)
    .values({
      pledgeId: pledge.id,
      ideaId: pledge.ideaId,
      clerkUserId: pledge.clerkUserId,
      kind: pledge.kind,
      jobId: input.jobId,
      deviceId: input.deviceId,
      estimatedCostMicros: input.estimatedCostMicros,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      wallClockSeconds: input.wallClockSeconds,
    })
    .onConflictDoNothing({ target: pledgeContributions.jobId })
    .returning();
  if (!row) {
    return null;
  }
  await db
    .update(pledges)
    .set({
      spentMicrosThisPeriod: sql`${pledges.spentMicrosThisPeriod} + ${input.estimatedCostMicros}`,
      spentMicrosTotal: sql`${pledges.spentMicrosTotal} + ${input.estimatedCostMicros}`,
      jobsTotal: sql`${pledges.jobsTotal} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(pledges.id, pledge.id));
  return row;
}

export type IdeaSupportSummary = {
  supporters: number;
  tokenPledges: number;
  computePledges: number;
  /** Lifetime spend sponsors have covered, in millionths of a dollar. */
  sponsoredMicros: number;
  /** Lifetime time volunteer devices have run jobs for the idea. */
  computeSeconds: number;
  jobs: number;
};

export const EMPTY_SUPPORT_SUMMARY: IdeaSupportSummary = {
  supporters: 0,
  tokenPledges: 0,
  computePledges: 0,
  sponsoredMicros: 0,
  computeSeconds: 0,
  jobs: 0,
};

export async function summarizeIdeaSupport(ideaId: string): Promise<IdeaSupportSummary> {
  const db = getDb();
  const [pledgeRows, [ledger]] = await Promise.all([
    db
      .select({ kind: pledges.kind, clerkUserId: pledges.clerkUserId })
      .from(pledges)
      .where(and(eq(pledges.ideaId, ideaId), eq(pledges.status, "ACTIVE"))),
    db
      .select({
        sponsoredMicros: sql<number>`coalesce(sum(case when ${pledgeContributions.kind} = 'TOKENS' then ${pledgeContributions.estimatedCostMicros} else 0 end), 0)::bigint`,
        computeSeconds: sql<number>`coalesce(sum(case when ${pledgeContributions.kind} = 'COMPUTE' then ${pledgeContributions.wallClockSeconds} else 0 end), 0)::bigint`,
        jobs: sql<number>`count(*)::int`,
      })
      .from(pledgeContributions)
      .where(eq(pledgeContributions.ideaId, ideaId)),
  ]);
  return {
    supporters: new Set(pledgeRows.map((row) => row.clerkUserId)).size,
    tokenPledges: pledgeRows.filter((row) => row.kind === "TOKENS").length,
    computePledges: pledgeRows.filter((row) => row.kind === "COMPUTE").length,
    sponsoredMicros: Number(ledger?.sponsoredMicros ?? 0),
    computeSeconds: Number(ledger?.computeSeconds ?? 0),
    jobs: Number(ledger?.jobs ?? 0),
  };
}

export type SupporterTotals = {
  ideas: number;
  sponsoredMicros: number;
  computeSeconds: number;
  jobs: number;
};

export async function summarizeSupporter(clerkUserId: string): Promise<SupporterTotals> {
  const db = getDb();
  const [[pledgeRow], [ledger]] = await Promise.all([
    db
      .select({ ideas: sql<number>`count(distinct ${pledges.ideaId})::int` })
      .from(pledges)
      .where(and(eq(pledges.clerkUserId, clerkUserId), eq(pledges.status, "ACTIVE"))),
    db
      .select({
        sponsoredMicros: sql<number>`coalesce(sum(case when ${pledgeContributions.kind} = 'TOKENS' then ${pledgeContributions.estimatedCostMicros} else 0 end), 0)::bigint`,
        computeSeconds: sql<number>`coalesce(sum(case when ${pledgeContributions.kind} = 'COMPUTE' then ${pledgeContributions.wallClockSeconds} else 0 end), 0)::bigint`,
        jobs: sql<number>`count(*)::int`,
      })
      .from(pledgeContributions)
      .where(eq(pledgeContributions.clerkUserId, clerkUserId)),
  ]);
  return {
    ideas: Number(pledgeRow?.ideas ?? 0),
    sponsoredMicros: Number(ledger?.sponsoredMicros ?? 0),
    computeSeconds: Number(ledger?.computeSeconds ?? 0),
    jobs: Number(ledger?.jobs ?? 0),
  };
}

/** Recent jobs a supporter's pledges paid for or ran, newest first. */
export async function listContributionsForSupporter(
  clerkUserId: string,
  limit = 50,
): Promise<(PledgeContribution & { ideaName: string; agentName: string | null; ticketTitle: string | null })[]> {
  const rows = await getDb()
    .select({
      contribution: pledgeContributions,
      ideaName: ideas.name,
      agentName: agents.name,
      ticketTitle: agentJobs.ticketTitle,
    })
    .from(pledgeContributions)
    .innerJoin(ideas, eq(ideas.id, pledgeContributions.ideaId))
    .leftJoin(agentJobs, eq(agentJobs.id, pledgeContributions.jobId))
    .leftJoin(agents, eq(agents.id, agentJobs.agentId))
    .where(eq(pledgeContributions.clerkUserId, clerkUserId))
    .orderBy(desc(pledgeContributions.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    ...row.contribution,
    ideaName: row.ideaName,
    agentName: row.agentName,
    ticketTitle: row.ticketTitle,
  }));
}

/** Ideas with at least one active pledge from anyone, with a count. For discovery. */
export async function countSupportersByIdea(ideaIds: string[]): Promise<Map<string, number>> {
  if (ideaIds.length === 0) {
    return new Map();
  }
  const rows = await getDb()
    .select({
      ideaId: pledges.ideaId,
      supporters: sql<number>`count(distinct ${pledges.clerkUserId})::int`,
    })
    .from(pledges)
    .where(and(inArray(pledges.ideaId, ideaIds), eq(pledges.status, "ACTIVE")))
    .groupBy(pledges.ideaId);
  return new Map(rows.map((row) => [row.ideaId, Number(row.supporters)]));
}
