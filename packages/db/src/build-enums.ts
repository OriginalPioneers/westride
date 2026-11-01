import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Enums that both Build Studio (build-schema.ts) and Agent Studio
 * (agent-schema.ts) use at table-definition time. They live apart because
 * schema.ts, build-schema.ts, and agent-schema.ts import one another, and
 * whichever file a route happens to load first must not find these still
 * uninitialised halfway through the cycle. Same reason as origin-schema.ts.
 */

export const ticketStatus = pgEnum("ticket_status", [
  "BACKLOG",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
  "DONE",
]);

export const ticketPriority = pgEnum("ticket_priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

export const agentRunStatus = pgEnum("agent_run_status", [
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);
