import "server-only";
import {
  deleteGithubConnection,
  getGithubConnection,
  saveGithubConnection,
  updateGithubTokens,
} from "@westride/db/github";
import { getGithubAppConfig, requireGithubAppConfig } from "./config";
import { openSecret, sealSecret } from "./crypto";
import { githubJson } from "./http";

const TOKEN_URL = "https://github.com/login/oauth/access_token";
const REFRESH_MARGIN_MS = 2 * 60 * 1000;

export const GITHUB_CALLBACK_PATH = "/integrations/github/callback";

export function githubCallbackUrl(origin: string): string {
  return `${origin}${GITHUB_CALLBACK_PATH}`;
}

/** Signs the member in to GitHub and asks them to authorize the app. */
export function githubAuthorizeUrl(state: string, redirectUri: string): string {
  const { clientId } = requireGithubAppConfig();
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

/**
 * Installs the app on an account or organization. GitHub's page is where the
 * member chooses all repositories or only the ones they pick.
 */
export function githubInstallUrl(state: string): string {
  const { slug } = requireGithubAppConfig();
  const url = new URL(`https://github.com/apps/${slug}/installations/new`);
  url.searchParams.set("state", state);
  return url.toString();
}

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  error?: string;
  error_description?: string;
};

export type GithubUserTokens = {
  accessToken: string;
  accessTokenExpiresAt: Date | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: Date | null;
};

export class GithubAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "GithubAuthError";
  }
}

function secondsFromNow(seconds: number | undefined): Date | null {
  return seconds ? new Date(Date.now() + seconds * 1000) : null;
}

async function requestTokens(
  params: Record<string, string>,
): Promise<GithubUserTokens> {
  const { clientId, clientSecret } = requireGithubAppConfig();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "WeStride",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      ...params,
    }),
    cache: "no-store",
  });
  // GitHub reports OAuth failures as 200 with an `error` field.
  const data = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok || data.error || !data.access_token) {
    throw new GithubAuthError(
      data.error ?? `http_${response.status}`,
      data.error_description ?? "GitHub did not issue a token.",
    );
  }
  return {
    accessToken: data.access_token,
    accessTokenExpiresAt: secondsFromNow(data.expires_in),
    refreshToken: data.refresh_token ?? null,
    refreshTokenExpiresAt: secondsFromNow(data.refresh_token_expires_in),
  };
}

export function exchangeGithubCode(
  code: string,
  redirectUri: string,
): Promise<GithubUserTokens> {
  return requestTokens({ code, redirect_uri: redirectUri });
}

type GithubUser = { id: number; login: string; avatar_url: string | null };

function sealTokens(tokens: GithubUserTokens) {
  return {
    accessToken: sealSecret(tokens.accessToken),
    accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    refreshToken: tokens.refreshToken ? sealSecret(tokens.refreshToken) : null,
    refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
  };
}

/** Stores the member's GitHub identity and tokens, replacing any earlier link. */
export async function saveGithubAccount(
  clerkUserId: string,
  tokens: GithubUserTokens,
): Promise<GithubUser> {
  const user = await githubJson<GithubUser>("/user", {
    token: tokens.accessToken,
  });
  await saveGithubConnection({
    clerkUserId,
    githubUserId: user.id,
    login: user.login,
    avatarUrl: user.avatar_url,
    ...sealTokens(tokens),
  });
  return user;
}

/**
 * The member's user access token, refreshed when it is about to expire.
 * GitHub limits it to repositories both the member and the app can reach.
 * Null when they have not connected, or GitHub no longer accepts the grant.
 */
export async function getGithubUserToken(
  clerkUserId: string,
): Promise<string | null> {
  const connection = await getGithubConnection(clerkUserId);
  if (!connection) {
    return null;
  }

  const expiresAt = connection.accessTokenExpiresAt?.getTime();
  if (!expiresAt || expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return openSecret(connection.accessToken);
  }

  const refreshUsable =
    connection.refreshToken &&
    (!connection.refreshTokenExpiresAt ||
      connection.refreshTokenExpiresAt.getTime() > Date.now());
  if (!refreshUsable || !connection.refreshToken) {
    await deleteGithubConnection(clerkUserId);
    return null;
  }

  try {
    const tokens = await requestTokens({
      grant_type: "refresh_token",
      refresh_token: openSecret(connection.refreshToken),
    });
    await updateGithubTokens(clerkUserId, sealTokens(tokens));
    return tokens.accessToken;
  } catch (error) {
    // Refresh tokens are single-use. A parallel request may have already
    // swapped this one, so prefer whatever is stored now.
    const latest = await getGithubConnection(clerkUserId);
    if (latest && latest.updatedAt > connection.updatedAt) {
      return openSecret(latest.accessToken);
    }
    if (error instanceof GithubAuthError && error.code === "bad_refresh_token") {
      await deleteGithubConnection(clerkUserId);
      return null;
    }
    throw error;
  }
}

/** Forgets the connection and asks GitHub to revoke the member's grant. */
export async function disconnectGithubAccount(
  clerkUserId: string,
): Promise<void> {
  const connection = await getGithubConnection(clerkUserId);
  if (!connection) {
    return;
  }
  const config = getGithubAppConfig();
  if (!config) {
    await deleteGithubConnection(clerkUserId);
    return;
  }
  const { clientId, clientSecret } = config;
  try {
    await fetch(`https://api.github.com/applications/${clientId}/grant`, {
      method: "DELETE",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/json",
        "User-Agent": "WeStride",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ access_token: openSecret(connection.accessToken) }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("GitHub grant revoke failed", error);
  }
  await deleteGithubConnection(clerkUserId);
}
