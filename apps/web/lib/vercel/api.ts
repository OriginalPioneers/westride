import "server-only";

/**
 * The slice of Vercel's REST API and OAuth server that connecting an account
 * needs: who the token belongs to, which teams and projects it can reach, and
 * the device sign-in that mints a token in the first place.
 */

const API_BASE = "https://api.vercel.com";
const ISSUER = "https://vercel.com";
const DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";
const USER_AGENT = "WeStride";
const TIMEOUT_MS = 30_000;

export class VercelApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null = null,
  ) {
    super(message);
    this.name = "VercelApiError";
  }
}

/** Whether Vercel refused the token itself, as opposed to one request. */
export function isVercelAuthError(error: unknown): boolean {
  return error instanceof VercelApiError && (error.status === 401 || error.status === 403);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** One call to api.vercel.com with a member's token. */
export async function vercelJson<T>(
  path: string,
  options: { token: string; method?: "GET" | "POST" | "DELETE"; body?: unknown },
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${options.token}`,
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await readJson(response);
  if (!response.ok) {
    const error = asRecord(asRecord(data)?.error);
    throw new VercelApiError(
      typeof error?.message === "string" ? error.message : `Vercel answered HTTP ${response.status}.`,
      response.status,
      typeof error?.code === "string" ? error.code : null,
    );
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Account, teams, projects
// ---------------------------------------------------------------------------

export type VercelUser = { id: string; username: string; defaultTeamId: string | null };

export async function getVercelUser(token: string): Promise<VercelUser> {
  const data = await vercelJson<{ user?: Record<string, unknown> }>("/v2/user", { token });
  const user = asRecord(data.user);
  if (!user || typeof user.id !== "string" || typeof user.username !== "string") {
    throw new VercelApiError("Vercel did not say who this token belongs to.", 502);
  }
  return {
    id: user.id,
    username: user.username,
    defaultTeamId: typeof user.defaultTeamId === "string" ? user.defaultTeamId : null,
  };
}

/** Vercel's list envelope: the rows under `key`, and a cursor for the next page. */
type Page<Key extends string> = { [K in Key]?: unknown[] } & {
  pagination?: { next?: number | null };
};

export type VercelTeam = {
  id: string;
  slug: string;
  name: string;
  /** Vercel's plan name, e.g. "hobby", "pro", "enterprise". */
  plan: string | null;
  role: string | null;
};

/** Every team the token can act for, including the member's personal team. */
export async function listVercelTeams(token: string): Promise<VercelTeam[]> {
  const teams: VercelTeam[] = [];
  let until: number | null = null;
  for (let page = 0; page < 10; page += 1) {
    const query: string = until === null ? "limit=100" : `limit=100&until=${until}`;
    const data: Page<"teams"> = await vercelJson<Page<"teams">>(`/v2/teams?${query}`, { token });
    for (const entry of data.teams ?? []) {
      const team = asRecord(entry);
      if (!team || typeof team.id !== "string" || typeof team.slug !== "string") {
        continue;
      }
      const plan = asRecord(team.billing)?.plan;
      const role = asRecord(team.membership)?.role;
      teams.push({
        id: team.id,
        slug: team.slug,
        name: typeof team.name === "string" && team.name ? team.name : team.slug,
        plan: typeof plan === "string" ? plan : null,
        role: typeof role === "string" ? role : null,
      });
    }
    until = typeof data.pagination?.next === "number" ? data.pagination.next : null;
    if (until === null) {
      break;
    }
  }
  return teams;
}

export type VercelProject = { id: string; name: string };

export async function listVercelProjects(token: string, teamId: string): Promise<VercelProject[]> {
  const projects: VercelProject[] = [];
  let until: number | null = null;
  for (let page = 0; page < 10; page += 1) {
    const query: string = `teamId=${encodeURIComponent(teamId)}&limit=100${until === null ? "" : `&until=${until}`}`;
    const data: Page<"projects"> = await vercelJson<Page<"projects">>(`/v10/projects?${query}`, { token });
    for (const entry of data.projects ?? []) {
      const project = asRecord(entry);
      if (project && typeof project.id === "string" && typeof project.name === "string") {
        projects.push({ id: project.id, name: project.name });
      }
    }
    until = typeof data.pagination?.next === "number" ? data.pagination.next : null;
    if (until === null) {
      break;
    }
  }
  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

/** The project WeStride creates when the member has none to spare. */
export const DEFAULT_SANDBOX_PROJECT_NAME = "westride-muse-code";

export async function createVercelProject(
  token: string,
  teamId: string,
  name: string,
): Promise<VercelProject> {
  const data = await vercelJson<Record<string, unknown>>(
    `/v11/projects?teamId=${encodeURIComponent(teamId)}`,
    { token, method: "POST", body: { name } },
  );
  if (typeof data.id !== "string" || typeof data.name !== "string") {
    throw new VercelApiError("Vercel did not return the new project.", 502);
  }
  return { id: data.id, name: data.name };
}

// ---------------------------------------------------------------------------
// Device sign-in (RFC 8628) against vercel.com
// ---------------------------------------------------------------------------

/**
 * The OAuth client the device flow runs as. Vercel's own CLI and Sandbox SDK
 * use a public client id; it is not documented for third parties, so it is
 * optional. Without it, members paste an access token.
 */
export function vercelDeviceClientId(): string | null {
  const id = process.env.VERCEL_DEVICE_CLIENT_ID?.trim();
  return id ? id : null;
}

type AuthorizationServer = {
  device_authorization_endpoint: string;
  token_endpoint: string;
  revocation_endpoint: string | null;
};

let authorizationServer: Promise<AuthorizationServer> | null = null;

function discoverAuthorizationServer(): Promise<AuthorizationServer> {
  if (!authorizationServer) {
    authorizationServer = (async () => {
      const response = await fetch(`${ISSUER}/.well-known/openid-configuration`, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const data = asRecord(await readJson(response));
      const device = data?.device_authorization_endpoint;
      const token = data?.token_endpoint;
      if (!response.ok || typeof device !== "string" || typeof token !== "string") {
        throw new VercelApiError("Vercel's sign-in service could not be reached.", response.status || 502);
      }
      return {
        device_authorization_endpoint: device,
        token_endpoint: token,
        revocation_endpoint: typeof data?.revocation_endpoint === "string" ? data.revocation_endpoint : null,
      };
    })().catch((error: unknown) => {
      // Do not pin a failure; the next call tries again.
      authorizationServer = null;
      throw error;
    });
  }
  return authorizationServer;
}

async function postForm(
  url: string,
  fields: Record<string, string>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams(fields).toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { status: response.status, body: asRecord(await readJson(response)) ?? {} };
}

export type VercelDeviceAuthorization = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  intervalSeconds: number;
  expiresInSeconds: number;
};

const asNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

export async function startVercelDeviceAuthorization(clientId: string): Promise<VercelDeviceAuthorization> {
  const server = await discoverAuthorizationServer();
  const { status, body } = await postForm(server.device_authorization_endpoint, {
    client_id: clientId,
    scope: "openid offline_access",
  });
  if (status < 200 || status >= 300) {
    throw new VercelApiError(`Vercel sign-in could not be started (HTTP ${status}).`, status);
  }
  const verificationUri =
    typeof body.verification_uri_complete === "string"
      ? body.verification_uri_complete
      : typeof body.verification_uri === "string"
        ? body.verification_uri
        : null;
  if (
    typeof body.device_code !== "string" ||
    typeof body.user_code !== "string" ||
    !verificationUri ||
    !/^https:\/\//.test(verificationUri)
  ) {
    throw new VercelApiError("Vercel sign-in returned an incomplete response.", status);
  }
  return {
    deviceCode: body.device_code,
    userCode: body.user_code,
    verificationUri,
    intervalSeconds: asNumber(body.interval) || 5,
    expiresInSeconds: asNumber(body.expires_in) || 900,
  };
}

export type VercelTokenSet = {
  accessToken: string;
  /** Null when Vercel did not say; treated as long-lived. */
  expiresAt: Date | null;
  refreshToken: string | null;
};

function readTokenSet(body: Record<string, unknown>): VercelTokenSet | null {
  if (typeof body.access_token !== "string" || !body.access_token) {
    return null;
  }
  const expiresIn = asNumber(body.expires_in);
  return {
    accessToken: body.access_token,
    expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : null,
    refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : null,
  };
}

export type VercelDevicePoll =
  | { status: "pending" }
  | { status: "slow_down"; intervalSeconds: number }
  | { status: "authorized"; tokens: VercelTokenSet }
  | { status: "denied" | "expired" };

export async function pollVercelDeviceAuthorization(
  clientId: string,
  deviceCode: string,
): Promise<VercelDevicePoll> {
  const server = await discoverAuthorizationServer();
  const { status, body } = await postForm(server.token_endpoint, {
    client_id: clientId,
    grant_type: DEVICE_GRANT,
    device_code: deviceCode,
  });
  const tokens = status >= 200 && status < 300 ? readTokenSet(body) : null;
  if (tokens) {
    return { status: "authorized", tokens };
  }
  switch (body.error) {
    case "authorization_pending":
      return { status: "pending" };
    case "slow_down":
      return { status: "slow_down", intervalSeconds: asNumber(body.interval) || 5 };
    case "access_denied":
      return { status: "denied" };
    case "expired_token":
      return { status: "expired" };
    default:
      throw new VercelApiError(`Vercel sign-in failed (HTTP ${status}).`, status);
  }
}

export class VercelRefreshError extends Error {
  constructor(
    message: string,
    /** True when Vercel rejected the refresh token itself, so the connection is dead. */
    readonly revoked: boolean,
  ) {
    super(message);
    this.name = "VercelRefreshError";
  }
}

export async function refreshVercelToken(clientId: string, refreshToken: string): Promise<VercelTokenSet> {
  const server = await discoverAuthorizationServer();
  const { status, body } = await postForm(server.token_endpoint, {
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const tokens = status >= 200 && status < 300 ? readTokenSet(body) : null;
  if (tokens) {
    // Vercel may rotate the refresh token; when it does not, the old one stays valid.
    return { ...tokens, refreshToken: tokens.refreshToken ?? refreshToken };
  }
  const code = typeof body.error === "string" ? body.error : null;
  throw new VercelRefreshError(
    `Vercel would not renew the sign-in (${code ?? `HTTP ${status}`}).`,
    code === "invalid_grant" || code === "invalid_client" || code === "unauthorized_client",
  );
}

/** Best effort; a token that cannot be revoked still lapses on its own. */
export async function revokeVercelToken(clientId: string, token: string): Promise<void> {
  const server = await discoverAuthorizationServer();
  if (!server.revocation_endpoint) {
    return;
  }
  await postForm(server.revocation_endpoint, { client_id: clientId, token });
}
