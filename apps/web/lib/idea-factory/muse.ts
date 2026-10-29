import "server-only";

import type { MuseSource } from "@westride/db";
import { estimateCostMicros } from "./pricing";

/**
 * A thin client for Meta Model API (https://dev.meta.ai/docs). The member's
 * key arrives with each call and is used for exactly that call; nothing here
 * persists it, and the request body we return for logging never contains it.
 */

export const MUSE_API_BASE = "https://api.meta.ai/v1";
const RESPONSES_ENDPOINT = "/responses";
const MODELS_ENDPOINT = "/models";

/** Muse can take a while with web search and high reasoning effort. */
const REQUEST_TIMEOUT_MS = 170_000;

export class MuseError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "MuseError";
  }
}

export type MuseInputItem = { role: "user" | "assistant"; content: string };

export type MuseJsonFormat = {
  name: string;
  schema: Record<string, unknown>;
};

export type MuseCallOptions = {
  apiKey: string;
  model: string;
  instructions: string;
  input: string | MuseInputItem[];
  webSearch: boolean;
  jsonFormat?: MuseJsonFormat;
  reasoningEffort?: "low" | "medium" | "high";
  maxOutputTokens?: number;
  timeoutMs?: number;
};

export type MuseUsage = {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  webSearchCalls: number;
  estimatedCostMicros: number;
};

export type MuseRateLimit = {
  remainingTokens: number | null;
  remainingRequests: number | null;
};

/** Everything the log needs, whether or not the call succeeded. */
export type MuseAttempt = {
  endpoint: string;
  requestBody: Record<string, unknown>;
  responseBody: unknown;
  statusCode: number | null;
  durationMs: number;
  usage: MuseUsage;
  rateLimit: MuseRateLimit;
  error: string | null;
};

export type MuseResult = {
  attempt: MuseAttempt;
  /** Concatenated `output_text`. */
  text: string;
  sources: MuseSource[];
};

