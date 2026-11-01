import "server-only";

import type { Agent, Pledge } from "@westride/db";
import { listActivePledgesForIdea, refreshPledgePeriod, remainingMicros } from "@westride/db/support";
import { getMuseApiKey } from "@/lib/meta/connection";
import { hasVercelSandboxAccess } from "@/lib/vercel/connection";

/**
 * A TOKENS pledge is only chosen when it can plausibly cover one more job.
 * The cap is soft (a job's cost is known at its end), so this keeps a nearly
 * spent pledge from being picked for work that will clearly run past it.
 */
export const PLEDGE_JOB_RESERVE_MICROS = 250_000;

export type JobPayer = {
  clerkUserId: string;
  /** The pledge paying, or null when the team member or owner pays. */
  pledgeId: string | null;
};

/**
 * Who pays for the next job: a sponsor whose pledge still has room and whose
 * accounts are connected, or else the fallback (the member who pressed Run,
 * or the owner for a scheduled job). The agent's owner opts in per agent;
 * the sponsor only ever sets a cap. The model stays the owner's choice.
 */
export async function resolveJobPayer(
  agent: Agent,
  fallbackClerkUserId: string,
  options: { needsVercel: boolean },
): Promise<JobPayer> {
  const fallback: JobPayer = { clerkUserId: fallbackClerkUserId, pledgeId: null };
  if (!agent.allowSponsorTokens || !agent.ideaId) {
    return fallback;
  }
  const pledges = await listActivePledgesForIdea(agent.ideaId, "TOKENS");
  const candidates: { pledge: Pledge; remaining: number | null }[] = [];
  for (const raw of pledges) {
    const pledge = await refreshPledgePeriod(raw);
    const remaining = remainingMicros(pledge);
    if (remaining !== null && remaining < PLEDGE_JOB_RESERVE_MICROS) {
      continue;
    }
    candidates.push({ pledge, remaining });
  }
  // Most room first; an uncapped pledge sorts ahead of every capped one.
  candidates.sort((a, b) => {
    if (a.remaining === null) return b.remaining === null ? 0 : -1;
    if (b.remaining === null) return 1;
    return b.remaining - a.remaining;
  });
  for (const { pledge } of candidates) {
    if (pledge.clerkUserId === fallbackClerkUserId) {
      // Their own pledge; record the job against it so the idea's totals see it.
      return { clerkUserId: pledge.clerkUserId, pledgeId: pledge.id };
    }
    const [key, vercel] = await Promise.all([
      getMuseApiKey(pledge.clerkUserId).catch(() => null),
      options.needsVercel ? hasVercelSandboxAccess(pledge.clerkUserId) : Promise.resolve(true),
    ]);
    if (key && vercel) {
      return { clerkUserId: pledge.clerkUserId, pledgeId: pledge.id };
    }
  }
  return fallback;
}
