import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Enums that both Project Factory (build-schema.ts) and Agent Studio
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
 * Which API a Muse Code job's sandbox is driven through: Vercel Sandbox, a
 * supporter's computer running the WeStride runner, or a Modal Sandbox. Says
 * how to stop it; `compute_source` says whose account it ran on.
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

/**
 * Whose account a sandbox ran on: the payer's own connected Vercel or Modal
 * account, which bills them directly, or WeStride Cloud's Modal account,
 * which bills their balance. Only WESTRIDE_CLOUD work is ever charged.
 */
export const computeSource = pgEnum("compute_source", ["OWN", "WESTRIDE_CLOUD"]);

/**
 * Where the member asked a Project Factory run to execute. WESTRIDE_CLOUD is a
 * sandbox on WeStride's Modal account billed to their balance; LOCAL is one
 * of their own linked computers running the WeStride runner; SPONSORS is a
 * supporter's linked computer pledged to the project's idea; THIRD_PARTY is
 * the member's own Vercel or Modal account. `runner_kind` and
 * `compute_source` say how it actually ran and who paid.
 */
export const computeTarget = pgEnum("compute_target", [
  "WESTRIDE_CLOUD",
  "LOCAL",
  "SPONSORS",
  "THIRD_PARTY",
]);