type ResponsesPayload = {
  model: string;
  instructions: string;
  input: string | MuseInputItem[];
  reasoning?: { effort: string };
  tools?: { type: "web_search"; search_context_size?: "low" | "medium" | "high" }[];
  include?: string[];
  text?: { format: { type: "json_schema"; name: string; schema: Record<string, unknown> } };
  max_output_tokens?: number;
  store?: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function headerInt(headers: Headers, name: string): number | null {
  const raw = headers.get(name);
  if (raw === null) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function readUsage(body: unknown, model: string): MuseUsage {
  const record = asRecord(body);
  const usage = asRecord(record?.usage);
  const inputDetails = asRecord(usage?.input_tokens_details);
  const outputDetails = asRecord(usage?.output_tokens_details);
  const output = Array.isArray(record?.output) ? record.output : [];
  const webSearchCalls = output.filter(
    (item) => asRecord(item)?.type === "web_search_call",
  ).length;

  const counts = {
    inputTokens: asNumber(usage?.input_tokens),
    cachedTokens: asNumber(inputDetails?.cached_tokens),
    outputTokens: asNumber(usage?.output_tokens),
    reasoningTokens: asNumber(outputDetails?.reasoning_tokens),
    totalTokens: asNumber(usage?.total_tokens),
    webSearchCalls,
  };
  return {
    ...counts,
    estimatedCostMicros: estimateCostMicros(model, counts),
  };
}

const EMPTY_USAGE: MuseUsage = {
  inputTokens: 0,
  cachedTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  totalTokens: 0,
  webSearchCalls: 0,
  estimatedCostMicros: 0,
};

/** Pulls the answer and its citations out of a Responses API body. */
function readOutput(body: unknown): { text: string; sources: MuseSource[] } {
  const record = asRecord(body);
  const output = Array.isArray(record?.output) ? record.output : [];
  const texts: string[] = [];
  const sources = new Map<string, MuseSource>();

  for (const item of output) {
    const message = asRecord(item);
    if (message?.type !== "message" || !Array.isArray(message.content)) {
      continue;
    }
    for (const block of message.content) {
      const part = asRecord(block);
      if (part?.type !== "output_text" || typeof part.text !== "string") {
        continue;
      }
      texts.push(part.text);
      const annotations = Array.isArray(part.annotations) ? part.annotations : [];
      for (const annotation of annotations) {
        const citation = asRecord(annotation);
        if (
          citation?.type === "url_citation" &&
          typeof citation.url === "string" &&
          !sources.has(citation.url)
        ) {
          sources.set(citation.url, {
            url: citation.url,
            title: typeof citation.title === "string" ? citation.title : null,
            date: null,
          });
        }
      }
    }
  }

  return { text: texts.join("\n\n").trim(), sources: [...sources.values()] };
}

function errorMessage(status: number, body: unknown): string {
  const error = asRecord(asRecord(body)?.error);
  const detail = typeof error?.message === "string" ? error.message : null;
  switch (status) {
    case 401:
      // Meta's own detail is just "Unauthorized"; say what to do instead.
      return "Meta rejected that API key. Check it was copied in full, or reconnect your Meta account.";
    case 403:
      return detail ?? "This Meta account cannot use that model.";
    case 429:
      return detail ?? "Meta's rate limit was hit. Wait a moment and try again.";
    default:
      return detail ?? `Meta Model API returned HTTP ${status}.`;
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text.slice(0, 4000) };
  }
}

/**
 * One call to `POST /v1/responses`. Never throws for an API error: the
 * attempt records what happened so it can be logged, and `error` is set.
 * Network failures are recorded the same way.
 */
export async function callMuse(options: MuseCallOptions): Promise<MuseResult> {
  const payload: ResponsesPayload = {
    model: options.model,
    instructions: options.instructions,
    input: options.input,
    reasoning: { effort: options.reasoningEffort ?? "medium" },
    store: false,
  };
  if (options.webSearch) {
    payload.tools = [{ type: "web_search", search_context_size: "medium" }];
    payload.include = ["web_search_call.results"];
  }
  if (options.jsonFormat) {
    payload.text = {
      format: {
        type: "json_schema",
        name: options.jsonFormat.name,
        schema: options.jsonFormat.schema,
      },
    };
  }
  if (options.maxOutputTokens) {
    payload.max_output_tokens = options.maxOutputTokens;
  }

  const requestBody = payload as unknown as Record<string, unknown>;
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${MUSE_API_BASE}${RESPONSES_ENDPOINT}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await readBody(response);
    const durationMs = Date.now() - started;
    const rateLimit: MuseRateLimit = {
      remainingTokens: headerInt(response.headers, "x-ratelimit-remaining-tokens"),
      remainingRequests: headerInt(
        response.headers,
        "x-ratelimit-remaining-requests",
      ),
    };

    if (!response.ok) {
      return {
        attempt: {
          endpoint: RESPONSES_ENDPOINT,
          requestBody,
          responseBody: body,
          statusCode: response.status,
          durationMs,
          usage: EMPTY_USAGE,
          rateLimit,
          error: errorMessage(response.status, body),
        },
        text: "",
        sources: [],
      };
    }

    const { text, sources } = readOutput(body);
    const record = asRecord(body);
    const incomplete =
      record?.status === "incomplete"
        ? `Muse stopped early (${String(asRecord(record.incomplete_details)?.reason ?? "unknown reason")}).`
        : null;

    return {
      attempt: {
        endpoint: RESPONSES_ENDPOINT,
        requestBody,
        responseBody: body,
        statusCode: response.status,
        durationMs,
        usage: readUsage(body, options.model),
        rateLimit,
        error: text ? incomplete : (incomplete ?? "Muse returned no text."),
      },
      text,
      sources,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      attempt: {
        endpoint: RESPONSES_ENDPOINT,
        requestBody,
        responseBody: null,
        statusCode: null,
        durationMs: Date.now() - started,
        usage: EMPTY_USAGE,
        rateLimit: { remainingTokens: null, remainingRequests: null },
        error: aborted
          ? "Muse took too long to answer. Try again, or ask a narrower question."
          : "Meta Model API could not be reached.",
      },
      text: "",
      sources: [],
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Parses a structured-output answer, tolerating a stray code fence. */
export function parseJsonOutput<T>(text: string): T | null {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

/** `GET /v1/models`: the cheapest way to confirm a key works. */
export async function listMuseModels(
  apiKey: string,
): Promise<{ ok: true; models: string[] } | { ok: false; error: string }> {
  try {
    const response = await fetch(`${MUSE_API_BASE}${MODELS_ENDPOINT}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    const body = await readBody(response);
    if (!response.ok) {
      return { ok: false, error: errorMessage(response.status, body) };
    }
    const data = asRecord(body)?.data;
    const models = Array.isArray(data)
      ? data.flatMap((item) => {
          const id = asRecord(item)?.id;
          return typeof id === "string" ? [id] : [];
        })
      : [];
    return { ok: true, models };
  } catch {
    return { ok: false, error: "Meta Model API could not be reached." };
  }
}

// ---------------------------------------------------------------------------
// Connect a Meta account (OAuth 2.0 device authorization, RFC 8628)
//
// This is the flow Meta's own Muse Code CLI uses to sign in through a
// browser and mint a Model API key. Meta has not published it for third-party
// apps, so it is enabled only when META_DEVICE_CLIENT_ID is configured, and
// pasting an API key is always available as the documented alternative.
// ---------------------------------------------------------------------------

const DEVICE_AUTH_BASE = "https://auth.meta.com/oidc/device";
const DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";
const KEY_MINT_URL = "https://api.meta.ai/muse-code/key";
const KEY_MINT_API_VERSION = "1.0.0";
/** Minted keys are good for about a day. */
export const MINTED_KEY_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function deviceClientId(): string | null {
  const id = process.env.META_DEVICE_CLIENT_ID?.trim();
  return id ? id : null;
}

export type DeviceAuthorization = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  intervalSeconds: number;
  expiresInSeconds: number;
};

async function postForm(
  url: string,
  fields: Record<string, string>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(fields).toString(),
    signal: AbortSignal.timeout(30_000),
  });
  const body = asRecord(await readBody(response)) ?? {};
  return { status: response.status, body };
}

export async function startDeviceAuthorization(
  clientId: string,
): Promise<DeviceAuthorization> {
  const { status, body } = await postForm(`${DEVICE_AUTH_BASE}/authorization/`, {
    client_id: clientId,
  });
  if (status < 200 || status >= 300) {
    throw new MuseError(`Meta sign-in could not be started (HTTP ${status}).`, status, body);
  }
  const verificationUri =
    typeof body.verification_uri_complete === "string"
      ? body.verification_uri_complete
      : typeof body.verification_uri === "string"
        ? body.verification_uri
        : null;
  if (
    typeof body.device_code !== "string" ||
    typeof body.user_code !== "string" ||
    !verificationUri ||
    !/^https?:\/\//.test(verificationUri)
  ) {
    throw new MuseError("Meta sign-in returned an incomplete response.", status, body);
  }
  return {
    deviceCode: body.device_code,
    userCode: body.user_code,
    verificationUri,
    intervalSeconds: asNumber(body.interval) || 5,
    expiresInSeconds: asNumber(body.expires_in) || 900,
  };
}

export type DevicePoll =
  | { status: "pending" }
  | { status: "slow_down"; intervalSeconds: number }
  | { status: "authorized"; identityToken: string }
  | { status: "denied" | "expired" };

export async function pollDeviceAuthorization(
  clientId: string,
  deviceCode: string,
): Promise<DevicePoll> {
  const { status, body } = await postForm(`${DEVICE_AUTH_BASE}/token/`, {
    grant_type: DEVICE_GRANT,
    device_code: deviceCode,
    client_id: clientId,
  });
  if (status >= 200 && status < 300 && typeof body.access_token === "string") {
    return { status: "authorized", identityToken: body.access_token };
  }
  switch (body.error) {
    case "authorization_pending":
      return { status: "pending" };
    case "slow_down":
      return { status: "slow_down", intervalSeconds: asNumber(body.interval) || 5 };
    case "access_denied":
      return { status: "denied" };
    case "expired_token":
      return { status: "expired" };
    default:
      throw new MuseError(`Meta sign-in failed (HTTP ${status}).`, status, body);
  }
}

/** Exchanges the identity token for a Model API key (`LLM_...`). */
export async function mintApiKey(identityToken: string): Promise<string> {
  const response = await fetch(KEY_MINT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${identityToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-api-version": KEY_MINT_API_VERSION,
    },
    body: "{}",
    signal: AbortSignal.timeout(30_000),
  });
  const body = asRecord(await readBody(response)) ?? {};
  if (response.status === 401 || response.status === 403) {
    throw new MuseError("Your Meta session has expired. Connect again.", response.status, body);
  }
  if (!response.ok) {
    throw new MuseError(
      `Meta could not issue an API key (HTTP ${response.status}).`,
      response.status,
      body,
    );
  }
  if (typeof body.api_key !== "string" || !body.api_key) {
    const action = typeof body.action_url === "string" ? ` Finish setup at ${body.action_url}.` : "";
    throw new MuseError(`Meta did not issue an API key.${action}`, response.status, body);
  }
  return body.api_key;
}
