// ---------------------------------------------------------------------------
// Supporters
//
// Anyone with a WeStride account can back an idea they like. A pledge is the
// standing offer: "use my Meta key for this idea's agents, up to this much a
// month" (TOKENS) or "my computers may run this idea's agent jobs" (COMPUTE).
// WeStride never holds money: capital is a list of outbound links the idea's
// founders publish, and nothing more.
//
// Every job a pledge paid for, or a device ran, leaves one contribution row,
// so an idea can say how much support it has received and from how many
// people.
// ---------------------------------------------------------------------------
import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { agentJobs } from "./agent-schema";
import { agentRuns } from "./build-schema";
import { ideas } from "./schema";

/**
 * TOKENS: the supporter's Meta key and Vercel account pay for jobs.
 * COMPUTE: the supporter's linked devices run jobs.
 */
export const pledgeKind = pgEnum("pledge_kind", ["TOKENS", "COMPUTE"]);

/** PAUSED keeps the pledge but stops new jobs drawing on it. REVOKED is final. */
export const pledgeStatus = pgEnum("pledge_status", ["ACTIVE", "PAUSED", "REVOKED"]);

export const deviceStatus = pgEnum("device_status", ["ACTIVE", "REVOKED"]);

export const pledges = pgTable(
  "pledges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    /** Clerk user id of the supporter. */
    clerkUserId: text("clerk_user_id").notNull(),
    kind: pledgeKind("kind").notNull(),
    status: pledgeStatus("status").notNull().default("ACTIVE"),
    /**
     * TOKENS only. USD in millionths the supporter will cover, per period
     * when `resetsMonthly`, or in total otherwise. A soft limit: a job's cost
     * is only known when it ends, so one job may run past it.
     */
    capMicros: bigint("cap_micros", { mode: "number" }),
    resetsMonthly: boolean("resets_monthly").notNull().default(false),
    /** Start of the current period for a monthly pledge; creation otherwise. */
    periodStartedAt: timestamp("period_started_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    /** Spend attributed to this pledge in the current period. */
    spentMicrosThisPeriod: bigint("spent_micros_this_period", { mode: "number" })
      .notNull()
      .default(0),
    /** Lifetime totals, never reset. */
    spentMicrosTotal: bigint("spent_micros_total", { mode: "number" }).notNull().default(0),
    jobsTotal: integer("jobs_total").notNull().default(0),
    /** A note from the supporter, shown to the idea's team. Plain text. */
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("pledges_idea_user_kind_unique").on(table.ideaId, table.clerkUserId, table.kind),
    index("pledges_user_idx").on(table.clerkUserId),
    index("pledges_idea_kind_status_idx").on(table.ideaId, table.kind, table.status),
  ],
);

/** One job's worth of support, credited to the pledge that made it happen. */
export const pledgeContributions = pgTable(
  "pledge_contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pledgeId: uuid("pledge_id")
      .notNull()
      .references(() => pledges.id, { onDelete: "cascade" }),
    /** Denormalised so idea totals survive a pledge being deleted. */
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    kind: pledgeKind("kind").notNull(),
    jobId: uuid("job_id").references(() => agentJobs.id, { onDelete: "set null" }),
    /** A Project Factory run a sponsor's computer took, when the work was a ticket run rather than an agent job. */
    runId: uuid("run_id").references(() => agentRuns.id, { onDelete: "set null" }),
    deviceId: uuid("device_id").references(() => devices.id, { onDelete: "set null" }),
    estimatedCostMicros: bigint("estimated_cost_micros", { mode: "number" }).notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    /** How long the job ran, for compute pledges where cost reads as zero. */
    wallClockSeconds: integer("wall_clock_seconds").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("pledge_contributions_job_unique").on(table.jobId),
    uniqueIndex("pledge_contributions_run_unique").on(table.runId),
    index("pledge_contributions_idea_idx").on(table.ideaId, table.createdAt),
    index("pledge_contributions_pledge_idx").on(table.pledgeId, table.createdAt),
    index("pledge_contributions_user_idx").on(table.clerkUserId),
  ],
);

/**
 * A computer a supporter linked by running the WeStride runner. It holds a
 * long-lived token whose hash lives here; revoking the device ends it.
 */
export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    name: text("name").notNull(),
    status: deviceStatus("status").notNull().default("ACTIVE"),
    /** SHA-256 of the bearer token the runner authenticates with. */
    tokenHash: text("token_hash").notNull(),
    /** What the runner reported on its last heartbeat. */
    os: text("os").notNull().default(""),
    arch: text("arch").notNull().default(""),
    cpus: integer("cpus").notNull().default(0),
    memoryMb: integer("memory_mb").notNull().default(0),
    runnerVersion: text("runner_version").notNull().default(""),
    /** Ollama model tags the device can serve, e.g. `qwen2.5-coder:14b`. */
    models: text("models").array().notNull().default([]),
    /** The supporter configured their own Meta key on the device. */
    hasMetaKey: boolean("has_meta_key").notNull().default(false),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "date" }),
    /** The job it is running, if any. */
    currentJobId: uuid("current_job_id"),
    jobsCompleted: integer("jobs_completed").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("devices_token_hash_unique").on(table.tokenHash),
    index("devices_user_idx").on(table.clerkUserId),
    index("devices_status_seen_idx").on(table.status, table.lastSeenAt),
  ],
);

/** A short code shown in Settings; the runner trades it for a device token. */
export const devicePairingCodes = pgTable(
  "device_pairing_codes",
  {
    code: text("code").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("device_pairing_codes_user_idx").on(table.clerkUserId)],
);

// `ideaCapitalLinks` lives in schema.ts beside `ideas` (its only dependency)
// so schema.ts never imports this file; that would close a module cycle
// through agent-schema and build-schema. Re-exported here for callers.
export { ideaCapitalLinks, ideaCapitalLinksRelations } from "./schema";
export type { IdeaCapitalLink, NewIdeaCapitalLink } from "./schema";

export const pledgesRelations = relations(pledges, ({ one, many }) => ({
  idea: one(ideas, { fields: [pledges.ideaId], references: [ideas.id] }),
  contributions: many(pledgeContributions),
}));

export const pledgeContributionsRelations = relations(pledgeContributions, ({ one }) => ({
  pledge: one(pledges, { fields: [pledgeContributions.pledgeId], references: [pledges.id] }),
  idea: one(ideas, { fields: [pledgeContributions.ideaId], references: [ideas.id] }),
  job: one(agentJobs, { fields: [pledgeContributions.jobId], references: [agentJobs.id] }),
  run: one(agentRuns, { fields: [pledgeContributions.runId], references: [agentRuns.id] }),
  device: one(devices, { fields: [pledgeContributions.deviceId], references: [devices.id] }),
}));

export const devicesRelations = relations(devices, ({ many }) => ({
  contributions: many(pledgeContributions),
}));

export type PledgeKind = (typeof pledgeKind.enumValues)[number];
export type PledgeStatus = (typeof pledgeStatus.enumValues)[number];
export type DeviceStatus = (typeof deviceStatus.enumValues)[number];
export type Pledge = typeof pledges.$inferSelect;
export type NewPledge = typeof pledges.$inferInsert;
export type PledgeContribution = typeof pledgeContributions.$inferSelect;
export type NewPledgeContribution = typeof pledgeContributions.$inferInsert;
export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
export type DevicePairingCode = typeof devicePairingCodes.$inferSelect;
