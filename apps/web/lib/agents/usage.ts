import type { AgentJobUsagePatch } from "@westride/db/agents";
import type { MuseRunUsage } from "@/lib/build/agent/finish";
import type { MuseUsage } from "@/lib/idea-factory/muse";
import { estimateCostMicros } from "@/lib/idea-factory/pricing";

export const EMPTY_JOB_USAGE: AgentJobUsagePatch = {
  modelCalls: 0,
  inputTokens: 0,
  cachedTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  totalTokens: 0,
  estimatedCostMicros: 0,
};

/**
 * Turns Muse Code's cumulative `run.usage` into the job's usage columns.
 * Each model is priced on its own; a model the price list does not know
 * costs zero rather than a guess, the same rule as the Idea Factory.
 */
export function usageFromMuseRun(usage: MuseRunUsage | null | undefined): AgentJobUsagePatch {
  if (!usage) {
    return EMPTY_JOB_USAGE;
  }
  const totals = { ...EMPTY_JOB_USAGE };
  totals.modelCalls = usage.calls || usage.models.reduce((sum, row) => sum + row.calls, 0);
  for (const row of usage.models) {
    totals.inputTokens += row.inputTokens;
    totals.cachedTokens += row.cachedTokens;
    totals.outputTokens += row.outputTokens;
    totals.reasoningTokens += row.reasoningTokens;
    totals.estimatedCostMicros += estimateCostMicros(row.model, {
      inputTokens: row.inputTokens,
      cachedTokens: row.cachedTokens,
      outputTokens: row.outputTokens,
      webSearchCalls: 0,
    });
  }
  totals.totalTokens = totals.inputTokens + totals.outputTokens;
  return totals;
}

/** One Model API call, as the Idea Factory already measures it. */
export function usageFromMuseAttempt(usage: MuseUsage): AgentJobUsagePatch {
  return {
    modelCalls: 1,
    inputTokens: usage.inputTokens,
    cachedTokens: usage.cachedTokens,
    outputTokens: usage.outputTokens,
    reasoningTokens: usage.reasoningTokens,
    totalTokens: usage.totalTokens,
    estimatedCostMicros: usage.estimatedCostMicros,
  };
}
