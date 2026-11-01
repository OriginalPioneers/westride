import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { vercelConnections, type VercelConnection } from "./schema";

export type VercelConnectionInput = Omit<
  VercelConnection,
  "createdAt" | "updatedAt" | "teamId" | "teamSlug" | "teamName" | "projectId" | "projectName"
>;

export type VercelScope = Pick<
  VercelConnection,
  "teamId" | "teamSlug" | "teamName" | "projectId" | "projectName"
>;

export async function getVercelConnection(
  clerkUserId: string,
): Promise<VercelConnection | null> {
  const row = await getDb().query.vercelConnections.findFirst({
    where: eq(vercelConnections.clerkUserId, clerkUserId),
  });
  return row ?? null;
}

/**
 * Creates the connection, or replaces the credential when the member connects
 * again. The team and project are cleared: a different account may not have
 * them, so the member picks again.
 */
export async function saveVercelConnection(input: VercelConnectionInput): Promise<void> {
  const { clerkUserId, ...fields } = input;
  const cleared = { teamId: null, teamSlug: null, teamName: null, projectId: null, projectName: null };
  await getDb()
    .insert(vercelConnections)
    .values({ ...input, ...cleared })
    .onConflictDoUpdate({
      target: vercelConnections.clerkUserId,
      set: { ...fields, ...cleared, createdAt: new Date(), updatedAt: new Date() },
    });
}

export async function updateVercelTokens(
  clerkUserId: string,
  tokens: Pick<VercelConnectionInput, "accessToken" | "accessTokenExpiresAt" | "refreshToken">,
): Promise<void> {
  await getDb()
    .update(vercelConnections)
    .set({ ...tokens, updatedAt: new Date() })
    .where(eq(vercelConnections.clerkUserId, clerkUserId));
}

/** Records which team and project the member's sandboxes run under. */
export async function updateVercelScope(clerkUserId: string, scope: VercelScope): Promise<void> {
  await getDb()
    .update(vercelConnections)
    .set({ ...scope, updatedAt: new Date() })
    .where(eq(vercelConnections.clerkUserId, clerkUserId));
}

export async function deleteVercelConnection(clerkUserId: string): Promise<void> {
  await getDb()
    .delete(vercelConnections)
    .where(eq(vercelConnections.clerkUserId, clerkUserId));
}
