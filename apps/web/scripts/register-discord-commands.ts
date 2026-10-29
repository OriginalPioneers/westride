/**
 * Registers WeStride's Discord slash commands (global, so every server and
 * every member who installed the app gets them).
 *
 *   bun run discord:register
 *
 * Reads DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN from apps/web/.env.
 */
import { DISCORD_COMMANDS } from "../lib/chat/discord-commands";

const applicationId = process.env.DISCORD_APPLICATION_ID?.trim();
const botToken = process.env.DISCORD_BOT_TOKEN?.trim();

if (!applicationId || !botToken) {
  console.error("Set DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN in apps/web/.env first.");
  process.exit(1);
}

const response = await fetch(
  `https://discord.com/api/v10/applications/${applicationId}/commands`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(DISCORD_COMMANDS),
  },
);

if (!response.ok) {
  console.error(`Discord refused the commands (HTTP ${response.status}).`);
  console.error(await response.text());
  process.exit(1);
}

const registered = (await response.json()) as { name: string }[];
console.log(`Registered: ${registered.map((command) => `/${command.name}`).join(", ")}`);
