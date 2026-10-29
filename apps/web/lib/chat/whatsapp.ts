import "server-only";
import { randomInt } from "node:crypto";
import { getWhatsAppConfig } from "./config";

const GRAPH_API = "https://graph.facebook.com/v23.0";

/** Unambiguous when read aloud or typed: no 0/O or 1/I/L. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
export const LINK_CODE_LIFETIME_MS = 15 * 60 * 1000;

export function newLinkCode(): string {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/** Opens WhatsApp with the link message typed out, ready to send. */
export function whatsappLinkUrl(phoneNumber: string, code: string): string {
  const url = new URL(`https://wa.me/${phoneNumber}`);
  url.searchParams.set("text", `link ${code}`);
  return url.toString();
}

/**
 * Sends a text reply. Free-form messages are allowed within 24 hours of the
 * member's last message, which a reply always is.
 */
export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  const config = getWhatsAppConfig();
  if (!config) {
    throw new Error("WhatsApp is not configured.");
  }
  const response = await fetch(`${GRAPH_API}/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body, preview_url: false },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`WhatsApp send failed (HTTP ${response.status}): ${detail.slice(0, 500)}`);
  }
}
