import { z } from "@hono/zod-openapi";
import { MAX_CLERK_USER_ID } from "@westride/db/limits";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export const ApiErrorSchema = z
  .object({
    error: z.object({
      code: z
        .enum([
          "not_found",
          "unauthorized",
          "forbidden",
          "validation_failed",
          "conflict",
          "internal_error",
        ])
        .openapi({ description: "Stable, machine-readable error code." }),
      message: z
        .string()
        .openapi({ description: "Human-readable explanation of the error." }),
      fields: z
        .record(z.string(), z.string())
        .optional()
        .openapi({
          description:
            "For validation_failed: one message per field that failed, keyed by its dotted path.",
          example: { name: "Give the idea a name." },
        }),
    }),
  })
  .openapi("ApiError", {
    description: "Every non-2xx response uses this envelope.",
  });

export function jsonContent<T extends z.ZodType>(schema: T, description: string) {
  return {
    description,
    content: { "application/json": { schema } },
  };
}

export const internalErrorResponse = jsonContent(ApiErrorSchema, "Unexpected server error.");
export const unauthorizedResponse = jsonContent(
  ApiErrorSchema,
  "No bearer token was sent, or it did not verify.",
);
export const forbiddenResponse = jsonContent(
  ApiErrorSchema,
  "The caller is signed in but may not do this.",
);
export const notFoundResponse = jsonContent(
  ApiErrorSchema,
  "Nothing with that id is visible to the caller.",
);
export const validationResponse = jsonContent(
  ApiErrorSchema,
  "The request body or parameters failed validation. `error.fields` says which.",
);

export const conflictResponse = jsonContent(
  ApiErrorSchema,
  "The change clashes with the current state, for example a job is still running.",
);

/** Responses every authenticated write shares. */
export const writeErrorResponses = {
  400: validationResponse,
  401: unauthorizedResponse,
  403: forbiddenResponse,
  404: notFoundResponse,
  500: internalErrorResponse,
};

/** Responses every optionally authenticated read shares. */
export const readErrorResponses = {
  401: unauthorizedResponse,
  404: notFoundResponse,
  500: internalErrorResponse,
};

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

export const BEARER_SCHEME = "bearerAuth";

/** Marks a route as accepting a bearer token. Reads may still work without one. */
export const bearerSecurity = [{ [BEARER_SCHEME]: [] }];

// ---------------------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------------------

export const uuid = () =>
  z.string().uuid().openapi({ example: "3f6c2a8e-1b2d-4c5e-9f7a-0b1c2d3e4f5a" });

export const timestamp = () =>
  z.string().datetime().openapi({ description: "ISO 8601, UTC.", example: "2026-03-14T09:26:53.000Z" });

export const nullableTimestamp = () => timestamp().nullable();

export const userId = () =>
  z.string().trim().min(1).max(MAX_CLERK_USER_ID).openapi({
    description: "A member's id, as returned in `members[].id` or by GET /v1/me.",
    example: "user_2x9Fh3kLmN0pQrStUvWxYz",
  });

export const PersonSchema = z
  .object({
    id: userId(),
    name: z.string().openapi({ example: "Ada Lovelace" }),
    username: z.string().nullable().openapi({ example: "ada" }),
    imageUrl: z.string().nullable().openapi({ description: "Avatar URL, when they have one." }),
  })
  .openapi("Person", { description: "A WeStride member as other members see them." });

export const GithubRepoLinkSchema = z
  .object({
    owner: z.string().openapi({ example: "WeStrideOrg" }),
    name: z.string().openapi({ example: "westride" }),
    htmlUrl: z.string().openapi({ example: "https://github.com/WeStrideOrg/westride" }),
    defaultBranch: z.string().openapi({ example: "main" }),
    isPrivate: z.boolean(),
  })
  .openapi("GithubRepoLink");

export const ContentOriginSchema = z.enum(["MEMBER", "IMPORT"]).openapi({
  description:
    "MEMBER when a member created it. IMPORT when WeStride imported it from GitHub and nobody has claimed it yet.",
});

export const TicketStatusSchema = z
  .enum(["BACKLOG", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE"])
  .openapi("TicketStatus");

export const TicketPrioritySchema = z
  .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
  .openapi("TicketPriority");

export const TicketCountsSchema = z
  .object({
    BACKLOG: z.number().int(),
    IN_PROGRESS: z.number().int(),
    IN_REVIEW: z.number().int(),
    BLOCKED: z.number().int(),
    DONE: z.number().int(),
  })
  .openapi("TicketCounts", { description: "How many tickets sit in each status." });

export const CollectionSortSchema = z
  .enum(["updated", "newest", "oldest", "name-asc", "name-desc"])
  .openapi({ description: "Sort order. Defaults to `updated`, most recently changed first." });

/** A query flag: `true`, `1`, or `yes` turn it on. */
export const flag = () =>
  z
    .enum(["true", "false", "1", "0", "yes", "no"])
    .optional()
    .transform((value) => value === "true" || value === "1" || value === "yes");

export const EmptyResponseSchema = z.object({ data: z.object({ ok: z.literal(true) }) });

/** A JSON body that may be `null` to clear the field, trimmed when a string. */
export const nullableText = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]).transform((value) => value || null);

export const optionalUuid = () =>
  z
    .union([uuid(), z.literal(""), z.null()])
    .transform((value) => value || null);
