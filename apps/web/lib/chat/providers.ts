import "server-only";
import type { ChatPlatform } from "@westride/db";
import { getDiscordConfig, getSlackConfig } from "./config";

/** Who a member is on a chat platform, as its sign-in reports them. */
export type ChatIdentity = {
  externalId: string;
  displayName: string;
  workspaceName: string | null;
};

/** A chat platform members link by signing in, like GitHub. */
export type ChatOAuthProvider = {
  platform: ChatPlatform;
  /** Path segment under /integrations, and the settings query key. */
  slug: "slack" | "discord";
  label: string;
  isConfigured(): boolean;
  authorizeUrl(state: string, redirectUri: string): string;
  identify(code: string, redirectUri: string): Promise<ChatIdentity>;
};

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const body = (await response.json().catch(() => null)) as unknown;
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

export function slackExternalId(teamId: string, userId: string): string {
  return `${teamId}:${userId}`;
}

/** "Sign in with Slack" (OpenID Connect). https://api.slack.com/authentication/sign-in-with-slack */
export const slackProvider: ChatOAuthProvider = {
  platform: "SLACK",
  slug: "slack",
  label: "Slack",
  isConfigured: () => getSlackConfig() !== null,
  authorizeUrl(state, redirectUri) {
    const config = getSlackConfig();
    if (!config) {
      throw new Error("Slack is not configured.");
    }
    const url = new URL("https://slack.com/openid/connect/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid profile");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("state", state);
    url.searchParams.set("redirect_uri", redirectUri);
    return url.toString();
  },
  async identify(code, redirectUri) {
    const config = getSlackConfig();
    if (!config) {
      throw new Error("Slack is not configured.");
    }
    const token = await readJson(
      await fetch("https://slack.com/api/openid.connect.token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
        cache: "no-store",
      }),
    );
    const accessToken = text(token.access_token);
    if (token.ok !== true || !accessToken) {
      throw new Error(`Slack did not issue a token (${String(token.error ?? "unknown")}).`);
    }
    const info = await readJson(
      await fetch("https://slack.com/api/openid.connect.userInfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
    );
    const teamId = text(info["https://slack.com/team_id"]);
    const userId = text(info["https://slack.com/user_id"]);
    if (info.ok !== true || !teamId || !userId) {
      throw new Error("Slack did not say who signed in.");
    }
    return {
      externalId: slackExternalId(teamId, userId),
      displayName: text(info.name) ?? userId,
      workspaceName: text(info["https://slack.com/team_name"]),
    };
  },
};

const DISCORD_API = "https://discord.com/api/v10";

/**
 * Discord OAuth2. `applications.commands` with `integration_type=1` also
 * installs WeStride on the member's own account, so `/westride` works for
 * them in any server or DM.
 * https://discord.com/developers/docs/topics/oauth2
 */
export const discordProvider: ChatOAuthProvider = {
  platform: "DISCORD",
  slug: "discord",
  label: "Discord",
  isConfigured: () => getDiscordConfig() !== null,
  authorizeUrl(state, redirectUri) {
    const config = getDiscordConfig();
    if (!config) {
      throw new Error("Discord is not configured.");
    }
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set("client_id", config.applicationId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "identify applications.commands");
    url.searchParams.set("integration_type", "1");
    url.searchParams.set("state", state);
    url.searchParams.set("redirect_uri", redirectUri);
    return url.toString();
  },
  async identify(code, redirectUri) {
    const config = getDiscordConfig();
    if (!config) {
      throw new Error("Discord is not configured.");
    }
    const token = await readJson(
      await fetch(`${DISCORD_API}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: config.applicationId,
          client_secret: config.clientSecret,
        }),
        cache: "no-store",
      }),
    );
    const accessToken = text(token.access_token);
    if (!accessToken) {
      throw new Error(`Discord did not issue a token (${String(token.error ?? "unknown")}).`);
    }
    const user = await readJson(
      await fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
    );
    const id = text(user.id);
    if (!id) {
      throw new Error("Discord did not say who signed in.");
    }
    return {
      externalId: id,
      displayName: text(user.global_name) ?? text(user.username) ?? id,
      workspaceName: null,
    };
  },
};
