import "server-only";
import { createSign } from "node:crypto";
import { requireGithubAppConfig } from "./config";
import { githubJson } from "./http";
import type { GithubRepoRef } from "./repo-ref";

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

/** Authenticates as the app itself. Only good for `/app/...` endpoints. */
function appJwt(): string {
  const config = requireGithubAppConfig();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  // Backdated for clock drift. GitHub rejects anything over ten minutes.
  const payload = base64url(
    JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: config.clientId }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  return `${header}.${payload}.${signer.sign(config.privateKey, "base64url")}`;
}

type InstallationToken = { token: string; expires_at: string };

type TokenRequest = {
  repository_ids?: number[];
  permissions?: Record<string, "read" | "write">;
};

const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * Installation tokens act as the app's bot account, so anything written with
 * one is attributed to WeStride rather than to the member.
 */
export async function installationToken(
  installationId: number,
  scope: TokenRequest = {},
): Promise<string> {
  const cacheKey = `${installationId}:${JSON.stringify(scope)}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return cached.token;
  }

  const created = await githubJson<InstallationToken>(
    `/app/installations/${installationId}/access_tokens`,
    { method: "POST", token: appJwt(), body: scope },
  );
  tokenCache.set(cacheKey, {
    token: created.token,
    expiresAt: Date.parse(created.expires_at),
  });
  return created.token;
}

/** Which installation of the app covers a repository. Throws 404 when none does. */
export async function repoInstallationId(ref: GithubRepoRef): Promise<number> {
  const installation = await githubJson<{ id: number }>(
    `/repos/${ref.owner}/${ref.repo}/installation`,
    { token: appJwt() },
  );
  return installation.id;
}

/**
 * A read-only token from WeStride's own installation. GitHub lets it read any
 * public repository, at the app's rate limit instead of the anonymous one.
 */
export async function publicReadToken(): Promise<string | null> {
  const { homeInstallationId } = requireGithubAppConfig();
  if (!homeInstallationId) {
    return null;
  }
  try {
    return await installationToken(homeInstallationId, {
      permissions: { metadata: "read", contents: "read" },
    });
  } catch (error) {
    console.error("GitHub home installation token failed", error);
    return null;
  }
}
