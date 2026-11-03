// ---------------------------------------------------------------------------
// Who is calling. The API accepts two kinds of bearer token, both issued by
// Clerk, the same identity provider the website signs people in with:
//
//   - an OAuth access token, which an MCP client obtains by sending the
//     member through Clerk's sign-in page (the MCP server forwards it here);
//   - a WeStride API key, which a member creates on the website for scripts.
//
// Either way the request resolves to one Clerk user id, and every query runs
// as that member: they see what they could see on the site, no more.
// ---------------------------------------------------------------------------
import { createClerkClient, type ClerkClient } from "@clerk/backend";
import type { TokenType } from "@westride/api-client";
import type { Context, MiddlewareHandler } from "hono";
import { apiError } from "./errors";

export type Caller = {
  userId: string;
  tokenType: TokenType;
};

declare module "hono" {
  interface ContextVariableMap {
    /** Set by `withCaller`. Null when the request carried no token. */
    caller: Caller | null;
  }
}

let client: ClerkClient | null = null;

export function isClerkConfigured(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY);
}

export function clerk(): ClerkClient {
  if (!client) {
    client = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    });
  }
  return client;
}

function bearerToken(c: Context): string | null {
  const header = c.req.header("authorization");
  if (!header) {
    return null;
  }
  const [scheme, token, ...rest] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || rest.length > 0) {
    return "";
  }
  return token;
}

const BEARER_CHALLENGE = 'Bearer realm="WeStride API"';

/**
 * Resolves the caller from the Authorization header. A request with no header
 * continues as a visitor; a header that does not verify is refused, so a
 * caller never silently gets the visitor's view because their key expired.
 */
export const withCaller: MiddlewareHandler = async (c, next) => {
  const token = bearerToken(c);
  if (token === null) {
    c.set("caller", null);
    return next();
  }
  if (token === "" || !isClerkConfigured()) {
    return unauthorized(c, token === "" ? "Send the token as `Authorization: Bearer <token>`." : "Sign-in is not set up on this server.");
  }

  let caller: Caller | null = null;
  try {
    const state = await clerk().authenticateRequest(c.req.raw, {
      acceptsToken: ["oauth_token", "api_key"],
    });
    if (state.isAuthenticated) {
      const auth = state.toAuth();
      const userId =
        auth.tokenType === "oauth_token" || auth.tokenType === "api_key"
          ? auth.userId
          : null;
      if (userId) {
        caller = { userId, tokenType: auth.tokenType };
      }
    }
  } catch (error) {
    console.error("Token verification failed", error);
  }

  if (!caller) {
    return unauthorized(c, "This token is not valid. It may have expired or been revoked.");
  }
  c.set("caller", caller);
  return next();
};

/**
 * Every change needs a caller, so refuse anonymous writes before the body is
 * even validated: a script with a missing key learns that first.
 */
export const writesNeedCaller: MiddlewareHandler = async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS" && !c.get("caller")) {
    return signInRequired(c);
  }
  return next();
};

export function unauthorized(c: Context, message: string) {
  return apiError(c, 401, "unauthorized", message, {
    "WWW-Authenticate": BEARER_CHALLENGE,
  });
}

export function signInRequired(c: Context) {
  return unauthorized(
    c,
    "Sign in to do this. Send a WeStride API key or OAuth access token as a bearer token.",
  );
}

/** The viewer shape the database queries take. */
export function viewerOf(c: Context): { clerkUserId: string | null } {
  return { clerkUserId: c.get("caller")?.userId ?? null };
}
