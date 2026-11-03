import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  WESTRIDE_API_PRODUCTION_URL,
  createWestrideApi,
} from "@westride/api-client";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import {
  authorizationServerMetadataFor,
  bearerToken,
  challenge,
  protectedResourceMetadata,
  publishableKey,
  verifyToken,
} from "./auth";
import { home } from "./home";
import { createMcpServer } from "./server";

const API_BASE_URL = process.env.WESTRIDE_API_URL || WESTRIDE_API_PRODUCTION_URL;

export const app = new Hono();

app.use(logger());
app.use(
  "/mcp",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: [
      "content-type",
      "authorization",
      "mcp-protocol-version",
      "mcp-session-id",
      "last-event-id",
    ],
    exposeHeaders: ["mcp-session-id", "mcp-protocol-version", "www-authenticate"],
  }),
);
app.use("/.well-known/*", cors({ origin: "*", allowMethods: ["GET", "OPTIONS"], maxAge: 86400 }));

app.route("/", home);

app.get("/health", (c) => c.json({ ok: true }));

/** Where this server is reachable from outside, honouring the proxy in front of it. */
function publicOrigin(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

// ---------------------------------------------------------------------------
// OAuth discovery (RFC 9728 / RFC 8414), so MCP clients can find Clerk and
// sign the member in without any manual configuration.
// ---------------------------------------------------------------------------

app.on("GET", ["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"], (c) => {
  const key = publishableKey();
  if (!key) {
    return c.json({ error: "Sign-in is not configured on this server." }, 503);
  }
  c.header("Cache-Control", "public, max-age=3600");
  return c.json(protectedResourceMetadata(publicOrigin(c.req.raw), key));
});

app.get("/.well-known/oauth-authorization-server", async (c) => {
  const key = publishableKey();
  if (!key) {
    return c.json({ error: "Sign-in is not configured on this server." }, 503);
  }
  c.header("Cache-Control", "public, max-age=3600");
  return c.json(await authorizationServerMetadataFor(key));
});

// ---------------------------------------------------------------------------
// MCP endpoint. Stateless: every POST gets a fresh server and transport bound
// to the caller's token, so instances scale horizontally without shared
// session state, and no tool can ever act as anyone but the caller.
// ---------------------------------------------------------------------------

app.post("/mcp", async (c) => {
  const origin = publicOrigin(c.req.raw);
  const token = bearerToken(c.req.raw);
  if (!token) {
    return challenge(origin);
  }
  const verified = await verifyToken(API_BASE_URL, token);
  if (!verified) {
    return challenge(origin, "invalid_token", "This token is not valid. It may have expired or been revoked.");
  }

  const api = createWestrideApi({ baseUrl: API_BASE_URL, token });
  const server = createMcpServer(api, verified.me);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  const response = await transport.handleRequest(c.req.raw, { authInfo: verified.authInfo });
  await server.close();
  return response;
});

app.on(["GET", "DELETE"], "/mcp", (c) =>
  c.json(
    {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    },
    405,
    { Allow: "POST" },
  ),
);

export default app;
