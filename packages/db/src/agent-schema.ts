// ---------------------------------------------------------------------------
// Agent Studio
//
// An agent is a named Muse worker a member sets up once and keeps. It has a
// standing brief, optionally belongs to an idea and a project, may be tied
// to one GitHub repository, keeps its own queue of tickets, and can run on
// a schedule. Every job it runs records the tokens it used and what they
// cost, so the studio can show spend per agent.
// ---------------------------------------------------------------------------
import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { agentRunStatus, ticketPriority, ticketStatus } from "./build-enums";
import { projects } from "./build-schema";
import { ideas } from "./schema";

export const agentStatus = pgEnum("agent_status", ["ACTIVE", "PAUSED", "ARCHIVED"]);

/** How often the agent wakes up on its own. Times are in UTC. */
export const agentSchedule = pgEnum("agent_schedule", ["NONE", "HOURLY", "DAILY", "WEEKLY"]);

export const agentJobTrigger = pgEnum("agent_job_trigger", ["MANUAL", "SCHEDULE"]);

/**
 * CODE: Muse Code in a sandbox against the agent's repository, ending in a
 * pull request. REPORT: one Meta Model API call that answers the ticket in
 * Markdown, for agents without a repository or servers without a sandbox.
 */
export const agentJobKind = pgEnum("agent_job_kind", ["CODE", "REPORT"]);

/** Who wrote the ticket: a member, or the schedule from the standing task. */
export const agentTicketSource = pgEnum("agent_ticket_source", ["MEMBER", "SCHEDULE"]);

/**
 * Where a code job runs: a Vercel Sandbox on the payer's account, or a
 * supporter's own computer running the WeStride runner.
 */
export const runnerKind = pgEnum("runner_kind", ["VERCEL_SANDBOX", "VOLUNTEER_DEVICE"]);

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** Markdown. What the agent is for, shown on its page. */
    description: text("description").notNull(),
    /** Markdown. The standing brief every job starts from. */
    instructions: text("instructions").notNull().default(""),
    /** Public Blob URL of a 512×512 square image. */
    imageUrl: text("image_url"),
    status: agentStatus("status").notNull().default("ACTIVE"),
    isPublic: boolean("is_public").notNull().default(false),
    /** Clerk user id. Owns the settings; their Meta key pays for scheduled jobs. */
    ownerClerkUserId: text("owner_clerk_user_id").notNull(),
    ideaId: uuid("idea_id").references(() => ideas.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    model: text("model").notNull(),
    maxSteps: integer("max_steps").notNull(),
    /**
     * Supporters with a TOKENS pledge on the linked idea may pay for this
     * agent's jobs. The owner still chooses the model; a sponsor sets a cap.
     */
    allowSponsorTokens: boolean("allow_sponsor_tokens").notNull().default(false),
    /**
     * Supporters with a COMPUTE pledge on the linked idea may run this
     * agent's code jobs on their own computers. Public repositories only.
     */
    allowVolunteerCompute: boolean("allow_volunteer_compute").notNull().default(false),
    /**
     * An Ollama model tag, e.g. `qwen2.5-coder:14b`, a volunteer device may
     * use in place of `model` when it serves that model locally. Null means
     * volunteers must bring their own Meta key.
     */
    volunteerLocalModel: text("volunteer_local_model"),
    /** The GitHub repository the agent works in. All null when it has none. */
    repoId: bigint("repo_id", { mode: "number" }),
    repoOwner: text("repo_owner"),
    repoName: text("repo_name"),
    repoHtmlUrl: text("repo_html_url"),
    repoDefaultBranch: text("repo_default_branch"),
    repoIsPrivate: boolean("repo_is_private"),
    schedule: agentSchedule("schedule").notNull().default("NONE"),
    /** 0–23, for DAILY and WEEKLY. */
    scheduleHourUtc: integer("schedule_hour_utc"),
    /** 0 (Sunday) – 6 (Saturday), for WEEKLY. */
    scheduleWeekday: integer("schedule_weekday"),
    /**
     * Markdown. What a scheduled wake-up does when the queue is empty: the
     * schedule files it as a ticket and works it.
     */
    standingTask: text("standing_task").notNull().default(""),
    nextRunAt: timestamp("next_run_at", { withTimezone: true, mode: "date" }),
    lastRunAt: timestamp("last_run_at", { withTimezone: true, mode: "date" }),
    /** The next ticket number to hand out. Tickets read as AGT-12 style keys. */
    nextTicketNumber: integer("next_ticket_number").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("agents_owner_idx").on(table.ownerClerkUserId),
    index("agents_idea_id_idx").on(table.ideaId),
    index("agents_project_id_idx").on(table.projectId),
    index("agents_visibility_idx").on(table.isPublic),
    index("agents_due_idx").on(table.status, table.nextRunAt),
    index("agents_updated_at_idx").on(table.updatedAt),
  ],
);

