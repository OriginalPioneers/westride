import "server-only";

import type { VercelConnection, VercelCredentialKind } from "@westride/db";
import {
  deleteVercelConnection,
  getVercelConnection,
  saveVercelConnection,
  updateVercelScope,
  updateVercelTokens,
} from "@westride/db/vercel";
import { hasSealingKey, openSecretWith, sealSecretWith } from "../sealed-secret";
import {
  getVercelUser,
  refreshVercelToken,
  revokeVercelToken,
  vercelDeviceClientId,
  VercelRefreshError,
  type VercelTokenSet,
} from "./api";

const KEY_ENV = "VERCEL_TOKEN_ENCRYPTION_KEY";
/** Sign-in tokens are renewed a little early so a run never starts on a dying one. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** Vercel credentials are only kept when they can be encrypted at rest. */
export function isVercelConnectionConfigured(): boolean {
  return hasSealingKey(KEY_ENV);
}

/** What the browser may know about a connection. Never the token. */
export type VercelConnectionSummary = {
  kind: VercelCredentialKind;
  username: string;
  connectedAt: string;
  /** Null until the member has picked where sandboxes run. */
  scope: {
    teamId: string;
    teamSlug: string;
    teamName: string;
    projectId: string;
    projectName: string;
  } | null;
};

/** What `Sandbox.create` and `Sandbox.get` need to act on the member's account. */
export type VercelSandboxCredentials = { token: string; teamId: string; projectId: string };

function summarize(connection: VercelConnection): VercelConnectionSummary {
  const scoped =
    connection.teamId && connection.projectId
      ? {
          teamId: connection.teamId,
          teamSlug: connection.teamSlug ?? connection.teamId,
          teamName: connection.teamName ?? connection.teamSlug ?? connection.teamId,
          projectId: connection.projectId,
          projectName: connection.projectName ?? connection.projectId,
        }
      : null;
  return {
    kind: connection.kind,
    username: connection.username,
    connectedAt: connection.createdAt.toISOString(),
    scope: scoped,
  };
}

export async function getVercelConnectionSummary(
  clerkUserId: string,
): Promise<VercelConnectionSummary | null> {
  const connection = await getVercelConnection(clerkUserId);
  return connection ? summarize(connection) : null;
}

/** Whether the member can start a sandbox right now: connected and scoped. */
export async function hasVercelSandboxAccess(clerkUserId: string): Promise<boolean> {
  if (!isVercelConnectionConfigured()) {
    return false;
  }
  const connection = await getVercelConnection(clerkUserId);
  return Boolean(connection?.teamId && connection?.projectId);
}

function sealTokens(tokens: VercelTokenSet) {
  return {
    accessToken: sealSecretWith(KEY_ENV, tokens.accessToken),
    accessTokenExpiresAt: tokens.expiresAt,
    refreshToken: tokens.refreshToken ? sealSecretWith(KEY_ENV, tokens.refreshToken) : null,
  };
}

/** Keeps a token from Vercel's device sign-in, and the refresh token that renews it. */
export async function saveVercelAccount(
  clerkUserId: string,
  tokens: VercelTokenSet,
): Promise<VercelConnectionSummary> {
  const user = await getVercelUser(tokens.accessToken);
  await saveVercelConnection({
    clerkUserId,
    kind: "VERCEL_ACCOUNT",
    vercelUserId: user.id,
    username: user.username,
    ...sealTokens(tokens),
  });
  const saved = await getVercelConnection(clerkUserId);
  if (!saved) {
    throw new Error("The Vercel connection was not saved.");
  }
  return summarize(saved);
}

