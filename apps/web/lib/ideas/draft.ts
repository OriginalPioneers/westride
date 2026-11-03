import "server-only";

import type { IdeaType } from "@westride/db";
import { logMuseRequest } from "@westride/db/idea-factory";
import { z } from "zod";
import { settleMuseRequest } from "@/lib/cloud/billing";
import type { MuseAccess } from "@/lib/cloud/provider";
import { callMuse, parseJsonOutput } from "@/lib/idea-factory/muse";
import { DEFAULT_MUSE_MODEL } from "@/lib/idea-factory/pricing";
import {
  MAX_CATEGORY_NAME,
  MAX_IDEA_CATEGORIES,
  MAX_IDEA_DESCRIPTION,
  MAX_IDEA_NAME,
} from "@/lib/ideas/create-schema";

/**
 * Turns what a member typed (or a repository's README) into a first draft
 * of an idea: name, description, kind, and categories. The member reviews
 * and edits every field before anything is saved.
 */

const IDEA_TYPES = [
  "BUSINESS",
  "NON_PROFIT",
  "GAME",
  "OPEN_SOURCE",
  "WEBSITE",
  "MOBILE_APP",
] as const;

/** Known categories shown to Muse so it reuses them instead of inventing near-duplicates. */
const MAX_KNOWN_CATEGORIES = 200;
const SUGGESTED_CATEGORIES = 3;

export type IdeaDraftSuggestion = {
  name: string;
  description: string;
  type: IdeaType | null;
  categories: string[];
};

const DRAFT_FORMAT = {
  name: "idea_draft",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["name", "description", "type", "categories"],
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      type: { type: "string", enum: [...IDEA_TYPES] },
      categories: { type: "array", items: { type: "string" } },
    },
  },
};

const draftOutputSchema = z.object({
  name: z.string().catch(""),
  description: z.string().catch(""),
  type: z.enum(IDEA_TYPES).nullable().catch(null),
  categories: z.array(z.unknown()).catch([]),
});

function instructions(
  preferredType: IdeaType | null,
  knownCategories: string[],
): string {
  const known = knownCategories.slice(0, MAX_KNOWN_CATEGORIES);
  return [
    "You help members of WeStride, a community for building ideas together, write up a new idea.",
    "Read what the member wrote and return a draft listing as JSON.",
    `- name: a short, specific title, under ${Math.min(60, MAX_IDEA_NAME)} characters. No quotes, no trailing period.`,
    "- description: two or three short paragraphs of Markdown in the member's voice: what it is, who it is for, and why it should exist. Use only what they said; do not invent facts, numbers, or features.",
    "- type: BUSINESS (a product, service, or company), NON_PROFIT (a cause, charity, or community organization), GAME (a video, tabletop, or playable experience), OPEN_SOURCE (a library, tool, or project released under an open license), WEBSITE (a site, blog, portal, or web-based tool where the site itself is the thing being made), or MOBILE_APP (an app for phones or tablets).",
    preferredType
      ? `  The member already chose ${preferredType}; return that.`
      : "  Pick the one that fits best.",
    `- categories: 1 to ${SUGGESTED_CATEGORIES} topic names, each under ${MAX_CATEGORY_NAME} characters, in Title Case.`,
    known.length > 0
      ? `  Prefer these existing categories when one fits: ${known.join(", ")}.`
      : "",
    "Write in the language the member wrote in.",
  ]
    .filter(Boolean)
    .join("\n");
}

function tidyCategories(raw: unknown[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string") {
      continue;
    }
    const name = value.trim().slice(0, MAX_CATEGORY_NAME).trim();
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
  }
  return names.slice(0, Math.min(SUGGESTED_CATEGORIES, MAX_IDEA_CATEGORIES));
}

export type DraftIdeaOutcome =
  | { ok: true; suggestion: IdeaDraftSuggestion }
  | { ok: false; message: string; status: number | null };

/** One Muse call, logged to `muse_requests` and settled like every other. */
export async function draftIdeaWithMuse(input: {
  access: MuseAccess;
  text: string;
  preferredType: IdeaType | null;
  knownCategories: string[];
}): Promise<DraftIdeaOutcome> {
  const model = DEFAULT_MUSE_MODEL;
  const result = await callMuse({
    apiKey: input.access.apiKey,
    model,
    instructions: instructions(input.preferredType, input.knownCategories),
    input: input.text,
    webSearch: false,
    jsonFormat: DRAFT_FORMAT,
    reasoningEffort: "low",
    maxOutputTokens: 2000,
    timeoutMs: 60_000,
  });

  try {
    const logged = await logMuseRequest({
      ideaId: null,
      projectId: null,
      agentId: null,
      clerkUserId: input.access.clerkUserId,
      agentSlug: null,
      purpose: "idea-draft",
      model,
      endpoint: result.attempt.endpoint,
      requestBody: result.attempt.requestBody,
      responseBody: result.attempt.responseBody,
      statusCode: result.attempt.statusCode,
      inputTokens: result.attempt.usage.inputTokens,
      cachedTokens: result.attempt.usage.cachedTokens,
      outputTokens: result.attempt.usage.outputTokens,
      reasoningTokens: result.attempt.usage.reasoningTokens,
      totalTokens: result.attempt.usage.totalTokens,
      webSearchCalls: result.attempt.usage.webSearchCalls,
      estimatedCostMicros: result.attempt.usage.estimatedCostMicros,
      durationMs: result.attempt.durationMs,
      rateLimitRemainingTokens: result.attempt.rateLimit.remainingTokens,
      rateLimitRemainingRequests: result.attempt.rateLimit.remainingRequests,
      error: result.attempt.error,
    });
    await settleMuseRequest(input.access, logged);
  } catch (error) {
    console.error("Muse request log failed", error);
  }

  if (result.attempt.error && !result.text) {
    return {
      ok: false,
      message: result.attempt.error,
      status: result.attempt.statusCode,
    };
  }

  const parsed = draftOutputSchema.safeParse(parseJsonOutput(result.text));
  if (!parsed.success) {
    return { ok: false, message: "Muse returned a draft WeStride could not read.", status: null };
  }
  const draft = parsed.data;
  return {
    ok: true,
    suggestion: {
      name: draft.name.trim().slice(0, MAX_IDEA_NAME).trim(),
      description: draft.description.trim().slice(0, MAX_IDEA_DESCRIPTION).trim(),
      type: input.preferredType ?? draft.type,
      categories: tidyCategories(draft.categories),
    },
  };
}
