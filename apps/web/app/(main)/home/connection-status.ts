import "server-only";
import type { ChatPlatform } from "@westride/db";
import { listChatConnections } from "@westride/db/chat";
import { getGithubConnection } from "@westride/db/github";
import {
  getDiscordConfig,
  getSlackConfig,
  getWhatsAppConfig,
} from "@/lib/chat/config";
import { isGithubAppConfigured } from "@/lib/github/config";
import {
  getMetaConnectionSummary,
  isMetaConnectionConfigured,
} from "@/lib/meta/connection";
import type {
  ConnectionId,
  ConnectionStatus,
  ConnectionStatuses,
} from "./landing-content";

const CHAT_PLATFORMS = {
  SLACK: "slack",
  DISCORD: "discord",
  WHATSAPP: "whatsapp",
} as const satisfies Record<ChatPlatform, ConnectionId>;

async function linkedConnections(userId: string): Promise<Set<ConnectionId>> {
  const [github, meta, chats] = await Promise.all([
    isGithubAppConfigured() ? getGithubConnection(userId) : null,
    isMetaConnectionConfigured() ? getMetaConnectionSummary(userId) : null,
    listChatConnections(userId),
  ]);
  const linked = new Set<ConnectionId>(
    chats.map((chat) => CHAT_PLATFORMS[chat.platform])
  );
  if (github != null) linked.add("github");
  if (meta != null) linked.add("meta");
  return linked;
}

/** What the hero strip says about each integration for this visitor. */
export async function getConnectionStatuses(
  userId: string | null
): Promise<ConnectionStatuses> {
  const configured: Record<ConnectionId, boolean> = {
    meta: isMetaConnectionConfigured(),
    github: isGithubAppConfigured(),
    whatsapp: getWhatsAppConfig() != null,
    slack: getSlackConfig() != null,
    discord: getDiscordConfig() != null,
  };

  let linked: Set<ConnectionId> | null = null;
  if (userId != null) {
    try {
      linked = await linkedConnections(userId);
    } catch (error) {
      // The landing page must render even when the database is unreachable.
      console.error("Connection status lookup failed", error);
    }
  }

  const status = (id: ConnectionId): ConnectionStatus => {
    if (!configured[id]) return "unavailable";
    if (linked == null) return "available";
    return linked.has(id) ? "connected" : "disconnected";
  };

  return {
    meta: status("meta"),
    github: status("github"),
    whatsapp: status("whatsapp"),
    slack: status("slack"),
    discord: status("discord"),
  };
}
