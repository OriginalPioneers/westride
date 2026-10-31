// ---------------------------------------------------------------------------
// Claims
//
// Ideas and projects imported from GitHub start with no team. Claiming one
// makes the claimant the idea's founder and the owner of every imported
// project built from it, in one transaction. Someone who cannot prove it
// through GitHub files a claim request that the team decides from an email.
// ---------------------------------------------------------------------------
import { and, desc, eq, exists, inArray, isNull, notExists, sql } from "drizzle-orm";
import {
  claimRequests,
  projectMembers,
  projectRepos,
  projects,
  type ClaimRequest,
  type ClaimRequestStatus,
  type Project,
} from "./build-schema";
import { getDb } from "./client";
import {
  ideaGithubRepos,
  ideaMembers,
  ideas,
  type Idea,
  type IdeaGithubRepo,
} from "./schema";

export { isClaimableIdea, isClaimableProject } from "./claim-rules";

/**
 * Makes the member the founder of an imported idea and the owner of its
 * imported projects. Runs as one transaction: the idea row is locked first
 * so two people claiming at once cannot both win. Returns false when the
 * idea is not an import, or someone already claimed it.
 */
export async function claimIdea(
  ideaId: string,
  clerkUserId: string,
): Promise<boolean> {
  const db = getDb();
  const importedIdea = and(eq(ideas.id, ideaId), eq(ideas.origin, "IMPORT"));
  const hasNoFounder = notExists(
    db
      .select({ one: sql`1` })
      .from(ideaMembers)
      .where(and(eq(ideaMembers.ideaId, ideaId), eq(ideaMembers.role, "FOUNDER"))),
  );
  // True once the founder insert below has happened in this transaction.
  const claimedByMember = exists(
    db
      .select({ one: sql`1` })
      .from(ideaMembers)
      .where(
        and(
          eq(ideaMembers.ideaId, ideaId),
          eq(ideaMembers.clerkUserId, clerkUserId),
          eq(ideaMembers.role, "FOUNDER"),
        ),
      ),
  );
  const importedProjectIds = db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.ideaId, ideaId), eq(projects.origin, "IMPORT")));

  const [, founder] = await db.batch([
    db.update(ideas).set({ updatedAt: new Date() }).where(importedIdea),
    db
      .insert(ideaMembers)
      .select(
        db
          .select({
            ideaId: ideas.id,
            clerkUserId: sql<string>`${clerkUserId}`.as("clerk_user_id"),
            role: sql`'FOUNDER'::idea_member_role`.as("role"),
            createdAt: sql`now()`.as("created_at"),
          })
          .from(ideas)
          .where(and(importedIdea, hasNoFounder)),
      )
      .onConflictDoUpdate({
        target: [ideaMembers.ideaId, ideaMembers.clerkUserId],
        set: { role: "FOUNDER" },
      })
      .returning({ ideaId: ideaMembers.ideaId }),
    db
      .insert(projectMembers)
      .select(
        db
          .select({
            projectId: projects.id,
            clerkUserId: sql<string>`${clerkUserId}`.as("clerk_user_id"),
            role: sql`'OWNER'::project_member_role`.as("role"),
            createdAt: sql`now()`.as("created_at"),
          })
          .from(projects)
          .where(
            and(
              eq(projects.ideaId, ideaId),
              eq(projects.origin, "IMPORT"),
              claimedByMember,
            ),
          ),
      )
      .onConflictDoUpdate({
        target: [projectMembers.projectId, projectMembers.clerkUserId],
        set: { role: "OWNER" },
      }),
    db
      .update(ideaGithubRepos)
      .set({ linkedByClerkUserId: clerkUserId })
      .where(
        and(
          eq(ideaGithubRepos.ideaId, ideaId),
          isNull(ideaGithubRepos.linkedByClerkUserId),
          claimedByMember,
        ),
      ),
    db
      .update(projectRepos)
      .set({ linkedByClerkUserId: clerkUserId })
      .where(
        and(
          inArray(projectRepos.projectId, importedProjectIds),
          isNull(projectRepos.linkedByClerkUserId),
          claimedByMember,
        ),
      ),
    db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(and(eq(projects.ideaId, ideaId), eq(projects.origin, "IMPORT"), claimedByMember)),
  ]);

  return founder.length > 0;
}

