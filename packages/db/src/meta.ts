import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { metaConnections, type MetaConnection } from "./schema";

export type MetaConnectionInput = Omit<MetaConnection, "createdAt" | "updatedAt">;

export async function getMetaConnection(
  clerkUserId: string,
): Promise<MetaConnection | null> {
  const row = await getDb().query.metaConnections.findFirst({
    where: eq(metaConnections.clerkUserId, clerkUserId),
  });
  return row ?? null;
}

/** Creates the connection, or replaces it when the member connects again. */
export async function saveMetaConnection(input: MetaConnectionInput): Promise<void> {
  const { clerkUserId, ...fields } = input;
  await getDb()
    .insert(metaConnections)
    .values(input)
    .onConflictDoUpdate({
      target: metaConnections.clerkUserId,
      set: { ...fields, createdAt: new Date(), updatedAt: new Date() },
    });
}

export async function updateMetaApiKey(
  clerkUserId: string,
  key: Pick<MetaConnectionInput, "apiKey" | "apiKeyExpiresAt">,
): Promise<void> {
  await getDb()
    .update(metaConnections)
    .set({ ...key, updatedAt: new Date() })
    .where(eq(metaConnections.clerkUserId, clerkUserId));
}

export async function deleteMetaConnection(clerkUserId: string): Promise<void> {
  await getDb()
    .delete(metaConnections)
    .where(eq(metaConnections.clerkUserId, clerkUserId));
}
