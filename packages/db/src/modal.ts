import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { modalConnections, type ModalConnection } from "./schema";

export type ModalConnectionInput = Omit<ModalConnection, "createdAt" | "updatedAt">;

export async function getModalConnection(clerkUserId: string): Promise<ModalConnection | null> {
  const row = await getDb().query.modalConnections.findFirst({
    where: eq(modalConnections.clerkUserId, clerkUserId),
  });
  return row ?? null;
}

/** Creates the connection, or replaces the token when the member connects again. */
export async function saveModalConnection(input: ModalConnectionInput): Promise<void> {
  const { clerkUserId, ...fields } = input;
  await getDb()
    .insert(modalConnections)
    .values(input)
    .onConflictDoUpdate({
      target: modalConnections.clerkUserId,
      set: { ...fields, createdAt: new Date(), updatedAt: new Date() },
    });
}

/** Records which Modal environment the member's sandboxes run in. Null is the workspace default. */
export async function updateModalEnvironment(
  clerkUserId: string,
  environment: string | null,
): Promise<void> {
  await getDb()
    .update(modalConnections)
    .set({ environment, updatedAt: new Date() })
    .where(eq(modalConnections.clerkUserId, clerkUserId));
}

export async function deleteModalConnection(clerkUserId: string): Promise<void> {
  await getDb().delete(modalConnections).where(eq(modalConnections.clerkUserId, clerkUserId));
}
