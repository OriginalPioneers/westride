import "server-only";
import type { MetaConnection, MetaCredentialKind } from "@westride/db";
import {
  deleteMetaConnection,
  getMetaConnection,
  saveMetaConnection,
  updateMetaApiKey,
} from "@westride/db/meta";
import { keyLabel } from "../idea-factory/credentials";
import { MINTED_KEY_LIFETIME_MS, MuseError, mintApiKey } from "../idea-factory/muse";
import { hasSealingKey, openSecretWith, sealSecretWith } from "../sealed-secret";

const KEY_ENV = "META_TOKEN_ENCRYPTION_KEY";
/** Minted keys are refreshed a little early so a long evaluation never trips over expiry. */
const REFRESH_MARGIN_MS = 15 * 60 * 1000;

/** Meta credentials are only kept when they can be encrypted at rest. */
export function isMetaConnectionConfigured(): boolean {
  return hasSealingKey(KEY_ENV);
}

/** What the browser may know about a connection. Never the key. */
export type MetaConnectionSummary = {
  kind: MetaCredentialKind;
  label: string;
  connectedAt: string;
};

function summarize(connection: Pick<MetaConnection, "kind" | "label" | "createdAt">) {
  return {
    kind: connection.kind,
    label: connection.label,
    connectedAt: connection.createdAt.toISOString(),
  } satisfies MetaConnectionSummary;
}

export async function getMetaConnectionSummary(
  clerkUserId: string,
): Promise<MetaConnectionSummary | null> {
  const connection = await getMetaConnection(clerkUserId);
  return connection ? summarize(connection) : null;
}

/** Keeps a key minted through Meta's device sign-in, and the token that re-mints it. */
export async function saveMetaAccount(
  clerkUserId: string,
  credential: { apiKey: string; identityToken: string },
): Promise<MetaConnectionSummary> {
  const row = {
    clerkUserId,
    kind: "META_ACCOUNT" as const,
    apiKey: sealSecretWith(KEY_ENV, credential.apiKey),
    apiKeyExpiresAt: new Date(Date.now() + MINTED_KEY_LIFETIME_MS),
    identityToken: sealSecretWith(KEY_ENV, credential.identityToken),
    label: "Meta account",
  };
  await saveMetaConnection(row);
  return summarize({ ...row, createdAt: new Date() });
}

/** Keeps a key the member pasted. It lasts until they revoke it at Meta. */
export async function saveMetaApiKey(
  clerkUserId: string,
  apiKey: string,
): Promise<MetaConnectionSummary> {
  const row = {
    clerkUserId,
    kind: "API_KEY" as const,
    apiKey: sealSecretWith(KEY_ENV, apiKey),
    apiKeyExpiresAt: null,
    identityToken: null,
    label: keyLabel(apiKey),
  };
  await saveMetaConnection(row);
  return summarize({ ...row, createdAt: new Date() });
}

export async function disconnectMetaAccount(clerkUserId: string): Promise<void> {
  await deleteMetaConnection(clerkUserId);
}

/**
 * The member's Model API key, re-minted when a connected account's daily key
 * is about to lapse. Null when they have not connected, or Meta no longer
 * accepts their sign-in.
 */
export async function getMuseApiKey(clerkUserId: string): Promise<string | null> {
  const connection = await getMetaConnection(clerkUserId);
  if (!connection) {
    return null;
  }

  const expiresAt = connection.apiKeyExpiresAt?.getTime();
  if (
    connection.kind === "API_KEY" ||
    !connection.identityToken ||
    !expiresAt ||
    expiresAt - REFRESH_MARGIN_MS > Date.now()
  ) {
    return openSecretWith(KEY_ENV, connection.apiKey);
  }

  try {
    const apiKey = await mintApiKey(openSecretWith(KEY_ENV, connection.identityToken));
    await updateMetaApiKey(clerkUserId, {
      apiKey: sealSecretWith(KEY_ENV, apiKey),
      apiKeyExpiresAt: new Date(Date.now() + MINTED_KEY_LIFETIME_MS),
    });
    return apiKey;
  } catch (error) {
    if (error instanceof MuseError && (error.status === 401 || error.status === 403)) {
      await deleteMetaConnection(clerkUserId);
      return null;
    }
    // Meta could not be reached. The current key still works until it lapses.
    if (expiresAt > Date.now()) {
      return openSecretWith(KEY_ENV, connection.apiKey);
    }
    throw error;
  }
}