export const agentTickets = pgTable(
  "agent_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    /** Per-agent sequence, starting at 1. */
    number: integer("number").notNull(),
    title: text("title").notNull(),
    /** Markdown. The brief the agent works from. */
    description: text("description").notNull().default(""),
    status: ticketStatus("status").notNull().default("BACKLOG"),
    priority: ticketPriority("priority").notNull().default("MEDIUM"),
    /** Manual ordering within a status; the queue runs lowest first. */
    sortOrder: integer("sort_order").notNull().default(0),
    blockedReason: text("blocked_reason"),
    source: agentTicketSource("source").notNull().default("MEMBER"),
    /** Clerk user id, or null when the schedule filed it. */
    createdByClerkUserId: text("created_by_clerk_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    uniqueIndex("agent_tickets_agent_number_unique").on(table.agentId, table.number),
    index("agent_tickets_agent_status_sort_idx").on(
      table.agentId,
      table.status,
      table.sortOrder,
    ),
  ],
);

/** One piece of work the agent did: a sandbox run or a single Muse call. */
export const agentJobs = pgTable(
  "agent_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    /** Kept for cost accounting when the ticket is deleted. */
    ticketId: uuid("ticket_id").references(() => agentTickets.id, { onDelete: "set null" }),
    /** Snapshot, so the job still reads well after the ticket is gone. */
    ticketTitle: text("ticket_title").notNull(),
    trigger: agentJobTrigger("trigger").notNull(),
    kind: agentJobKind("kind").notNull(),
    status: agentRunStatus("status").notNull().default("QUEUED"),
    /** Clerk user id of the member who pressed Run. Null for the schedule. */
    startedByClerkUserId: text("started_by_clerk_user_id"),
    /** Clerk user id whose Meta key paid for the job. */
    paidByClerkUserId: text("paid_by_clerk_user_id").notNull(),
    model: text("model").notNull(),
    maxSteps: integer("max_steps").notNull(),
    /** The TOKENS or COMPUTE pledge this job drew on. Null when the payer is the team. */
    pledgeId: uuid("pledge_id"),
    // CODE jobs
    runnerKind: runnerKind("runner_kind"),
    /** The supporter's device that ran it. Null for sandbox and report jobs. */
    deviceId: uuid("device_id"),
    /**
     * A volunteer job waits in QUEUED until a device leases it; the lease
     * lapses when heartbeats stop, and the job goes back to the queue.
     */
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true, mode: "date" }),
    /** The full prompt, kept for volunteer jobs so the device can fetch it. */
    prompt: text("prompt"),
    sandboxName: text("sandbox_name"),
    repoFullName: text("repo_full_name"),
    branch: text("branch"),
    baseBranch: text("base_branch"),
    /** SHA-256 of the bearer token the sandbox reports with. Null for REPORT jobs. */
    callbackTokenHash: text("callback_token_hash"),
    museSessionId: text("muse_session_id"),
    exitCode: integer("exit_code"),
    headSha: text("head_sha"),
    prNumber: integer("pr_number"),
    prUrl: text("pr_url"),
    // REPORT jobs
    museRequestId: uuid("muse_request_id"),
    /** The agent's closing message or report, in Markdown. */
    summary: text("summary"),
    error: text("error"),
    eventCount: integer("event_count").notNull().default(0),
    // Usage, as Muse reported it. Zero until the job finishes.
    modelCalls: integer("model_calls").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    cachedTokens: integer("cached_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    reasoningTokens: integer("reasoning_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    /** USD in millionths, from the published price list. An estimate. */
    estimatedCostMicros: bigint("estimated_cost_micros", { mode: "number" })
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
    lastEventAt: timestamp("last_event_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("agent_jobs_agent_created_idx").on(table.agentId, table.createdAt),
    index("agent_jobs_ticket_created_idx").on(table.ticketId, table.createdAt),
    index("agent_jobs_status_idx").on(table.status),
    index("agent_jobs_paid_by_idx").on(table.paidByClerkUserId),
    index("agent_jobs_runner_status_idx").on(table.runnerKind, table.status),
    index("agent_jobs_device_idx").on(table.deviceId),
  ],
);

