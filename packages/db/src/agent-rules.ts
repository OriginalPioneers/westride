// ---------------------------------------------------------------------------
// Agent Studio rules that need no database. Client components may import
// this file.
// ---------------------------------------------------------------------------
import type { AgentSchedule } from "./agent-schema";
import { projectKeyPrefix } from "./build-rules";

export const AGENT_SCHEDULES: readonly AgentSchedule[] = ["NONE", "HOURLY", "DAILY", "WEEKLY"];

export function isAgentSchedule(value: string): value is AgentSchedule {
  return (AGENT_SCHEDULES as readonly string[]).includes(value);
}

/** `Night Gardener` → NG-4. Same scheme as project tickets. */
export function agentTicketKey(agentName: string, number: number): string {
  return `${projectKeyPrefix(agentName)}-${number}`;
}

export type ScheduleSpec = {
  schedule: AgentSchedule;
  /** 0–23 UTC. Ignored for NONE and HOURLY. */
  scheduleHourUtc: number | null;
  /** 0 (Sunday) – 6 (Saturday). Only WEEKLY reads it. */
  scheduleWeekday: number | null;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function clampHour(hour: number | null): number {
  return Math.min(23, Math.max(0, Math.trunc(hour ?? 9)));
}

function clampWeekday(weekday: number | null): number {
  return Math.min(6, Math.max(0, Math.trunc(weekday ?? 1)));
}

/**
 * The first moment strictly after `from` that the schedule fires. HOURLY
 * fires on the hour, DAILY at the chosen UTC hour, WEEKLY on the chosen day
 * at that hour. NONE never fires.
 */
export function nextScheduledRunAt(spec: ScheduleSpec, from: Date = new Date()): Date | null {
  const at = from.getTime();
  switch (spec.schedule) {
    case "NONE":
      return null;
    case "HOURLY":
      return new Date(Math.floor(at / HOUR_MS) * HOUR_MS + HOUR_MS);
    case "DAILY": {
      const hour = clampHour(spec.scheduleHourUtc);
      const today = Date.UTC(
        from.getUTCFullYear(),
        from.getUTCMonth(),
        from.getUTCDate(),
        hour,
      );
      return new Date(today > at ? today : today + DAY_MS);
    }
    case "WEEKLY": {
      const hour = clampHour(spec.scheduleHourUtc);
      const weekday = clampWeekday(spec.scheduleWeekday);
      const today = Date.UTC(
        from.getUTCFullYear(),
        from.getUTCMonth(),
        from.getUTCDate(),
        hour,
      );
      let daysAhead = (weekday - from.getUTCDay() + 7) % 7;
      if (daysAhead === 0 && today <= at) {
        daysAhead = 7;
      }
      return new Date(today + daysAhead * DAY_MS);
    }
  }
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** "Every Monday at 09:00 UTC", "Every hour", "Not scheduled". */
export function describeSchedule(spec: ScheduleSpec): string {
  switch (spec.schedule) {
    case "NONE":
      return "Not scheduled";
    case "HOURLY":
      return "Every hour, on the hour";
    case "DAILY":
      return `Every day at ${pad(clampHour(spec.scheduleHourUtc))}:00 UTC`;
    case "WEEKLY":
      return `Every ${WEEKDAYS[clampWeekday(spec.scheduleWeekday)]} at ${pad(clampHour(spec.scheduleHourUtc))}:00 UTC`;
  }
}

export type UsageTotals = {
  jobs: number;
  modelCalls: number;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  estimatedCostMicros: number;
};

export const EMPTY_USAGE_TOTALS: UsageTotals = {
  jobs: 0,
  modelCalls: 0,
  inputTokens: 0,
  cachedTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  totalTokens: 0,
  estimatedCostMicros: 0,
};

export function addUsageTotals(a: UsageTotals, b: UsageTotals): UsageTotals {
  return {
    jobs: a.jobs + b.jobs,
    modelCalls: a.modelCalls + b.modelCalls,
    inputTokens: a.inputTokens + b.inputTokens,
    cachedTokens: a.cachedTokens + b.cachedTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    reasoningTokens: a.reasoningTokens + b.reasoningTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    estimatedCostMicros: a.estimatedCostMicros + b.estimatedCostMicros,
  };
}

export {
  EMPTY_TICKET_COUNTS,
  OPEN_TICKET_STATUSES,
  TICKET_STATUSES,
  isTicketStatus,
  ticketProgressPercent,
  ticketStatusChange,
  totalTickets,
  type TicketCounts,
} from "./build-rules";
