import "server-only";

import { ModalClient } from "modal";

/**
 * The slice of Modal that connecting an account and running sandboxes needs.
 * Modal has no sign-in flow for third parties, so a connection is an API
 * token (an id and a secret) the member created on modal.com. The token is
 * bound to one workspace; the environment within it is a choice.
 */

/** Everything a client needs to act on one Modal workspace. */
export type ModalCredentials = {
  tokenId: string;
  tokenSecret: string;
  /**
   * Modal environment name. Undefined lets the SDK fall back to this server's
   * MODAL_ENVIRONMENT, then the workspace default; that is only right for
   * WeStride's own workspace, so a member's credentials always set it.
   */
  environment: string | undefined;
  /** The Modal app sandboxes are created under. Created on first use. */
  appName: string;
};

/** What Modal's default environment is called in a new workspace. */
export const MODAL_DEFAULT_ENVIRONMENT = "main";
/** The app WeStride creates in a member's workspace to hold their sandboxes. */
export const DEFAULT_MODAL_APP_NAME = "westride-muse-code";

const TOKEN_ID_PREFIX = "ak-";
const TOKEN_SECRET_PREFIX = "as-";

/** Modal token ids start with `ak-` and secrets with `as-`; a swap is the usual paste mistake. */
export function looksLikeModalTokenId(value: string): boolean {
  return value.startsWith(TOKEN_ID_PREFIX) && value.length > TOKEN_ID_PREFIX.length + 4;
}

export function looksLikeModalTokenSecret(value: string): boolean {
  return value.startsWith(TOKEN_SECRET_PREFIX) && value.length > TOKEN_SECRET_PREFIX.length + 4;
}

export function createModalClient(credentials: ModalCredentials): ModalClient {
  return new ModalClient({
    tokenId: credentials.tokenId,
    tokenSecret: credentials.tokenSecret,
    environment: credentials.environment,
  });
}

/** Runs `work` with a client for these credentials and always closes it afterwards. */
export async function withModalClient<T>(
  credentials: ModalCredentials,
  work: (client: ModalClient) => Promise<T>,
): Promise<T> {
  const client = createModalClient(credentials);
  try {
    return await work(client);
  } finally {
    client.close();
  }
}

/**
 * The environments in the token's workspace. Listing them is the cheapest
 * call that proves the token works, so it doubles as the check on connect.
 */
export async function listModalEnvironments(
  credentials: Pick<ModalCredentials, "tokenId" | "tokenSecret">,
): Promise<string[]> {
  return withModalClient(
    { ...credentials, environment: MODAL_DEFAULT_ENVIRONMENT, appName: DEFAULT_MODAL_APP_NAME },
    async (client) => {
      const names: string[] = [];
      for await (const environment of client.environments.objects.list()) {
        names.push(environment.name);
      }
      return names.sort((a, b) =>
        a === MODAL_DEFAULT_ENVIRONMENT ? -1 : b === MODAL_DEFAULT_ENVIRONMENT ? 1 : a.localeCompare(b),
      );
    },
  );
}

/** The environment to start with: Modal's default when it exists, else the first one. */
export function pickDefaultEnvironment(environments: string[]): string {
  return environments.includes(MODAL_DEFAULT_ENVIRONMENT)
    ? MODAL_DEFAULT_ENVIRONMENT
    : (environments[0] ?? MODAL_DEFAULT_ENVIRONMENT);
}

// gRPC status codes, as nice-grpc reports them on `ClientError.code`.
const GRPC_PERMISSION_DENIED = 7;
const GRPC_UNAUTHENTICATED = 16;

function grpcCode(error: unknown): number | null {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "number" ? code : null;
}

/** Whether Modal refused the token itself, as opposed to one request. */
export function isModalAuthError(error: unknown): boolean {
  const code = grpcCode(error);
  if (code === GRPC_UNAUTHENTICATED || code === GRPC_PERMISSION_DENIED) {
    return true;
  }
  const name = (error as { name?: string } | null)?.name;
  return name === "AuthError" || name === "UnauthenticatedError" || name === "PermissionDeniedError";
}

export function isModalNotFound(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === "NotFoundError";
}

/** One line for the member about why a Modal call failed. */
export function describeModalError(error: unknown, fallback: string): string {
  if (isModalAuthError(error)) {
    return "Modal rejected that token.";
  }
  const details = (error as { details?: unknown } | null)?.details;
  if (typeof details === "string" && details.trim()) {
    return `Modal answered: ${details.trim()}`;
  }
  return fallback;
}
