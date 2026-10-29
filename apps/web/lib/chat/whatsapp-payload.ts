/** A text message from a WhatsApp Cloud API webhook. */
export type WhatsAppIncoming = {
  /** The sender's number, digits only. */
  from: string;
  name: string | null;
  text: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Pulls text messages out of a webhook body. Delivery receipts, media, and
 * anything else WhatsApp sends to the same webhook are skipped.
 * https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */
export function readWhatsAppMessages(payload: unknown): WhatsAppIncoming[] {
  const messages: WhatsAppIncoming[] = [];
  for (const entry of asArray(asRecord(payload)?.entry)) {
    for (const change of asArray(asRecord(entry)?.changes)) {
      const value = asRecord(asRecord(change)?.value);
      if (!value) {
        continue;
      }
      const names = new Map<string, string>();
      for (const contact of asArray(value.contacts)) {
        const record = asRecord(contact);
        const name = asRecord(record?.profile)?.name;
        if (typeof record?.wa_id === "string" && typeof name === "string") {
          names.set(record.wa_id, name);
        }
      }
      for (const message of asArray(value.messages)) {
        const record = asRecord(message);
        const body = asRecord(record?.text)?.body;
        if (
          record?.type !== "text" ||
          typeof record.from !== "string" ||
          typeof body !== "string"
        ) {
          continue;
        }
        messages.push({
          from: record.from.replace(/\D/g, ""),
          name: names.get(record.from) ?? null,
          text: body,
        });
      }
    }
  }
  return messages;
}
