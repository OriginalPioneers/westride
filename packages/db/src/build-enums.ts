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

/**
 * Where a Muse Code job runs: a Vercel Sandbox on the payer's own account, a
 * supporter's computer running the WeStride runner, or a Modal sandbox that
 * WeStride Cloud pays for and bills to the member's balance.
 */
export const runnerKind = pgEnum("runner_kind", [
  "VERCEL_SANDBOX",
  "VOLUNTEER_DEVICE",
  "MODAL_SANDBOX",
]);

/**
 * Whose Meta Model API key a piece of work used: the payer's own connected
 * account (or a sponsor's, through a pledge), or WeStride Cloud's shared key,
 * which bills the member's balance.
 */
export const museSource = pgEnum("muse_source", ["OWN", "WESTRIDE_CLOUD"]);
