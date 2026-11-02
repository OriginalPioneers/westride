/**
 * Published Meta Model API prices (https://dev.meta.ai/docs/pricing-rate-limits),
 * used to estimate what each request cost. Meta does not expose an account
 * balance or a billing API, so these are estimates from the price list and
 * the usage numbers each response reports.
 */

// The text models and their prices live in @westride/db so the API and the
// MCP server validate the same list. Re-exported here for existing imports.
import { getMuseModel } from "@westride/db/muse-models";

export {
  DEFAULT_MUSE_MODEL,
  MUSE_MODELS,
  getMuseModel,
  isMuseModelId,
  type MuseModelId,
  type MuseModelOption,
} from "@westride/db/muse-models";

/**
 * Image models are billed per image, not per token, and only make pictures,
 * so they stay out of MUSE_MODELS and the text-model pickers built from it.
 */
export const MUSE_IMAGE_MODEL = {
  id: "muse-image-1.0",
  label: "Muse Image 1.0",
  description: "Meta's image model. $0.01 per image, billed to your Meta account.",
  perImageMicros: 10_000,
} as const;

/**
 * Speech to text is billed by the hour of audio processed, not by token, so
 * it stays out of MUSE_MODELS as well.
 */
export const MUSE_TRANSCRIBE_MODEL = {
  id: "muse-voice-transcribe-1.0",
  label: "Muse Voice Transcribe 1.0",
  description:
    "Meta's speech-to-text model. $0.18 per hour of audio, billed to your Meta account.",
  perHourMicros: 180_000,
} as const;

/** USD per web search query, billed on top of tokens. */
const WEB_SEARCH_PER_QUERY = 2.5 / 1000;

const MICROS_PER_DOLLAR = 1_000_000;
const SECONDS_PER_HOUR = 3600;

/** Meta meters audio in whole seconds, rounding down. */
export function estimateTranscriptionCostMicros(audioDurationMs: number): number {
  const seconds = Math.floor(Math.max(0, audioDurationMs) / 1000);
  return Math.round((seconds / SECONDS_PER_HOUR) * MUSE_TRANSCRIBE_MODEL.perHourMicros);
}

export type UsageCounts = {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  webSearchCalls: number;
};

/** Cost in millionths of a dollar. Unknown models cost zero rather than guess. */
export function estimateCostMicros(model: string, usage: UsageCounts): number {
  const price = getMuseModel(model);
  if (!price) {
    return 0;
  }
  const uncached = Math.max(0, usage.inputTokens - usage.cachedTokens);
  const dollars =
    (uncached * price.inputPerMillion +
      usage.cachedTokens * price.cachedInputPerMillion +
      usage.outputTokens * price.outputPerMillion) /
      1_000_000 +
    usage.webSearchCalls * WEB_SEARCH_PER_QUERY;
  return Math.round(dollars * MICROS_PER_DOLLAR);
}

export function formatMicrosAsUsd(micros: number): string {
  const dollars = micros / MICROS_PER_DOLLAR;
  if (dollars === 0) {
    return "$0.00";
  }
  if (dollars < 0.01) {
    return `$${dollars.toFixed(4)}`;
  }
  return `$${dollars.toFixed(2)}`;
}

export function formatTokens(count: number): string {
  return new Intl.NumberFormat("en-US").format(count);
}
