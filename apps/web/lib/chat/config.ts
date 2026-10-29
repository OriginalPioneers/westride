import "server-only";

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export type SlackConfig = {
  clientId: string;
  clientSecret: string;
  signingSecret: string;
};

/** Null turns Slack off: no linking, and slash commands are refused. */
export function getSlackConfig(): SlackConfig | null {
  const clientId = env("SLACK_CLIENT_ID");
  const clientSecret = env("SLACK_CLIENT_SECRET");
  const signingSecret = env("SLACK_SIGNING_SECRET");
  return clientId && clientSecret && signingSecret
    ? { clientId, clientSecret, signingSecret }
    : null;
}

export type DiscordConfig = {
  applicationId: string;
  clientSecret: string;
  /** Hex Ed25519 key Discord signs interactions with. */
  publicKey: string;
};

export function getDiscordConfig(): DiscordConfig | null {
  const applicationId = env("DISCORD_APPLICATION_ID");
  const clientSecret = env("DISCORD_CLIENT_SECRET");
  const publicKey = env("DISCORD_PUBLIC_KEY");
  return applicationId && clientSecret && publicKey
    ? { applicationId, clientSecret, publicKey }
    : null;
}

export type WhatsAppConfig = {
  /** The number members message, digits only, e.g. 15551234567. */
  phoneNumber: string;
  phoneNumberId: string;
  accessToken: string;
  appSecret: string;
  verifyToken: string;
};

export function getWhatsAppConfig(): WhatsAppConfig | null {
  const phoneNumber = env("WHATSAPP_PHONE_NUMBER").replace(/\D/g, "");
  const phoneNumberId = env("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = env("WHATSAPP_ACCESS_TOKEN");
  const appSecret = env("WHATSAPP_APP_SECRET");
  const verifyToken = env("WHATSAPP_VERIFY_TOKEN");
  return phoneNumber && phoneNumberId && accessToken && appSecret && verifyToken
    ? { phoneNumber, phoneNumberId, accessToken, appSecret, verifyToken }
    : null;
}
