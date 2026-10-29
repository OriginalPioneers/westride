/**
 * WeStride's Discord slash commands. Register them with
 * `bun run discord:register` whenever this list changes.
 * https://discord.com/developers/docs/interactions/application-commands
 */

const SUB_COMMAND = 1;
/** Usable in servers that installed the app, and anywhere for members who installed it. */
const GUILD_INSTALL = 0;
const USER_INSTALL = 1;
const GUILD = 0;
const BOT_DM = 1;
const PRIVATE_CHANNEL = 2;

export const DISCORD_COMMANDS = [
  {
    name: "westride",
    description: "Talk to WeStride.",
    integration_types: [GUILD_INSTALL, USER_INSTALL],
    contexts: [GUILD, BOT_DM, PRIVATE_CHANNEL],
    options: [
      {
        type: SUB_COMMAND,
        name: "tracks",
        description: "List the WeStride Academy learning tracks.",
      },
      {
        type: SUB_COMMAND,
        name: "help",
        description: "Show what WeStride can do here.",
      },
    ],
  },
];

type InteractionOption = { name?: unknown; type?: unknown };

/** The command text a `/westride <sub>` interaction stands for, e.g. "tracks". */
export function discordCommandText(data: { name?: unknown; options?: unknown }): string {
  if (data.name !== "westride") {
    return typeof data.name === "string" ? data.name : "";
  }
  const options = Array.isArray(data.options) ? (data.options as InteractionOption[]) : [];
  const sub = options.find((option) => option.type === SUB_COMMAND);
  return typeof sub?.name === "string" ? sub.name : "help";
}
