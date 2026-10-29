"use server";

import { auth } from "@clerk/nextjs/server";
import type { ChatPlatform } from "@westride/db";
import { createChatLinkCode, deleteChatConnection } from "@westride/db/chat";
import { revalidatePath } from "next/cache";
import { getWhatsAppConfig } from "@/lib/chat/config";
import { LINK_CODE_LIFETIME_MS, newLinkCode, whatsappLinkUrl } from "@/lib/chat/whatsapp";
import { disconnectGithubAccount } from "@/lib/github/user";

export async function disconnectGithub(): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    return;
  }
  await disconnectGithubAccount(userId);
  revalidatePath("/settings");
}

const PLATFORMS: readonly ChatPlatform[] = ["SLACK", "DISCORD", "WHATSAPP"];

export async function disconnectChat(platform: ChatPlatform): Promise<void> {
  const { userId } = await auth();
  if (!userId || !PLATFORMS.includes(platform)) {
    return;
  }
  await deleteChatConnection(userId, platform);
  revalidatePath("/settings");
}

export type WhatsAppLinkStart = { code: string; url: string; expiresAt: string };

/** A code the member sends to WeStride's number to prove it is theirs. */
export async function startWhatsAppLink(): Promise<
  { status: "ok"; link: WhatsAppLinkStart } | { status: "error"; message: string }
> {
  const { userId } = await auth();
  if (!userId) {
    return { status: "error", message: "Sign in first." };
  }
  const config = getWhatsAppConfig();
  if (!config) {
    return { status: "error", message: "WhatsApp is not set up on this WeStride server yet." };
  }
  const code = newLinkCode();
  const expiresAt = new Date(Date.now() + LINK_CODE_LIFETIME_MS);
  await createChatLinkCode({ code, clerkUserId: userId, platform: "WHATSAPP", expiresAt });
  return {
    status: "ok",
    link: {
      code,
      url: whatsappLinkUrl(config.phoneNumber, code),
      expiresAt: expiresAt.toISOString(),
    },
  };
}
