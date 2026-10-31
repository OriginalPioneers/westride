import "server-only";
import { Resend } from "resend";

type EmailConfig = {
  apiKey: string;
  from: string;
  /** Who hears about things that need the team's attention. */
  teamRecipients: string[];
};

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/** `RESEND_TO_EMAIL` holds one address or several, separated by commas. */
export function parseRecipients(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,;\n]/)
        .map((address) => address.trim())
        .filter((address) => address.includes("@")),
    ),
  ];
}

export function getEmailConfig(): EmailConfig | null {
  const apiKey = env("RESEND_API_KEY");
  const from = env("RESEND_FROM_EMAIL");
  if (!apiKey || !from) {
    return null;
  }
  return { apiKey, from, teamRecipients: parseRecipients(env("RESEND_TO_EMAIL")) };
}

export function isEmailConfigured(): boolean {
  return getEmailConfig() !== null;
}

export type EmailMessage = {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

let client: Resend | undefined;

function resend(apiKey: string): Resend {
  client ??= new Resend(apiKey);
  return client;
}

/** Sends one email. Resolves false, and logs, when it could not be sent. */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const config = getEmailConfig();
  if (!config || message.to.length === 0) {
    return false;
  }
  try {
    const { error } = await resend(config.apiKey).emails.send({
      from: config.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
    });
    if (error) {
      console.error("Email send failed", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Email send failed", error);
    return false;
  }
}

/** Emails everyone in `RESEND_TO_EMAIL`. */
export async function sendTeamEmail(
  message: Omit<EmailMessage, "to">,
): Promise<boolean> {
  const config = getEmailConfig();
  if (!config) {
    return false;
  }
  return sendEmail({ ...message, to: config.teamRecipients });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
