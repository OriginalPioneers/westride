// ---------------------------------------------------------------------------
// Build Studio
//
// A project is where an idea gets built. It has a team, one or more GitHub
// repositories, a roadmap of milestones, and tickets that move from the
// backlog to done. Later phases add Muse planning (tickets drafted by Muse
// carry the request that produced them) and Muse Code agent runs against
// tickets; the columns those need are here from the start so the first
// migration is the only one the core tables need.
// ---------------------------------------------------------------------------
import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  agentRunStatus,
  computeSource,
  museSource,
  runnerKind,
  ticketPriority,
  ticketStatus,
} from "./build-enums";
import { contentOrigin } from "./origin-schema";
import { ideas } from "./schema";

export const projectStatus = pgEnum("project_status", [
  "PLANNING",
  "BUILDING",
  "LAUNCHED",
  "PAUSED",
]);

export const projectMemberRole = pgEnum("project_member_role", [
  "OWNER",
  "MEMBER",
]);

// Shared with agent-schema.ts; defined in a leaf module so neither file
// trips over the other mid-evaluation.
export { agentRunStatus, ticketPriority, ticketStatus };

/** Who wrote the ticket: a member, or Muse during planning. */
export const ticketSource = pgEnum("ticket_source", ["MEMBER", "MUSE"]);

export const milestoneStatus = pgEnum("milestone_status", [
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** Markdown. */
    description: text("description").notNull(),
    status: projectStatus("status").notNull().default("PLANNING"),
    /** The idea this project builds, when it came from one. */
    ideaId: uuid("idea_id").references(() => ideas.id, { onDelete: "set null" }),
    /** Public Blob URL of a 512×512 square image. */
    imageUrl: text("image_url"),
    isPublic: boolean("is_public").notNull().default(false),
    origin: contentOrigin("origin").notNull().default("MEMBER"),
    /** The next ticket number to hand out. Tickets read as PRJ-12 style keys. */
    nextTicketNumber: integer("next_ticket_number").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("projects_idea_id_idx").on(table.ideaId),
    index("projects_origin_idx").on(table.origin),
    index("projects_visibility_idx").on(table.isPublic),
    index("projects_updated_at_idx").on(table.updatedAt),
  ],
);

export const projectMembers = pgTable(
  "project_members",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Clerk user id. */
    clerkUserId: text("clerk_user_id").notNull(),
    role: projectMemberRole("role").notNull().default("MEMBER"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.clerkUserId] }),
    index("project_members_clerk_user_id_idx").on(table.clerkUserId),
  ],
);

/** A GitHub repository the project is built in. A project can have several. */
export const projectRepos = pgTable(
  "project_repos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** GitHub's numeric id. It survives renames and transfers. */
    repoId: bigint("repo_id", { mode: "number" }).notNull(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    htmlUrl: text("html_url").notNull(),
    defaultBranch: text("default_branch").notNull(),
    isPrivate: boolean("is_private").notNull(),
    /** The repository agents work in unless a ticket says otherwise. */
    isPrimary: boolean("is_primary").notNull().default(false),
    /** Clerk user id of the member who linked the repository. Null when imported. */
    linkedByClerkUserId: text("linked_by_clerk_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("project_repos_project_repo_unique").on(
      table.projectId,
      table.repoId,
    ),
    index("project_repos_repo_id_idx").on(table.repoId),
  ],
);

