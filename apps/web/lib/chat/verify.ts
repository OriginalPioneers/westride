import {
  createHmac,
  createPublicKey,
  timingSafeEqual,
  verify as verifySignature,
} from "node:crypto";

function sameText(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

const SLACK_MAX_AGE_SECONDS = 5 * 60;

/** https://api.slack.com/authentication/verifying-requests-from-slack */
export function verifySlackRequest(input: {
  signingSecret: string;
  timestamp: string | null;
  signature: string | null;
  body: string;
  nowMs?: number;
}): boolean {
  const { signingSecret, timestamp, signature, body } = input;
  if (!timestamp || !signature) {
    return false;
  }
  const seconds = Number(timestamp);
  const now = (input.nowMs ?? Date.now()) / 1000;
  // Old requests are refused so a captured one cannot be replayed.
  if (!Number.isFinite(seconds) || Math.abs(now - seconds) > SLACK_MAX_AGE_SECONDS) {
    return false;
  }
  const expected = `v0=${createHmac("sha256", signingSecret)
    .update(`v0:${timestamp}:${body}`)
    .digest("hex")}`;
  return sameText(expected, signature);
}

/** https://discord.com/developers/docs/interactions/overview#setting-up-an-endpoint-validating-security-request-headers */
export function verifyDiscordRequest(input: {
  publicKey: string;
  timestamp: string | null;
  signature: string | null;
  body: string;
}): boolean {
  const { publicKey, timestamp, signature, body } = input;
  if (!timestamp || !signature || !/^[0-9a-f]{128}$/i.test(signature)) {
    return false;
  }
  try {
    const key = createPublicKey({
      key: {
        kty: "OKP",
        crv: "Ed25519",
        x: Buffer.from(publicKey, "hex").toString("base64url"),
      },
      format: "jwk",
    });
    return verifySignature(
      null,
      Buffer.from(timestamp + body),
      key,
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

/** https://developers.facebook.com/docs/graph-api/webhooks/getting-started#validate-payloads */
export function verifyWhatsAppRequest(input: {
  appSecret: string;
  signature: string | null;
  body: string;
}): boolean {
  if (!input.signature) {
    return false;
  }
  const expected = `sha256=${createHmac("sha256", input.appSecret)
    .update(input.body)
    .digest("hex")}`;
  return sameText(expected, input.signature);
}
