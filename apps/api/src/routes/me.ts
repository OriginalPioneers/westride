import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { signInRequired } from "../auth";
import { onValidationError } from "../errors";
import { resolvePerson } from "../people";
import {
  PersonSchema,
  bearerSecurity,
  internalErrorResponse,
  jsonContent,
  unauthorizedResponse,
} from "../schemas/common";

export const MeSchema = PersonSchema.extend({
  tokenType: z.enum(["oauth_token", "api_key"]).openapi({
    description: "How this request was authenticated.",
  }),
}).openapi("Me");

const meRoute = createRoute({
  method: "get",
  path: "/",
  operationId: "getMe",
  tags: ["Me"],
  summary: "Who am I",
  description:
    "The member the bearer token belongs to. Use it to check a token and to learn your own member id, which `members[]` and `invites[]` fields refer to.",
  security: bearerSecurity,
  responses: {
    200: jsonContent(z.object({ data: MeSchema }), "The caller."),
    401: unauthorizedResponse,
    500: internalErrorResponse,
  },
});

export const me = new OpenAPIHono({ defaultHook: onValidationError });

me.openapi(meRoute, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const person = await resolvePerson(caller.userId);
  return c.json({ data: { ...person, tokenType: caller.tokenType } }, 200);
});
