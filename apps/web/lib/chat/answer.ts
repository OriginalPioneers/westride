import "server-only";
import type { ChatPlatform } from "@westride/db";
import {
  consumeChatLinkCode,
  findChatConnection,
  saveChatConnection,
} from "@westride/db/chat";
import { listAcademyTracks } from "./academy";
import {
  commandHint,
  helpReply,
  messageReply,
  parseChatCommand,
  tracksReply,
  type ChatReply,
} from "./replies";

export type ChatSender = {
  platform: ChatPlatform;
  /** See `chat_connections.external_id`. */
  externalId: string;
  displayName: string;
  workspaceName?: string | null;
};

async function isLinked(sender: ChatSender): Promise<boolean | null> {
  try {
    return (await findChatConnection(sender.platform, sender.externalId)) !== null;
  } catch (error) {
    console.error("Chat connection lookup failed", error);
    return null;
  }
}

/** WhatsApp has no sign-in, so members prove the number is theirs by sending a code. */
async function linkWithCode(sender: ChatSender, code: string, settingsUrl: string) {
  if (sender.platform !== "WHATSAPP") {
    return messageReply(
      "Link from WeStride",
      "Open Settings on WeStride and choose Connect to link this account.",
      { label: "WeStride settings", url: settingsUrl },
    );
  }
  const clerkUserId = await consumeChatLinkCode(sender.platform, code);
  if (!clerkUserId) {
    return messageReply(
      "That code did not work",
      "It may have expired. Get a new one from Settings on WeStride.",
      { label: "WeStride settings", url: settingsUrl },
    );
  }
  await saveChatConnection({
    clerkUserId,
    platform: sender.platform,
    externalId: sender.externalId,
    displayName: sender.displayName,
    workspaceName: sender.workspaceName ?? null,
  });
  return messageReply(
    "Linked",
    `This number is now linked to your WeStride account. Send "${commandHint(sender.platform, "tracks")}" to see the academy tracks.`,
  );
}

/** Answers one message or slash command from any chat platform. */
export async function answerChat(
  sender: ChatSender,
  text: string,
  origin: string,
): Promise<ChatReply> {
  const settingsUrl = `${origin}/settings`;
  const command = parseChatCommand(text);
  switch (command.name) {
    case "tracks":
      try {
        return tracksReply(await listAcademyTracks(), `${origin}/academy`);
      } catch (error) {
        console.error("Academy tracks lookup failed", error);
        return messageReply(
          "The academy is not answering",
          "WeStride could not load the tracks just now. Try again in a moment.",
          { label: "Open the academy", url: `${origin}/academy` },
        );
      }
    case "link":
      return linkWithCode(sender, command.code, settingsUrl);
    case "help":
      return helpReply(sender.platform, { isLinked: await isLinked(sender), settingsUrl });
    case "unknown":
      return helpReply(sender.platform, {
        isLinked: await isLinked(sender),
        settingsUrl,
        heardText: command.text,
      });
  }
}
