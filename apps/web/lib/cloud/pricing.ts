/**
 * WeStride Cloud prices. Pure functions and constants, safe to import from
 * client components; the rates themselves come from the server (config.ts),
 * which reads the environment and passes a `CloudRates` down.
 *
 * Everything is in USD micros (millionths of a dollar), like the rest of
 * the usage accounting.
 */
import {
  MUSE_IMAGE_MODEL,
  MUSE_MODELS,
  MUSE_TRANSCRIBE_MODEL,
  type MuseModelOption,
} from "../idea-factory/pricing";

export const MICROS_PER_DOLLAR = 1_000_000;

export type CloudRates = {
  /** Added to Meta's list price for model calls, e.g. 20 for 20%. */
  aiMarkupPercent: number;
  /** What one vCPU costs for one hour in a WeStride Cloud sandbox. */
  computeVcpuHourMicros: number;
};

export const DEFAULT_AI_MARKUP_PERCENT = 20;
/** $0.20 per vCPU-hour. Modal bills us about $0.12 for a vCPU and its memory. */
export const DEFAULT_COMPUTE_VCPU_HOUR_MICROS = 200_000;

export const DEFAULT_CLOUD_RATES: CloudRates = {
  aiMarkupPercent: DEFAULT_AI_MARKUP_PERCENT,
  computeVcpuHourMicros: DEFAULT_COMPUTE_VCPU_HOUR_MICROS,
};

/** Sandbox time is billed per second after this minimum. */
export const COMPUTE_MINIMUM_SECONDS = 60;

/** Balance a member needs before WeStride Cloud will start work for them. */
export const MIN_BALANCE_FOR_AI_MICROS = 50_000; // $0.05
export const MIN_BALANCE_FOR_COMPUTE_MICROS = 500_000; // $0.50

/** Top-ups through Stripe. */
export const MIN_TOP_UP_MICROS = 5 * MICROS_PER_DOLLAR;
export const MAX_TOP_UP_MICROS = 500 * MICROS_PER_DOLLAR;
export const TOP_UP_PRESETS_USD = [5, 10, 25, 50, 100] as const;

/** Meta's list price plus WeStride's margin. */
export function applyAiMarkup(listMicros: number, rates: CloudRates): number {
  return Math.round(Math.max(0, listMicros) * (1 + rates.aiMarkupPercent / 100));
}

/** USD per million tokens after markup, for the pricing table. */
export function markedUpPerMillion(listPerMillion: number, rates: CloudRates): number {
  return listPerMillion * (1 + rates.aiMarkupPercent / 100);
}

/**
 * What a sandbox cost: per vCPU, per second, with a one-minute minimum so a
 * run that fails on clone still covers its start-up.
 */
export function computeCostMicros(
  input: { wallClockSeconds: number; vcpus: number },
  rates: CloudRates,
): number {
  const seconds = Math.max(COMPUTE_MINIMUM_SECONDS, Math.ceil(Math.max(0, input.wallClockSeconds)));
  const vcpus = Math.max(1, Math.floor(input.vcpus));
  return Math.round((seconds / 3600) * vcpus * rates.computeVcpuHourMicros);
}

export function wallClockSeconds(startedAt: Date | null, finishedAt: Date | null): number {
  if (!startedAt || !finishedAt) {
    return 0;
  }
  return Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000));
}

export type CloudModelPrice = {
  id: string;
  label: string;
  description: string;
  isContributor: boolean;
  /** USD per million tokens, after markup. */
  inputPerMillion: number;
  cachedInputPerMillion: number;
  outputPerMillion: number;
};

/** The per-model price list members see on the pricing page. */
export function cloudModelPrices(rates: CloudRates): CloudModelPrice[] {
  return MUSE_MODELS.map((model: MuseModelOption) => ({
    id: model.id,
    label: model.label,
    description: model.description,
    isContributor: model.isContributor,
    inputPerMillion: markedUpPerMillion(model.inputPerMillion, rates),
    cachedInputPerMillion: markedUpPerMillion(model.cachedInputPerMillion, rates),
    outputPerMillion: markedUpPerMillion(model.outputPerMillion, rates),
  }));
}

export function cloudImagePriceMicros(rates: CloudRates): number {
  return applyAiMarkup(MUSE_IMAGE_MODEL.perImageMicros, rates);
}

export function cloudTranscriptionHourMicros(rates: CloudRates): number {
  return applyAiMarkup(MUSE_TRANSCRIBE_MODEL.perHourMicros, rates);
}

export function formatUsd(dollars: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(dollars);
}

/** Per-million prices need more precision than cents for the cheap models. */
export function formatPerMillion(perMillion: number): string {
  const digits = perMillion < 0.01 ? 4 : perMillion < 1 ? 3 : 2;
  return `${formatUsd(perMillion, digits)} / 1M tokens`;
}

export function microsToDollars(micros: number): number {
  return micros / MICROS_PER_DOLLAR;
}

export function dollarsToMicros(dollars: number): number {
  return Math.round(dollars * MICROS_PER_DOLLAR);
}

/** Whole cents for Stripe. */
export function microsToCents(micros: number): number {
  return Math.round(micros / 10_000);
}

export function centsToMicros(cents: number): number {
  return cents * 10_000;
}

export function isValidTopUpMicros(micros: number): boolean {
  return (
    Number.isInteger(micros) &&
    micros >= MIN_TOP_UP_MICROS &&
    micros <= MAX_TOP_UP_MICROS &&
    micros % 10_000 === 0
  );
}
