import "server-only";

import type { ModalConnection } from "@westride/db";
import { setSandboxProvider } from "@westride/db/cloud";
import {
  deleteModalConnection,
  getModalConnection,
  saveModalConnection,
  updateModalEnvironment,
} from "@westride/db/modal";
import { hasSealingKey, openSecretWith, sealSecretWith } from "../sealed-secret";
import {
  DEFAULT_MODAL_APP_NAME,
  listModalEnvironments,
  MODAL_DEFAULT_ENVIRONMENT,
  pickDefaultEnvironment,
  type ModalCredentials,
} from "./client";

const KEY_ENV = "MODAL_TOKEN_ENCRYPTION_KEY";
const SUFFIX_LENGTH = 4;

/** Modal tokens are only kept when they can be encrypted at rest. */
export function isModalConnectionConfigured(): boolean {
  return hasSealingKey(KEY_ENV);
}

/** What the browser may know about a connection. Never the token. */
export type ModalConnectionSummary = {
  /** `ak-…1234`, enough to recognise the token on modal.com. */
  tokenLabel: string;
  environment: string;
  appName: string;
  connectedAt: string;
};

function summarize(connection: ModalConnection): ModalConnectionSummary {
  return {
    tokenLabel: `ak-…${connection.tokenIdSuffix}`,
    environment: connection.environment ?? MODAL_DEFAULT_ENVIRONMENT,
    appName: connection.appName,
    connectedAt: connection.createdAt.toISOString(),
  };
}

export async function getModalConnectionSummary(
  clerkUserId: string,
): Promise<ModalConnectionSummary | null> {
  if (!isModalConnectionConfigured()) {
    return null;
  }
  const connection = await getModalConnection(clerkUserId);
  return connection ? summarize(connection) : null;
}

/** Whether the member can start a sandbox on their own Modal account right now. */
export async function hasModalSandboxAccess(clerkUserId: string): Promise<boolean> {
  if (!isModalConnectionConfigured()) {
    return false;
  }
  return (await getModalConnection(clerkUserId)) !== null;
}

/**
 * Checks the token against Modal, then keeps it on the member's account. The
 * environment starts as Modal's default when the workspace has one. A newly
 * connected account becomes the one sandboxes run on.
 */
export async function saveModalToken(
  clerkUserId: string,
  token: { tokenId: string; tokenSecret: string },
): Promise<{ connection: ModalConnectionSummary; environments: string[] }> {
  const environments = await listModalEnvironments(token);
  await saveModalConnection({
    clerkUserId,
    tokenId: sealSecretWith(KEY_ENV, token.tokenId),
    tokenSecret: sealSecretWith(KEY_ENV, token.tokenSecret),
    tokenIdSuffix: token.tokenId.slice(-SUFFIX_LENGTH),
    environment: pickDefaultEnvironment(environments),
    appName: DEFAULT_MODAL_APP_NAME,
  });
  await setSandboxProvider(clerkUserId, "MODAL");
  const saved = await getModalConnection(clerkUserId);
  if (!saved) {
    throw new Error("The Modal connection was not saved.");
  }
  return { connection: summarize(saved), environments };
}

/** Records the environment the member's sandboxes run in. */
export async function setModalEnvironment(
  clerkUserId: string,
  environment: string,
): Promise<ModalConnectionSummary | null> {
  await updateModalEnvironment(clerkUserId, environment);
  return getModalConnectionSummary(clerkUserId);
}

/**
 * Everything a sandbox needs to run on the member's Modal account. Null when
 * they have not connected one.
 */
export async function getModalSandboxCredentials(
  clerkUserId: string,
): Promise<ModalCredentials | null> {
  if (!isModalConnectionConfigured()) {
    return null;
  }
  const connection = await getModalConnection(clerkUserId);
  if (!connection) {
    return null;
  }
  return {
    tokenId: openSecretWith(KEY_ENV, connection.tokenId),
    tokenSecret: openSecretWith(KEY_ENV, connection.tokenSecret),
    environment: connection.environment ?? MODAL_DEFAULT_ENVIRONMENT,
    appName: connection.appName,
  };
}

/** Forgets the token. Modal tokens cannot be revoked from outside; the member does that on modal.com. */
export async function disconnectModalAccount(clerkUserId: string): Promise<void> {
  await deleteModalConnection(clerkUserId);
}
