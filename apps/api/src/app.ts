import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import {
  WESTRIDE_API_PRODUCTION_URL,
  type ApiErrorResponse,
} from "@westride/api-client";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { withCaller, writesNeedCaller } from "./auth";
import { explorer } from "./explorer";
import { academy } from "./routes/academy";
import { agents } from "./routes/agents";
import { ideas } from "./routes/ideas";
import { me } from "./routes/me";
import { projects } from "./routes/projects";
import { HealthResponseSchema, jsonContent } from "./schemas";
import { BEARER_SCHEME } from "./schemas/common";

export const app = new OpenAPIHono();

app.use(logger());
app.use(
  "/v1/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    exposeHeaders: ["WWW-Authenticate"],
    maxAge: 86400,
  }),
);
app.use("/openapi.json", cors({ origin: "*", allowMethods: ["GET", "OPTIONS"] }));
app.use("/v1/*", withCaller);
app.use("/v1/*", writesNeedCaller);

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

app.route("/v1/me", me);
app.route("/v1/ideas", ideas);
app.route("/v1/projects", projects);
app.route("/v1/agents", agents);
app.route("/v1/academy", academy);

app.openAPIRegistry.registerComponent("securitySchemes", BEARER_SCHEME, {
  type: "http",
  scheme: "bearer",
  description:
    "A WeStride API key (create one at https://westride.org/settings/api) or an OAuth access token issued by WeStride sign-in. Public data needs no token; anything about you, your private work, or any change does.",
});

app.doc31("/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "WeStride API",
    version: "2.0.0",
    description: [
      "The HTTP API for the WeStride platform: ideas, the projects that build them, the agents that work on them, and the Academy.",
      "",
      "Public data (public ideas, projects, agents, and every Academy track) needs no token. Send a bearer token to see your private work and to make changes; you can do exactly what you could do signed in on the website, no more.",
      "",
      "Every response is JSON. Successful responses wrap their payload in `data`; errors use `{ error: { code, message, fields? } }`.",
    ].join("\n"),
    contact: { name: "WeStride", url: "https://westride.org/settings/api" },
  },
  servers: [
    { url: WESTRIDE_API_PRODUCTION_URL, description: "Production" },
    { url: "http://localhost:3001", description: "Local development" },
  ],
  tags: [
    { name: "Me", description: "The member behind the token." },
    {
      name: "Ideas",
      description:
        "Ideas are where things start on WeStride: a name, a pitch, a team, and the categories and countries it touches.",
    },
    {
      name: "Projects",
      description:
        "Projects build ideas. Each has a team, linked repositories, milestones, and a ticket board.",
    },
    {
      name: "Agents",
      description:
        "Agents are Muse-powered workers that take tickets from a queue, on demand or on a schedule, and report what they did.",
    },
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
