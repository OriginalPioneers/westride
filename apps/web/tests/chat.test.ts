import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, generateKeyPairSync, sign } from "node:crypto";
import type { AcademyTrack } from "@westride/api-client";
import { discordCommandText } from "../lib/chat/discord-commands";
import { toDiscordResponse, toSlackMessage, toWhatsAppText } from "../lib/chat/render";
import {
  formatDuration,
  helpReply,
  parseChatCommand,
  tracksReply,
} from "../lib/chat/replies";
import {
  verifyDiscordRequest,
  verifySlackRequest,
  verifyWhatsAppRequest,
} from "../lib/chat/verify";
import { readWhatsAppMessages } from "../lib/chat/whatsapp-payload";

function track(overrides: Partial<AcademyTrack> = {}): AcademyTrack {
  return {
    id: "1",
    slug: "ai-foundations",
    name: "AI Foundations",
    description: "What AI is, what it is not, and where it shows up in daily life.",
    difficulty: "BEGINNER",
    category: "Foundations",
    estimatedDurationMinutes: 90,
    lessonCount: 6,
    sortOrder: 1,
    icon: "Brain",
    tags: [],
    prerequisiteSlugs: [],
    learningObjectives: [],
    achievementTitle: "AI Explorer",
    ...overrides,
  };
}

test("understands commands however each platform delivers them", () => {
  for (const text of ["tracks", "/tracks", "Tracks", "westride tracks", "/westride tracks", " academy "]) {
    assert.deepEqual(parseChatCommand(text), { name: "tracks" }, text);
  }
  for (const text of ["", "help", "/help", "hi", "westride"]) {
    assert.deepEqual(parseChatCommand(text), { name: "help" }, text);
  }
  assert.deepEqual(parseChatCommand("link abcd2345"), { name: "link", code: "ABCD2345" });
  assert.deepEqual(parseChatCommand("what's up"), { name: "unknown", text: "what's up" });
});

test("reads the Discord subcommand", () => {
  assert.equal(
    discordCommandText({ name: "westride", options: [{ type: 1, name: "tracks" }] }),
    "tracks",
  );
  assert.equal(discordCommandText({ name: "westride" }), "help");
});

test("describes each track briefly", () => {
  assert.equal(formatDuration(45), "45 min");
  assert.equal(formatDuration(120), "2 h");
  assert.equal(formatDuration(150), "2 h 30 min");

  const reply = tracksReply(
    [track(), track({ id: "2", name: "Build with Llama", difficulty: "ADVANCED", lessonCount: 1 })],
    "https://westride.org/academy",
  );
  assert.equal(reply.items?.length, 2);
  assert.equal(reply.items?.[0]?.title, "1. AI Foundations");
  assert.equal(reply.items?.[0]?.detail, "Beginner · 1 h 30 min · 6 lessons");
  assert.equal(reply.items?.[1]?.detail, "Advanced · 1 h 30 min · 1 lesson");
  assert.equal(reply.link?.url, "https://westride.org/academy");
});

test("keeps long lists inside every platform's limits", () => {
  const many = Array.from({ length: 30 }, (_, index) =>
    track({ id: String(index), name: `Track ${index}`, description: "x ".repeat(400) }),
  );
  const reply = tracksReply(many, "https://westride.org/academy");
  assert.equal(reply.items?.length, 20);
  assert.match(reply.footer ?? "", /10 more/);

  const slack = toSlackMessage(reply);
  assert.ok(slack.blocks.length <= 50);
  assert.equal(slack.response_type, "ephemeral");

  const discord = toDiscordResponse(reply);
  const embed = discord.data.embeds[0]!;
  assert.ok(embed.fields.length <= 25);
  assert.ok(embed.fields.every((field) => field.value.length <= 1024));

  assert.ok(toWhatsAppText(reply).length <= 4096);
});

test("escapes Slack markup in track text", () => {
  const slack = toSlackMessage(
    tracksReply([track({ name: "<!channel> & co" })], "https://westride.org/academy"),
  );
  const text = JSON.stringify(slack.blocks);
  assert.ok(!text.includes("<!channel>"));
  assert.ok(text.includes("&lt;!channel&gt; &amp; co"));
});

test("help names the command for each platform and nudges unlinked members", () => {
  const slack = helpReply("SLACK", { isLinked: false, settingsUrl: "https://westride.org/settings" });
  assert.equal(slack.items?.[0]?.title, "/westride tracks");
  assert.equal(slack.link?.url, "https://westride.org/settings");

  const whatsapp = helpReply("WHATSAPP", { isLinked: true, settingsUrl: "https://westride.org/settings" });
  assert.equal(whatsapp.items?.[0]?.title, "tracks");
  assert.equal(whatsapp.link, undefined);
});

test("accepts only requests Slack signed recently", () => {
  const signingSecret = "slack-secret";
  const body = "command=%2Fwestride&text=tracks";
  const now = Date.UTC(2026, 9, 29, 12);
  const timestamp = String(now / 1000);
  const signature = `v0=${createHmac("sha256", signingSecret).update(`v0:${timestamp}:${body}`).digest("hex")}`;

  assert.ok(verifySlackRequest({ signingSecret, timestamp, signature, body, nowMs: now }));
  assert.ok(!verifySlackRequest({ signingSecret, timestamp, signature, body: `${body}x`, nowMs: now }));
  assert.ok(
    !verifySlackRequest({ signingSecret, timestamp, signature, body, nowMs: now + 10 * 60 * 1000 }),
  );
  assert.ok(!verifySlackRequest({ signingSecret, timestamp, signature: null, body, nowMs: now }));
});

test("accepts only requests Discord signed", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const x = publicKey.export({ format: "jwk" }).x!;
  const publicKeyHex = Buffer.from(x, "base64url").toString("hex");
  const timestamp = "1793300000";
  const body = JSON.stringify({ type: 1 });
  const signature = sign(null, Buffer.from(timestamp + body), privateKey).toString("hex");

  assert.ok(verifyDiscordRequest({ publicKey: publicKeyHex, timestamp, signature, body }));
  assert.ok(!verifyDiscordRequest({ publicKey: publicKeyHex, timestamp, signature, body: "{}" }));
  assert.ok(!verifyDiscordRequest({ publicKey: publicKeyHex, timestamp, signature: "zz", body }));
});

test("accepts only webhooks Meta signed for WhatsApp", () => {
  const appSecret = "meta-secret";
  const body = '{"object":"whatsapp_business_account"}';
  const signature = `sha256=${createHmac("sha256", appSecret).update(body).digest("hex")}`;
  assert.ok(verifyWhatsAppRequest({ appSecret, signature, body }));
  assert.ok(!verifyWhatsAppRequest({ appSecret, signature, body: `${body} ` }));
  assert.ok(!verifyWhatsAppRequest({ appSecret: "other", signature, body }));
});

test("reads text messages out of a WhatsApp webhook", () => {
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              contacts: [{ wa_id: "15551234567", profile: { name: "Ada" } }],
              messages: [
                { from: "15551234567", type: "text", text: { body: "tracks" } },
                { from: "15551234567", type: "image", image: { id: "1" } },
              ],
              statuses: [{ status: "delivered" }],
            },
          },
        ],
      },
    ],
  };
  assert.deepEqual(readWhatsAppMessages(payload), [
    { from: "15551234567", name: "Ada", text: "tracks" },
  ]);
  assert.deepEqual(readWhatsAppMessages({ entry: [{ changes: [{ value: { statuses: [] } }] }] }), []);
  assert.deepEqual(readWhatsAppMessages(null), []);
});
