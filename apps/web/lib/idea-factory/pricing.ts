/**
 * Published Meta Model API prices (https://dev.meta.ai/docs/pricing-rate-limits),
 * used to estimate what each request cost. Meta does not expose an account
 * balance or a billing API, so these are estimates from the price list and
 * the usage numbers each response reports.
 */

export type MuseModelId =
  | "muse-spark-1.3"
  | "muse-spark-1.3-contributor"
  | "muse-wonder-1.0";

export type MuseModelOption = {
  id: MuseModelId;
  label: string;
  description: string;
  /** USD per million tokens. */
  inputPerMillion: number;
  cachedInputPerMillion: number;
  outputPerMillion: number;
  /** Content may be used by Meta to train future models. */
  isContributor: boolean;
};

export const MUSE_MODELS: MuseModelOption[] = [
  {
    id: "muse-spark-1.3",
    label: "Muse Spark 1.3",
    description: "Fast and capable. Standard pricing; your content is not used for training.",
    inputPerMillion: 1.25,
    cachedInputPerMillion: 0.15,
    outputPerMillion: 4.25,
    isContributor: false,
  },
  {
    id: "muse-spark-1.3-contributor",
    label: "Muse Spark 1.3 (Contributor)",
    description:
      "About 90% cheaper. Meta may use your prompts and responses to train future models.",
    inputPerMillion: 0.1,
    cachedInputPerMillion: 0.002,
    outputPerMillion: 0.2,
    isContributor: true,
  },
  {
    id: "muse-wonder-1.0",
    label: "Muse Wonder 1.0",
    description: "Meta's most capable model. Several times the cost of Spark.",
    inputPerMillion: 4,
    cachedInputPerMillion: 0.2,
    outputPerMillion: 20,
    isContributor: false,
  },
];

export const DEFAULT_MUSE_MODEL: MuseModelId = "muse-spark-1.3";

/** USD per web search query, billed on top of tokens. */
const WEB_SEARCH_PER_QUERY = 2.5 / 1000;

const MICROS_PER_DOLLAR = 1_000_000;

export function isMuseModelId(value: string): value is MuseModelId {
  return MUSE_MODELS.some((model) => model.id === value);
}

export function getMuseModel(id: string): MuseModelOption | undefined {
  return MUSE_MODELS.find((model) => model.id === id);
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
