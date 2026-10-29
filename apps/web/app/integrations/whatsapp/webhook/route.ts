import { after, type NextRequest } from "next/server";
import { answerChat } from "@/lib/chat/answer";
import { getWhatsAppConfig } from "@/lib/chat/config";
import { toWhatsAppText } from "@/lib/chat/render";
import { verifyWhatsAppRequest } from "@/lib/chat/verify";
import { sendWhatsAppText } from "@/lib/chat/whatsapp";
import { readWhatsAppMessages } from "@/lib/chat/whatsapp-payload";

/** Meta's one-time check when this URL is saved as the app's webhook callback. */
export function GET(request: NextRequest) {
  const config = getWhatsAppConfig();
  const params = request.nextUrl.searchParams;
  if (
    config &&
    params.get("hub.mode") === "subscribe" &&
    params.get("hub.verify_token") === config.verifyToken
  ) {
    return new Response(params.get("hub.challenge") ?? "", {
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new Response("Forbidden.", { status: 403 });
}

/**
 * Incoming WhatsApp messages. Meta retries anything not acknowledged quickly,
 * so this answers at once and replies after the response is sent.
 */
export async function POST(request: NextRequest) {
  const config = getWhatsAppConfig();
  if (!config) {
    return new Response("WhatsApp is not set up on this WeStride server.", { status: 503 });
  }
  const body = await request.text();
  const verified = verifyWhatsAppRequest({
    appSecret: config.appSecret,
    signature: request.headers.get("x-hub-signature-256"),
    body,
  });
  if (!verified) {
    return new Response("Invalid request signature.", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON.", { status: 400 });
  }

  const messages = readWhatsAppMessages(payload);
  const origin = request.nextUrl.origin;
  after(async () => {
    for (const message of messages) {
      try {
        const reply = await answerChat(
          {
            platform: "WHATSAPP",
            externalId: message.from,
            displayName: message.name ?? `+${message.from}`,
          },
          message.text,
          origin,
        );
        await sendWhatsAppText(message.from, toWhatsAppText(reply));
      } catch (error) {
        console.error("WhatsApp reply failed", error);
      }
    }
  });
  return new Response("OK");
}