export const agentJobEvents = pgTable(
  "agent_job_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => agentJobs.id, { onDelete: "cascade" }),
    /** Order within the job, assigned by whoever produced it. */
    sequence: integer("sequence").notNull(),
    /** `setup`, `muse` (one JSONL line), `git`, `log`, `finished`. */
    type: text("type").notNull(),
    payload: jsonb("payload").$type<unknown>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("agent_job_events_job_sequence_unique").on(table.jobId, table.sequence)],
);

/** The agent's diary: one readable line per thing that happened to it. */
export const agentLogEntries = pgTable(
  "agent_log_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    /** `agent`, `ticket`, `job`, `schedule`, `settings`. */
    kind: text("kind").notNull(),
    /** Markdown, one or two lines. */
    message: text("message").notNull(),
    ticketId: uuid("ticket_id").references(() => agentTickets.id, { onDelete: "set null" }),
    jobId: uuid("job_id").references(() => agentJobs.id, { onDelete: "set null" }),
    /** Clerk user id of the person who did it. Null for the agent or the schedule. */
    actorClerkUserId: text("actor_clerk_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("agent_log_entries_agent_created_idx").on(table.agentId, table.createdAt)],
);

export const agentsRelations = relations(agents, ({ one, many }) => ({
  idea: one(ideas, { fields: [agents.ideaId], references: [ideas.id] }),
  project: one(projects, { fields: [agents.projectId], references: [projects.id] }),
  tickets: many(agentTickets),
  jobs: many(agentJobs),
  log: many(agentLogEntries),
}));

export const agentTicketsRelations = relations(agentTickets, ({ one, many }) => ({
  agent: one(agents, { fields: [agentTickets.agentId], references: [agents.id] }),
  jobs: many(agentJobs),
}));

export const agentJobsRelations = relations(agentJobs, ({ one, many }) => ({
  agent: one(agents, { fields: [agentJobs.agentId], references: [agents.id] }),
  ticket: one(agentTickets, { fields: [agentJobs.ticketId], references: [agentTickets.id] }),
  events: many(agentJobEvents),
}));

export const agentJobEventsRelations = relations(agentJobEvents, ({ one }) => ({
  job: one(agentJobs, { fields: [agentJobEvents.jobId], references: [agentJobs.id] }),
}));

export const agentLogEntriesRelations = relations(agentLogEntries, ({ one }) => ({
  agent: one(agents, { fields: [agentLogEntries.agentId], references: [agents.id] }),
  ticket: one(agentTickets, {
    fields: [agentLogEntries.ticketId],
    references: [agentTickets.id],
  }),
  job: one(agentJobs, { fields: [agentLogEntries.jobId], references: [agentJobs.id] }),
}));

export type AgentStatus = (typeof agentStatus.enumValues)[number];
export type AgentSchedule = (typeof agentSchedule.enumValues)[number];
export type AgentJobTrigger = (typeof agentJobTrigger.enumValues)[number];
export type AgentJobKind = (typeof agentJobKind.enumValues)[number];
export type AgentTicketSource = (typeof agentTicketSource.enumValues)[number];
export type RunnerKind = (typeof runnerKind.enumValues)[number];
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type AgentTicket = typeof agentTickets.$inferSelect;
export type NewAgentTicket = typeof agentTickets.$inferInsert;
export type AgentJob = typeof agentJobs.$inferSelect;
export type NewAgentJob = typeof agentJobs.$inferInsert;
export type AgentJobEvent = typeof agentJobEvents.$inferSelect;
export type NewAgentJobEvent = typeof agentJobEvents.$inferInsert;
export type AgentLogEntry = typeof agentLogEntries.$inferSelect;
export type NewAgentLogEntry = typeof agentLogEntries.$inferInsert;