export const projectMilestones = pgTable(
  "project_milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** Markdown. */
    description: text("description").notNull().default(""),
    status: milestoneStatus("status").notNull().default("PLANNED"),
    sortOrder: integer("sort_order").notNull(),
    /** ISO date (YYYY-MM-DD). */
    targetDate: text("target_date"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("project_milestones_project_sort_idx").on(
      table.projectId,
      table.sortOrder,
    ),
  ],
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Per-project sequence, starting at 1. */
    number: integer("number").notNull(),
    title: text("title").notNull(),
    /**
     * Markdown. Written as what "done" looks like: this text becomes the
     * task brief a Muse Code agent works from.
     */
    description: text("description").notNull().default(""),
    status: ticketStatus("status").notNull().default("BACKLOG"),
    priority: ticketPriority("priority").notNull().default("MEDIUM"),
    /** Manual ordering within a status column. */
    sortOrder: integer("sort_order").notNull().default(0),
    milestoneId: uuid("milestone_id").references(() => projectMilestones.id, {
      onDelete: "set null",
    }),
    /** The repository the work lands in. Null means the project's primary. */
    repoId: uuid("repo_id").references(() => projectRepos.id, {
      onDelete: "set null",
    }),
    /** Clerk user id. */
    assigneeClerkUserId: text("assignee_clerk_user_id"),
    /** Why the ticket is BLOCKED. Cleared when it moves on. */
    blockedReason: text("blocked_reason"),
    source: ticketSource("source").notNull().default("MEMBER"),
    /** The Muse planning request that drafted this ticket, when it was one. */
    museRequestId: uuid("muse_request_id"),
    createdByClerkUserId: text("created_by_clerk_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    uniqueIndex("tickets_project_number_unique").on(
      table.projectId,
      table.number,
    ),
    index("tickets_project_status_sort_idx").on(
      table.projectId,
      table.status,
      table.sortOrder,
    ),
    index("tickets_milestone_id_idx").on(table.milestoneId),
    index("tickets_assignee_idx").on(table.assigneeClerkUserId),
  ],
);

/** A note on a ticket, from a member or from an agent run that worked on it. */
export const ticketComments = pgTable(
  "ticket_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    /** Clerk user id, or null when an agent run wrote the comment. */
    authorClerkUserId: text("author_clerk_user_id"),
    agentRunId: uuid("agent_run_id"),
    /** Markdown. */
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("ticket_comments_ticket_created_idx").on(table.ticketId, table.createdAt)],
);

/**
 * One Muse Code agent run against a ticket. The agent works in a Vercel
 * Sandbox: it clones the repository, runs `muse exec` on the ticket brief,
 * and pushes a branch. Its JSONL events stream in as `agentRunEvents`.
 */
export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    repoId: uuid("repo_id").references(() => projectRepos.id, { onDelete: "set null" }),
    /** Snapshot of the repository in case the link is removed later. */
    repoFullName: text("repo_full_name").notNull(),
    /** Clerk user id of the member who started the run; their Meta key or WeStride Cloud balance pays for it. */
    startedByClerkUserId: text("started_by_clerk_user_id").notNull(),
    status: agentRunStatus("status").notNull().default("QUEUED"),
    /** Which sandbox API ran it. Rows from before WeStride Cloud read as Vercel. */
    runnerKind: runnerKind("runner_kind").notNull().default("VERCEL_SANDBOX"),
    /** Whose account the sandbox ran on. WESTRIDE_CLOUD bills the starter's balance for its time. */
    computeSource: computeSource("compute_source").notNull().default("OWN"),
    /** Whose Meta key the model calls used. WESTRIDE_CLOUD bills the starter's balance. */
    museSource: museSource("muse_source").notNull().default("OWN"),
    /** The sandbox's name on Vercel, or its id on Modal, used to stop it. */
    sandboxName: text("sandbox_name"),
    branch: text("branch").notNull(),
    baseBranch: text("base_branch").notNull(),
    model: text("model").notNull(),
    maxSteps: integer("max_steps").notNull(),
    /** SHA-256 of the bearer token the sandbox uses to report events. */
    callbackTokenHash: text("callback_token_hash").notNull(),
    /** Muse Code's own session id, for `muse exec --session-id` resumes. */
    museSessionId: text("muse_session_id"),
    exitCode: integer("exit_code"),
    headSha: text("head_sha"),
    prNumber: integer("pr_number"),
    prUrl: text("pr_url"),
    /** The agent's closing message, in Markdown. */
    summary: text("summary"),
    error: text("error"),
    eventCount: integer("event_count").notNull().default(0),
    // Usage, as Muse reported it. Zero until the run finishes.
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
    index("agent_runs_ticket_created_idx").on(table.ticketId, table.createdAt),
    index("agent_runs_project_created_idx").on(table.projectId, table.createdAt),
    index("agent_runs_status_idx").on(table.status),
  ],
);

export const agentRunEvents = pgTable(
  "agent_run_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    /** Order within the run, assigned by the sandbox runner. */
    sequence: integer("sequence").notNull(),
    /** `setup`, `muse` (one JSONL line), `git`, `log`, `finished`. */
    type: text("type").notNull(),
    payload: jsonb("payload").$type<unknown>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("agent_run_events_run_sequence_unique").on(table.runId, table.sequence),
  ],
);

export const claimRequestStatus = pgEnum("claim_request_status", [
  "PENDING",
  "APPROVED",
  "DENIED",
]);