/** Keeps an access token the member created on vercel.com. It lasts until they revoke it. */
export async function saveVercelAccessToken(
  clerkUserId: string,
  accessToken: string,
): Promise<VercelConnectionSummary> {
  const user = await getVercelUser(accessToken);
  await saveVercelConnection({
    clerkUserId,
    kind: "ACCESS_TOKEN",
    vercelUserId: user.id,
    username: user.username,
    accessToken: sealSecretWith(KEY_ENV, accessToken),
    accessTokenExpiresAt: null,
    refreshToken: null,
  });
  const saved = await getVercelConnection(clerkUserId);
  if (!saved) {
    throw new Error("The Vercel connection was not saved.");
  }
  return summarize(saved);
}

/** Records the team and project the member's sandboxes run under. */
export async function setVercelScope(
  clerkUserId: string,
  scope: { teamId: string; teamSlug: string; teamName: string; projectId: string; projectName: string },
): Promise<VercelConnectionSummary | null> {
  await updateVercelScope(clerkUserId, scope);
  return getVercelConnectionSummary(clerkUserId);
}

/**
 * The member's Vercel API token, renewed when a device sign-in token is about
 * to lapse. Null when they have not connected, or Vercel no longer accepts
 * their sign-in.
 */
export async function getVercelAccessToken(clerkUserId: string): Promise<string | null> {
  const connection = await getVercelConnection(clerkUserId);
  if (!connection) {
    return null;
  }
  const expiresAt = connection.accessTokenExpiresAt?.getTime();
  if (
    connection.kind === "ACCESS_TOKEN" ||
    !connection.refreshToken ||
    !expiresAt ||
    expiresAt - REFRESH_MARGIN_MS > Date.now()
  ) {
    return openSecretWith(KEY_ENV, connection.accessToken);
  }

  const clientId = vercelDeviceClientId();
  if (!clientId) {
    // The server lost its client id; the current token still works until it lapses.
    return expiresAt > Date.now() ? openSecretWith(KEY_ENV, connection.accessToken) : null;
  }
  try {
    const tokens = await refreshVercelToken(clientId, openSecretWith(KEY_ENV, connection.refreshToken));
    await updateVercelTokens(clerkUserId, sealTokens(tokens));
    return tokens.accessToken;
  } catch (error) {
    // A parallel request may have renewed first; prefer whatever is stored now.
    const latest = await getVercelConnection(clerkUserId);
    if (latest && latest.updatedAt > connection.updatedAt) {
      return openSecretWith(KEY_ENV, latest.accessToken);
    }
    if (error instanceof VercelRefreshError && error.revoked) {
      await deleteVercelConnection(clerkUserId);
      return null;
    }
    // Vercel could not be reached. The current token still works until it lapses.
    if (expiresAt > Date.now()) {
      return openSecretWith(KEY_ENV, connection.accessToken);
    }
    throw error;
  }
}

/**
 * Everything a sandbox needs to run on the member's Vercel account. Null when
 * they have not connected, or have not chosen a team and project yet.
 */
export async function getVercelSandboxCredentials(
  clerkUserId: string,
): Promise<VercelSandboxCredentials | null> {
  if (!isVercelConnectionConfigured()) {
    return null;
  }
  const connection = await getVercelConnection(clerkUserId);
  if (!connection?.teamId || !connection.projectId) {
    return null;
  }
  const token = await getVercelAccessToken(clerkUserId);
  return token ? { token, teamId: connection.teamId, projectId: connection.projectId } : null;
}

/** Forgets the connection and, for a device sign-in, asks Vercel to revoke it. */
export async function disconnectVercelAccount(clerkUserId: string): Promise<void> {
  const connection = await getVercelConnection(clerkUserId);
  if (!connection) {
    return;
  }
  const clientId = vercelDeviceClientId();
  if (connection.kind === "VERCEL_ACCOUNT" && clientId) {
    try {
      await revokeVercelToken(
        clientId,
        openSecretWith(KEY_ENV, connection.refreshToken ?? connection.accessToken),
      );
    } catch (error) {
      console.error("Vercel token revoke failed", error);
    }
  }
  await deleteVercelConnection(clerkUserId);
}