/** The idea already linked to a GitHub repository, by GitHub's numeric id. */
export async function findIdeaLinkedToGithubRepo(
  repoId: number,
): Promise<IdeaGithubRepo | null> {
  const row = await getDb().query.ideaGithubRepos.findFirst({
    where: eq(ideaGithubRepos.repoId, repoId),
  });
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Claim requests
// ---------------------------------------------------------------------------

export type ClaimRequestInput = {
  ideaId: string;
  projectId: string | null;
  clerkUserId: string;
  message: string;
  /** SHA-256 of the secret that goes in the review links. */
  reviewTokenHash: string;
};

/**
 * Files a request. When the member already has one pending for this idea,
 * the existing request is returned and `isNew` is false.
 */
export async function createClaimRequest(
  input: ClaimRequestInput,
): Promise<{ request: ClaimRequest; isNew: boolean }> {
  const db = getDb();
  const [created] = await db
    .insert(claimRequests)
    .values(input)
    .onConflictDoNothing()
    .returning();
  if (created) {
    return { request: created, isNew: true };
  }
  const existing = await getPendingClaimRequest(input.ideaId, input.clerkUserId);
  if (!existing) {
    throw new Error("The claim request could not be saved.");
  }
  return { request: existing, isNew: false };
}

/** Removes a request, e.g. when the email that carries its review link never sent. */
export async function deleteClaimRequest(id: string): Promise<void> {
  await getDb().delete(claimRequests).where(eq(claimRequests.id, id));
}

export async function getPendingClaimRequest(
  ideaId: string,
  clerkUserId: string,
): Promise<ClaimRequest | null> {
  const row = await getDb().query.claimRequests.findFirst({
    where: and(
      eq(claimRequests.ideaId, ideaId),
      eq(claimRequests.clerkUserId, clerkUserId),
      eq(claimRequests.status, "PENDING"),
    ),
  });
  return row ?? null;
}

export type ClaimRequestWithTargets = ClaimRequest & {
  idea: Idea | null;
  project: Project | null;
};

export async function getClaimRequest(
  id: string,
): Promise<ClaimRequestWithTargets | null> {
  const row = await getDb().query.claimRequests.findFirst({
    where: eq(claimRequests.id, id),
    with: { idea: true, project: true },
  });
  return row ?? null;
}

/** Open requests for an idea, newest first. */
export async function listPendingClaimRequests(
  ideaId: string,
): Promise<ClaimRequest[]> {
  return getDb().query.claimRequests.findMany({
    where: and(eq(claimRequests.ideaId, ideaId), eq(claimRequests.status, "PENDING")),
    orderBy: [desc(claimRequests.createdAt)],
  });
}

/**
 * Records the decision. Only a PENDING request can be decided, so a link
 * clicked twice changes nothing the second time. Returns null when the
 * request was already decided.
 */
export async function decideClaimRequest(
  id: string,
  status: Exclude<ClaimRequestStatus, "PENDING">,
): Promise<ClaimRequest | null> {
  const now = new Date();
  const [updated] = await getDb()
    .update(claimRequests)
    .set({ status, decidedAt: now, updatedAt: now })
    .where(and(eq(claimRequests.id, id), eq(claimRequests.status, "PENDING")))
    .returning();
  return updated ?? null;
}

/** Closes every other open request once the idea has a founder. */
export async function denyOtherClaimRequests(
  ideaId: string,
  exceptRequestId: string | null,
): Promise<void> {
  const now = new Date();
  const conditions = [eq(claimRequests.ideaId, ideaId), eq(claimRequests.status, "PENDING")];
  if (exceptRequestId) {
    conditions.push(sql`${claimRequests.id} <> ${exceptRequestId}`);
  }
  await getDb()
    .update(claimRequests)
    .set({ status: "DENIED", decidedAt: now, updatedAt: now })
    .where(and(...conditions));
}
