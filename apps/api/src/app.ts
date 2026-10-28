import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import {
  WESTRIDE_API_PRODUCTION_URL,
  type ApiErrorResponse,
} from "@westride/api-client";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { explorer } from "./explorer";
import { academy } from "./routes/academy";
import { HealthResponseSchema, jsonContent } from "./schemas";

export const app = new OpenAPIHono();

app.use(logger());
app.use("/v1/*", cors({ origin: "*", allowMethods: ["GET", "OPTIONS"] }));
app.use("/openapi.json", cors({ origin: "*", allowMethods: ["GET", "OPTIONS"] }));

app.get("/", (c) => c.redirect("/docs"));

app.openapi(
  createRoute({
    method: "get",
    path: "/health",
    operationId: "getHealth",
    tags: ["System"],
    summary: "Check API health",
    description:
      "Returns `ok: true` when the API is up. It does not touch the database, so use it for uptime checks.",
    responses: {
      200: jsonContent(HealthResponseSchema, "The API is up."),
    },
  }),
  (c) => c.json({ ok: true as const }, 200),
);

app.route("/v1/academy", academy);

app.doc31("/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "WeStride API",
    version: "1.0.0",
    description:
      "Public, read-only HTTP API for the WeStride platform. It serves the same data as the website, mobile app, and MCP server. No API key is required.",
    contact: { name: "WeStride", url: "https://westride.org/api" },
  },
  servers: [
    { url: WESTRIDE_API_PRODUCTION_URL, description: "Production" },
    { url: "http://localhost:3001", description: "Local development" },
  ],
  tags: [
    {
      name: "Academy",
      description:
        "WeStride Academy: learning tracks from AI fundamentals to launching your own product.",
    },
    { name: "System", description: "Operational endpoints." },
  ],
});

app.route("/docs", explorer);

app.notFound((c) =>
  c.json(
    {
      error: {
        code: "not_found",
        message: `No route for ${c.req.method} ${c.req.path}`,
      },
    } satisfies ApiErrorResponse,
    404,
  ),
);

app.onError((err, c) => {
  console.error(err);
  return c.json(
    {
      error: { code: "internal_error", message: "Something went wrong." },
    } satisfies ApiErrorResponse,
    500,
  );
});

export default app;
