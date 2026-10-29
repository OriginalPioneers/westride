import { and, eq, gt, ne } from "drizzle-orm";
import { getDb } from "./client";
import {
  chatConnections,
  chatLinkCodes,
  type ChatConnection,
  type ChatLinkCode,
  type ChatPlatform,
} from "./schema";

export type ChatConnectionInput = Omit<ChatConnection, "createdAt">;

export async function listChatConnections(
  clerkUserId: string,
): Promise<ChatConnection[]> {
  return getDb().query.chatConnections.findMany({
    where: eq(chatConnections.clerkUserId, clerkUserId),
  });
}

/** The member a message came from, if its sender is linked. */
export async function findChatConnection(
  platform: ChatPlatform,
  externalId: string,
): Promise<ChatConnection | null> {
  const row = await getDb().query.chatConnections.findFirst({
    where: and(
      eq(chatConnections.platform, platform),
      eq(chatConnections.externalId, externalId),
    ),
  });
  return row ?? null;
}

/**
 * Links an account, replacing the member's previous one on that platform.
 * An account already linked to someone else moves to this member: linking
 * proves they control it now.
 */
export async function saveChatConnection(input: ChatConnectionInput): Promise<void> {
  const { clerkUserId, platform, ...fields } = input;
  const db = getDb();
  await db.batch([
    db
      .delete(chatConnections)
      .where(
        and(
          eq(chatConnections.platform, platform),
          eq(chatConnections.externalId, input.externalId),
          ne(chatConnections.clerkUserId, clerkUserId),
        ),
      ),
    db
      .insert(chatConnections)
      .values(input)
      .onConflictDoUpdate({
        target: [chatConnections.clerkUserId, chatConnections.platform],
        set: { ...fields, createdAt: new Date() },
      }),
  ]);
}

export async function deleteChatConnection(
  clerkUserId: string,
  platform: ChatPlatform,
): Promise<void> {
  await getDb()
    .delete(chatConnections)
    .where(
      and(
        eq(chatConnections.clerkUserId, clerkUserId),
        eq(chatConnections.platform, platform),
      ),
    );
}

/** Issues a link code, retiring any earlier one for the same platform. */
export async function createChatLinkCode(
  input: Omit<ChatLinkCode, "createdAt">,
): Promise<void> {
  const db = getDb();
  await db.batch([
    db
      .delete(chatLinkCodes)
      .where(
        and(
          eq(chatLinkCodes.clerkUserId, input.clerkUserId),
          eq(chatLinkCodes.platform, input.platform),
        ),
      ),
    db.insert(chatLinkCodes).values(input),
  ]);
}

export async function getPendingChatLinkCode(
  clerkUserId: string,
  platform: ChatPlatform,
): Promise<ChatLinkCode | null> {
  const row = await getDb().query.chatLinkCodes.findFirst({
    where: and(
      eq(chatLinkCodes.clerkUserId, clerkUserId),
      eq(chatLinkCodes.platform, platform),
      gt(chatLinkCodes.expiresAt, new Date()),
    ),
  });
  return row ?? null;
}

/** Spends a code. Returns the member it belongs to, or null if it is unknown or expired. */
export async function consumeChatLinkCode(
  platform: ChatPlatform,
  code: string,
): Promise<string | null> {
  const [row] = await getDb()
    .delete(chatLinkCodes)
    .where(
      and(
        eq(chatLinkCodes.code, code),
        eq(chatLinkCodes.platform, platform),
        gt(chatLinkCodes.expiresAt, new Date()),
      ),
    )
    .returning({ clerkUserId: chatLinkCodes.clerkUserId });
  return row?.clerkUserId ?? null;
}
