import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  WESTRIDE_API_PRODUCTION_URL,
  createWestrideApi,
} from "@westride/api-client";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { home } from "./home";
import { createMcpServer } from "./server";

const api = createWestrideApi({
  baseUrl: process.env.WESTRIDE_API_URL || WESTRIDE_API_PRODUCTION_URL,
});

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
    exposeHeaders: ["mcp-session-id", "mcp-protocol-version"],
  }),
);

app.route("/", home);

app.get("/health", (c) => c.json({ ok: true }));

// Stateless: every POST gets a fresh server and transport, so instances can
// scale horizontally without sharing session state.
app.post("/mcp", async (c) => {
  const server = createMcpServer(api);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  const response = await transport.handleRequest(c.req.raw);
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
