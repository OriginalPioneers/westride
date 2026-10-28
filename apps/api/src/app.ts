import type { ApiErrorResponse } from "@westride/api-client";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { academy } from "./routes/academy";

export const app = new Hono();

app.use(logger());
app.use("/v1/*", cors({ origin: "*", allowMethods: ["GET", "OPTIONS"] }));

app.get("/health", (c) => c.json({ ok: true }));

app.route("/v1/academy", academy);

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