/**
 * A member asking to become the founder of an imported idea (and the owner
 * of the project built from it) without proving it through GitHub. The team
 * reviews it from an email that carries a one-time link.
 */
export const claimRequests = pgTable(
  "claim_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    /** The imported project that goes with the idea, when there is one. */
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    /** Clerk user id of the person asking. */
    clerkUserId: text("clerk_user_id").notNull(),
    /** Why they should have it, in their words. */
    message: text("message").notNull().default(""),
    status: claimRequestStatus("status").notNull().default("PENDING"),
    /** SHA-256 of the secret in the review links. The secret itself is only in the email. */
    reviewTokenHash: text("review_token_hash").notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // One open request per person per idea.
    uniqueIndex("claim_requests_pending_unique")
      .on(table.ideaId, table.clerkUserId)
      .where(sql`${table.status} = 'PENDING'`),
    index("claim_requests_idea_id_idx").on(table.ideaId),
    index("claim_requests_clerk_user_id_idx").on(table.clerkUserId),
  ],
);

export const claimRequestsRelations = relations(claimRequests, ({ one }) => ({
  idea: one(ideas, {
    fields: [claimRequests.ideaId],
    references: [ideas.id],
  }),
  project: one(projects, {
    fields: [claimRequests.projectId],
    references: [projects.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  idea: one(ideas, {
    fields: [projects.ideaId],
    references: [ideas.id],
  }),
  members: many(projectMembers),
  repos: many(projectRepos),
  milestones: many(projectMilestones),
  tickets: many(tickets),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
}));

export const projectReposRelations = relations(projectRepos, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectRepos.projectId],
    references: [projects.id],
  }),
  tickets: many(tickets),
}));

export const projectMilestonesRelations = relations(
  projectMilestones,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [projectMilestones.projectId],
      references: [projects.id],
    }),
    tickets: many(tickets),
  }),
);

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  project: one(projects, {
    fields: [tickets.projectId],
    references: [projects.id],
  }),
  milestone: one(projectMilestones, {
    fields: [tickets.milestoneId],
    references: [projectMilestones.id],
  }),
  repo: one(projectRepos, {
    fields: [tickets.repoId],
    references: [projectRepos.id],
  }),
  comments: many(ticketComments),
  runs: many(agentRuns),
}));

export const ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketComments.ticketId],
    references: [tickets.id],
  }),
}));

export const agentRunsRelations = relations(agentRuns, ({ one, many }) => ({
  project: one(projects, {
    fields: [agentRuns.projectId],
    references: [projects.id],
  }),
  ticket: one(tickets, {
    fields: [agentRuns.ticketId],
    references: [tickets.id],
  }),
  repo: one(projectRepos, {
    fields: [agentRuns.repoId],
    references: [projectRepos.id],
  }),
  events: many(agentRunEvents),
}));

export const agentRunEventsRelations = relations(agentRunEvents, ({ one }) => ({
  run: one(agentRuns, {
    fields: [agentRunEvents.runId],
    references: [agentRuns.id],
  }),
}));

export type ProjectStatus = (typeof projectStatus.enumValues)[number];
export type ProjectMemberRole = (typeof projectMemberRole.enumValues)[number];
export type TicketStatus = (typeof ticketStatus.enumValues)[number];
export type TicketPriority = (typeof ticketPriority.enumValues)[number];
export type TicketSource = (typeof ticketSource.enumValues)[number];
export type MilestoneStatus = (typeof milestoneStatus.enumValues)[number];
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type NewProjectMember = typeof projectMembers.$inferInsert;
export type ProjectRepo = typeof projectRepos.$inferSelect;
export type NewProjectRepo = typeof projectRepos.$inferInsert;
export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type NewProjectMilestone = typeof projectMilestones.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type TicketComment = typeof ticketComments.$inferSelect;
export type NewTicketComment = typeof ticketComments.$inferInsert;
export type AgentRunStatus = (typeof agentRunStatus.enumValues)[number];
export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;
export type AgentRunEvent = typeof agentRunEvents.$inferSelect;
export type NewAgentRunEvent = typeof agentRunEvents.$inferInsert;
export type ClaimRequestStatus = (typeof claimRequestStatus.enumValues)[number];
export type ClaimRequest = typeof claimRequests.$inferSelect;
export type NewClaimRequest = typeof claimRequests.$inferInsert;
