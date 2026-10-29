import type { ChatReply } from "./replies";

// ---------------------------------------------------------------------------
// Slack: Block Kit, shown only to the member who ran the command.
// https://api.slack.com/reference/block-kit/blocks
// ---------------------------------------------------------------------------

function slackEscape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function toSlackMessage(reply: ChatReply) {
  const blocks: Record<string, unknown>[] = [
    { type: "header", text: { type: "plain_text", text: reply.title.slice(0, 150) } },
  ];
  if (reply.intro) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: slackEscape(reply.intro) } });
  }
  for (const item of reply.items ?? []) {
    const lines = [`*${slackEscape(item.title)}*`, slackEscape(item.detail)];
    if (item.description) {
      lines.push(slackEscape(item.description));
    }
    blocks.push({ type: "section", text: { type: "mrkdwn", text: lines.join("\n") } });
  }
  const closing = [
    reply.footer ? slackEscape(reply.footer) : null,
    reply.link ? `<${reply.link.url}|${slackEscape(reply.link.label)}>` : null,
  ].filter(Boolean);
  if (closing.length > 0) {
    blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: closing.join("  ·  ") }] });
  }
  return { response_type: "ephemeral", text: reply.title, blocks };
}

// ---------------------------------------------------------------------------
// Discord: one embed in an interaction response, visible only to the caller.
// https://discord.com/developers/docs/resources/message#embed-object-embed-limits
// ---------------------------------------------------------------------------

const DISCORD_EPHEMERAL = 1 << 6;
const DISCORD_CHANNEL_MESSAGE = 4;
const WESTRIDE_COLOR = 0x1f6f5c;

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function toDiscordResponse(reply: ChatReply) {
  const description = [
    reply.intro,
    reply.link ? `[${reply.link.label}](${reply.link.url})` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    type: DISCORD_CHANNEL_MESSAGE,
    data: {
      flags: DISCORD_EPHEMERAL,
      embeds: [
        {
          title: clip(reply.title, 256),
          url: reply.link?.url,
          description: description ? clip(description, 4096) : undefined,
          color: WESTRIDE_COLOR,
          fields: (reply.items ?? []).slice(0, 25).map((item) => ({
            name: clip(item.title, 256),
            value: clip(
              [item.detail, item.description].filter(Boolean).join("\n"),
              1024,
            ),
          })),
          footer: reply.footer ? { text: clip(reply.footer, 2048) } : undefined,
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// WhatsApp: one text message. *bold* is WhatsApp's own markup.
// ---------------------------------------------------------------------------

const WHATSAPP_MAX = 4096;

export function toWhatsAppText(reply: ChatReply): string {
  const parts = [`*${reply.title}*`];
  if (reply.intro) {
    parts.push(reply.intro);
  }
  for (const item of reply.items ?? []) {
    parts.push(
      [`*${item.title}*`, item.detail, item.description].filter(Boolean).join("\n"),
    );
  }
  if (reply.footer) {
    parts.push(reply.footer);
  }
  if (reply.link) {
    parts.push(`${reply.link.label}: ${reply.link.url}`);
  }
  return clip(parts.join("\n\n"), WHATSAPP_MAX);
}
