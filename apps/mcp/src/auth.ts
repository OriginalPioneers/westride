// ---------------------------------------------------------------------------
// The MCP server is an OAuth resource server, as the MCP spec describes.
// Clerk, the identity provider the website uses, is the authorization
// server: a client that hits /mcp without a token gets a 401 pointing at the
// protected-resource metadata below, discovers Clerk from it, registers
// itself, and sends the member through WeStride sign-in. The access token it
// receives is forwarded to the WeStride API on every tool call, so a member
// can do exactly what they could do on the website.
//
// Tokens are verified by the API itself (GET /v1/me), which also accepts
// WeStride API keys, so clients that let a user paste a bearer token work too.
// ---------------------------------------------------------------------------
import {
  fetchClerkAuthorizationServerMetadata,
  generateClerkProtectedResourceMetadata,
} from "@clerk/mcp-tools/server";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { WestrideApiError, createWestrideApi, type Me } from "@westride/api-client";

const VERIFY_CACHE_TTL_MS = 60 * 1000;
const VERIFY_CACHE_MAX = 1000;

export type Verified = { me: Me; authInfo: AuthInfo };

type CacheEntry = { verified: Verified; expiresAt: number };

const cache = new Map<string, CacheEntry>();

export function publishableKey(): string | null {
  return process.env.CLERK_PUBLISHABLE_KEY || null;
}

/** The token from an Authorization header, or null when there is none. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }
  const [scheme, token, ...rest] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || rest.length > 0) {
    return null;
  }
  return token;
}

async function hash(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Checks a token with the API and describes the caller. A short cache keeps
 * a chatty client from hitting /v1/me on every tool call; a revoked token
 * stops working within a minute.
 */
export async function verifyToken(apiBaseUrl: string, token: string): Promise<Verified | null> {
  const key = await hash(token);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.verified;
  }

  const api = createWestrideApi({ baseUrl: apiBaseUrl, token });
  let me: Me;
  try {
    me = await api.getMe();
  } catch (error) {
    if (error instanceof WestrideApiError && error.status === 401) {
      return null;
    }
    throw error;
  }

  const verified: Verified = {
    me,
    authInfo: {
      token,
      clientId: me.tokenType === "api_key" ? "westride-api-key" : "westride-oauth",
      scopes: [],
      extra: { userId: me.id, tokenType: me.tokenType },
    },
  };
  if (cache.size >= VERIFY_CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) {
      cache.delete(oldest);
    }
  }
  cache.set(key, { verified, expiresAt: now + VERIFY_CACHE_TTL_MS });
  return verified;
}

export function resourceMetadataUrl(origin: string): string {
  return `${origin}/.well-known/oauth-protected-resource/mcp`;
}

/** RFC 9728 protected-resource metadata, naming Clerk as the authorization server. */
export function protectedResourceMetadata(origin: string, key: string) {
  return generateClerkProtectedResourceMetadata({
    publishableKey: key,
    resourceUrl: `${origin}/mcp`,
    properties: {
      resource_name: "WeStride MCP",
      scopes_supported: ["profile", "email"],
      bearer_methods_supported: ["header"],
      service_documentation: origin,
    },
  });
}

let authorizationServerMetadata: { value: unknown; expiresAt: number } | null = null;

/** Clerk's authorization-server metadata, mirrored for clients that look for it here. */
export async function authorizationServerMetadataFor(key: string): Promise<unknown> {
  const now = Date.now();
  if (authorizationServerMetadata && authorizationServerMetadata.expiresAt > now) {
    return authorizationServerMetadata.value;
  }
  const value = await fetchClerkAuthorizationServerMetadata({ publishableKey: key });
  authorizationServerMetadata = { value, expiresAt: now + 10 * 60 * 1000 };
  return value;
}

/** The 401 an MCP client reads to start sign-in. */
export function challenge(origin: string, error?: "invalid_token", description?: string): Response {
  const parts = [`Bearer resource_metadata="${resourceMetadataUrl(origin)}"`];
  if (error) {
    parts.push(`error="${error}"`);
  }
  if (description) {
    parts.push(`error_description="${description.replace(/"/g, "'")}"`);
  }
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message:
          description ??
          "Sign in with WeStride to use this server. Your MCP client should open the sign-in page automatically.",
      },
      id: null,
    }),
    {
      status: 401,
      headers: {
        "content-type": "application/json",
        "www-authenticate": parts.join(", "),
      },
    },
  );
}
