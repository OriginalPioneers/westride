import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPTY_USAGE_TOTALS,
  addUsageTotals,
  agentTicketKey,
  describeSchedule,
  nextScheduledRunAt,
} from "../src/agent-rules";

test("agent ticket keys follow the project scheme", () => {
  assert.equal(agentTicketKey("Night Gardener", 4), "NG-4");
  assert.equal(agentTicketKey("Scout", 1), "SCOU-1");
});

test("an unscheduled agent never has a next run", () => {
  assert.equal(
    nextScheduledRunAt({ schedule: "NONE", scheduleHourUtc: 9, scheduleWeekday: 1 }),
    null,
  );
});

test("hourly fires at the next top of the hour", () => {
  const from = new Date("2026-10-30T14:20:00Z");
  const next = nextScheduledRunAt({ schedule: "HOURLY", scheduleHourUtc: null, scheduleWeekday: null }, from);
  assert.equal(next?.toISOString(), "2026-10-30T15:00:00.000Z");
  const onTheHour = nextScheduledRunAt(
    { schedule: "HOURLY", scheduleHourUtc: null, scheduleWeekday: null },
    new Date("2026-10-30T15:00:00Z"),
  );
  assert.equal(onTheHour?.toISOString(), "2026-10-30T16:00:00.000Z");
});

test("daily fires later today when the hour has not passed, else tomorrow", () => {
  const spec = { schedule: "DAILY" as const, scheduleHourUtc: 9, scheduleWeekday: null };
  assert.equal(
    nextScheduledRunAt(spec, new Date("2026-10-30T08:59:00Z"))?.toISOString(),
    "2026-10-30T09:00:00.000Z",
  );
  assert.equal(
    nextScheduledRunAt(spec, new Date("2026-10-30T09:00:00Z"))?.toISOString(),
    "2026-10-31T09:00:00.000Z",
  );
});

test("weekly fires on the chosen weekday and skips a week when today's slot passed", () => {
  // 2026-10-30 is a Friday.
  const monday = { schedule: "WEEKLY" as const, scheduleHourUtc: 9, scheduleWeekday: 1 };
  assert.equal(
    nextScheduledRunAt(monday, new Date("2026-10-30T12:00:00Z"))?.toISOString(),
    "2026-11-02T09:00:00.000Z",
  );
  const friday = { schedule: "WEEKLY" as const, scheduleHourUtc: 9, scheduleWeekday: 5 };
  assert.equal(
    nextScheduledRunAt(friday, new Date("2026-10-30T08:00:00Z"))?.toISOString(),
    "2026-10-30T09:00:00.000Z",
  );
  assert.equal(
    nextScheduledRunAt(friday, new Date("2026-10-30T09:00:00Z"))?.toISOString(),
    "2026-11-06T09:00:00.000Z",
  );
});

test("schedules read as sentences", () => {
  assert.equal(
    describeSchedule({ schedule: "NONE", scheduleHourUtc: null, scheduleWeekday: null }),
    "Not scheduled",
  );
  assert.equal(
    describeSchedule({ schedule: "DAILY", scheduleHourUtc: 7, scheduleWeekday: null }),
    "Every day at 07:00 UTC",
  );
  assert.equal(
    describeSchedule({ schedule: "WEEKLY", scheduleHourUtc: 18, scheduleWeekday: 3 }),
    "Every Wednesday at 18:00 UTC",
  );
});

test("usage totals add field by field", () => {
  const sum = addUsageTotals(
    { ...EMPTY_USAGE_TOTALS, jobs: 1, inputTokens: 10, estimatedCostMicros: 5 },
    { ...EMPTY_USAGE_TOTALS, jobs: 2, inputTokens: 5, outputTokens: 3, estimatedCostMicros: 7 },
  );
  assert.deepEqual(sum, {
    ...EMPTY_USAGE_TOTALS,
    jobs: 3,
    inputTokens: 15,
    outputTokens: 3,
    estimatedCostMicros: 12,
  });
});
