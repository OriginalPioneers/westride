import type { ApiErrorCode, ApiErrorResponse } from "@westride/api-client";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ZodError } from "zod";

/**
 * The status code stays a literal type so a handler returning `notFound(c)`
 * satisfies the 404 it declared in its route.
 */
export function apiError<S extends ContentfulStatusCode>(
  c: Context,
  status: S,
  code: ApiErrorCode,
  message: string,
  headers?: Record<string, string>,
  fields?: Record<string, string>,
) {
  const body: ApiErrorResponse = {
    error: fields ? { code, message, fields } : { code, message },
  };
  return c.json(body, status, headers);
}

export function notFound(c: Context, what: string) {
  return apiError(c, 404, "not_found", `${what} does not exist, or you cannot see it.`);
}

export function forbidden(c: Context, message: string) {
  return apiError(c, 403, "forbidden", message);
}

export function conflict(c: Context, message: string) {
  return apiError(c, 409, "conflict", message);
}

export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "body";
    fields[key] ??= issue.message;
  }
  return fields;
}

export function validationFailed(
  c: Context,
  message: string,
  fields: Record<string, string> = {},
) {
  return apiError(c, 400, "validation_failed", message, undefined, fields);
}

/** The hook @hono/zod-openapi calls when a request fails its schema. */
export function onValidationError(
  result: { success: boolean; error?: ZodError },
  c: Context,
) {
  if (!result.success && result.error) {
    const fields = fieldErrorsFrom(result.error);
    const names = Object.keys(fields);
    const message =
      names.length === 1
        ? `${names[0]}: ${fields[names[0]!]}`
        : `${names.length} fields need attention. See error.fields.`;
    return validationFailed(c, message, fields);
  }
  return undefined;
}
