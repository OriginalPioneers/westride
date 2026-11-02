import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyAiMarkup,
  centsToMicros,
  cloudModelPrices,
  computeCostMicros,
  COMPUTE_MINIMUM_SECONDS,
  DEFAULT_CLOUD_RATES,
  dollarsToMicros,
  formatPerMillion,
  isValidTopUpMicros,
  MAX_TOP_UP_MICROS,
  microsToCents,
  MIN_TOP_UP_MICROS,
  wallClockSeconds,
} from "../lib/cloud/pricing";
import { MUSE_MODELS } from "../lib/idea-factory/pricing";

test("AI markup is applied to list price and rounds to whole micros", () => {
  assert.equal(applyAiMarkup(1_000_000, DEFAULT_CLOUD_RATES), 1_200_000);
  assert.equal(applyAiMarkup(0, DEFAULT_CLOUD_RATES), 0);
  assert.equal(applyAiMarkup(-5, DEFAULT_CLOUD_RATES), 0);
  assert.equal(applyAiMarkup(333, { aiMarkupPercent: 0, computeVcpuHourMicros: 0 }), 333);
});

test("per-model prices carry the markup for every Muse model", () => {
  const prices = cloudModelPrices({ aiMarkupPercent: 50, computeVcpuHourMicros: 0 });
  assert.equal(prices.length, MUSE_MODELS.length);
  for (const [index, model] of MUSE_MODELS.entries()) {
    assert.equal(prices[index].id, model.id);
    assert.ok(Math.abs(prices[index].inputPerMillion - model.inputPerMillion * 1.5) < 1e-9);
    assert.ok(Math.abs(prices[index].outputPerMillion - model.outputPerMillion * 1.5) < 1e-9);
  }
});

test("compute is billed per vCPU-second with a one-minute minimum", () => {
  const rates = { aiMarkupPercent: 0, computeVcpuHourMicros: 360_000 }; // $0.36/vCPU-hour = 100 micros/vCPU-second
  assert.equal(computeCostMicros({ wallClockSeconds: 0, vcpus: 2 }, rates), COMPUTE_MINIMUM_SECONDS * 2 * 100);
  assert.equal(computeCostMicros({ wallClockSeconds: 30, vcpus: 1 }, rates), COMPUTE_MINIMUM_SECONDS * 100);
  assert.equal(computeCostMicros({ wallClockSeconds: 600, vcpus: 2 }, rates), 600 * 2 * 100);
  assert.equal(computeCostMicros({ wallClockSeconds: 3600, vcpus: 4 }, rates), 4 * 360_000);
  // Fractional seconds round up, fractional vCPUs round down (never below 1).
  assert.equal(computeCostMicros({ wallClockSeconds: 100.2, vcpus: 0.5 }, rates), 101 * 100);
});

test("wall clock seconds tolerate missing timestamps", () => {
  const start = new Date("2026-01-01T00:00:00Z");
  assert.equal(wallClockSeconds(start, new Date("2026-01-01T00:10:00Z")), 600);
  assert.equal(wallClockSeconds(null, new Date()), 0);
  assert.equal(wallClockSeconds(start, null), 0);
  assert.equal(wallClockSeconds(new Date("2026-01-01T00:10:00Z"), start), 0);
});

test("top-up amounts are whole cents within the allowed range", () => {
  assert.equal(isValidTopUpMicros(MIN_TOP_UP_MICROS), true);
  assert.equal(isValidTopUpMicros(MAX_TOP_UP_MICROS), true);
  assert.equal(isValidTopUpMicros(MIN_TOP_UP_MICROS - 1), false);
  assert.equal(isValidTopUpMicros(MAX_TOP_UP_MICROS + 10_000), false);
  assert.equal(isValidTopUpMicros(dollarsToMicros(12.34)), true);
  assert.equal(isValidTopUpMicros(dollarsToMicros(12.345)), false);
  assert.equal(isValidTopUpMicros(Number.NaN), false);
});

test("cents and micros convert both ways without drift", () => {
  assert.equal(microsToCents(dollarsToMicros(12.34)), 1234);
  assert.equal(centsToMicros(1234), 12_340_000);
  assert.equal(centsToMicros(microsToCents(5_000_000)), 5_000_000);
});

test("per-million prices keep enough digits for cheap models", () => {
  assert.equal(formatPerMillion(4.25), "$4.25 / 1M tokens");
  assert.equal(formatPerMillion(0.12), "$0.120 / 1M tokens");
  assert.equal(formatPerMillion(0.0024), "$0.0024 / 1M tokens");
});
