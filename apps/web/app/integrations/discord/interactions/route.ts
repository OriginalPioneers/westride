import type { NextRequest } from "next/server";
import { answerChat } from "@/lib/chat/answer";
import { getDiscordConfig } from "@/lib/chat/config";
import { discordCommandText } from "@/lib/chat/discord-commands";
import { toDiscordResponse } from "@/lib/chat/render";
import { verifyDiscordRequest } from "@/lib/chat/verify";

const PING = 1;
const APPLICATION_COMMAND = 2;

type DiscordUser = { id?: unknown; username?: unknown; global_name?: unknown };

type Interaction = {
  type?: unknown;
  data?: { name?: unknown; options?: unknown };
  member?: { user?: DiscordUser };
  user?: DiscordUser;
};

/**
 * Set this URL as the Discord application's Interactions Endpoint URL.
 * Discord waits 3 seconds for the answer, which goes back in this response.
 */
export async function POST(request: NextRequest) {
  const config = getDiscordConfig();
  if (!config) {
    return new Response("Discord is not set up on this WeStride server.", { status: 503 });
  }
  const body = await request.text();
  const verified = verifyDiscordRequest({
    publicKey: config.publicKey,
    timestamp: request.headers.get("x-signature-timestamp"),
    signature: request.headers.get("x-signature-ed25519"),
    body,
  });
  if (!verified) {
    return new Response("Invalid request signature.", { status: 401 });
  }

  let interaction: Interaction;
  try {
    interaction = JSON.parse(body) as Interaction;
  } catch {
    return new Response("Invalid JSON.", { status: 400 });
  }
  if (interaction.type === PING) {
    return Response.json({ type: PING });
  }
  // In a server the caller is `member.user`; in DMs it is `user`.
  const user = interaction.member?.user ?? interaction.user;
  if (interaction.type !== APPLICATION_COMMAND || !interaction.data || typeof user?.id !== "string") {
    return new Response("Unsupported interaction.", { status: 400 });
  }

  const displayName =
    typeof user.global_name === "string"
      ? user.global_name
      : typeof user.username === "string"
        ? user.username
        : user.id;
  const reply = await answerChat(
    { platform: "DISCORD", externalId: user.id, displayName },
    discordCommandText(interaction.data),
    request.nextUrl.origin,
  );
  return Response.json(toDiscordResponse(reply));
}
