import { z } from "@hono/zod-openapi";
import {
  DEFAULT_AGENT_STEPS,
  MAX_AGENT_DESCRIPTION,
  MAX_AGENT_INSTRUCTIONS,
  MAX_AGENT_NAME,
  MAX_AGENT_STEPS,
  MAX_BLOCKED_REASON,
  MAX_LOCAL_MODEL,
  MAX_STANDING_TASK,
  MAX_TICKET_DESCRIPTION,
  MAX_TICKET_TITLE,
  MIN_AGENT_STEPS,
} from "@westride/db/limits";
import { MUSE_MODEL_IDS } from "@westride/db/muse-models";
import {
  CollectionSortSchema,
  GithubRepoLinkSchema,
  PersonSchema,
  TicketCountsSchema,
  TicketPrioritySchema,
  TicketStatusSchema,
  flag,
  nullableTimestamp,
  optionalUuid,
  timestamp,
  uuid,
} from "./common";
import { LinkedNameSchema } from "./projects";

export const AgentStatusSchema = z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).openapi("AgentStatus");
export const AgentScheduleSchema = z
  .enum(["NONE", "HOURLY", "DAILY", "WEEKLY"])
  .openapi("AgentSchedule");
export const AgentRoleSchema = z.enum(["OWNER", "COLLABORATOR"]).openapi("AgentRole", {
  description:
    "OWNER manages the agent. COLLABORATOR (a member of the linked project or idea) works its tickets.",
});
export const MuseModelIdSchema = z.enum(MUSE_MODEL_IDS).openapi("MuseModelId");

export const UsageTotalsSchema = z
  .object({
    jobs: z.number().int(),
    modelCalls: z.number().int(),
    inputTokens: z.number().int(),
    cachedTokens: z.number().int(),
    outputTokens: z.number().int(),
    reasoningTokens: z.number().int(),
    totalTokens: z.number().int(),
    estimatedCostMicros: z.number().int().openapi({
      description: "USD in millionths, estimated from the published price list.",
    }),
  })
  .openapi("UsageTotals");

export const AgentScheduleSpecSchema = z
  .object({
    schedule: AgentScheduleSchema,
    hourUtc: z.number().int().min(0).max(23).nullable().openapi({ description: "For DAILY and WEEKLY." }),
    weekday: z.number().int().min(0).max(6).nullable().openapi({ description: "0 is Sunday. For WEEKLY." }),
    standingTask: z.string().openapi({
      description: "Markdown. What a scheduled wake-up does when the queue is empty.",
    }),
    summary: z.string().openapi({ example: "Daily at 09:00 UTC" }),
    nextRunAt: nullableTimestamp(),
    lastRunAt: nullableTimestamp(),
  })
  .openapi("AgentScheduleSpec");

export const AgentSchema = z
  .object({
    id: uuid(),
    name: z.string().openapi({ example: "Docs gardener" }),
    description: z.string().openapi({ description: "Markdown." }),
    instructions: z.string().openapi({ description: "Markdown. The standing brief every job starts from." }),
    imageUrl: z.string().nullable(),
    status: AgentStatusSchema,
    isPublic: z.boolean(),
    owner: PersonSchema,
    idea: LinkedNameSchema.nullable(),
    project: LinkedNameSchema.nullable(),
    model: z.string().openapi({ example: "muse-spark-1.3" }),
    maxSteps: z.number().int(),
    allowSponsorTokens: z.boolean().openapi({
      description: "Supporters' token pledges on the linked idea may pay for jobs.",
    }),
    allowVolunteerCompute: z.boolean().openapi({
      description: "Supporters' computers may run this agent's code jobs (public repos only).",
    }),
    volunteerLocalModel: z.string().nullable().openapi({
      description: "An Ollama model tag a volunteer device may use instead of `model`.",
    }),
    repo: GithubRepoLinkSchema.nullable().openapi({ description: "The repository the agent works in." }),
    schedule: AgentScheduleSpecSchema,
    ticketCounts: TicketCountsSchema,
    usage: UsageTotalsSchema,
    activeJobs: z.number().int().openapi({ description: "Jobs queued or running right now." }),
    viewerRole: AgentRoleSchema.nullable().openapi({ description: "What the caller may do, or null." }),
    createdAt: timestamp(),
    updatedAt: timestamp(),
  })
  .openapi("Agent");

export const AgentTicketSourceSchema = z.enum(["MEMBER", "SCHEDULE"]).openapi({
  description: "MEMBER when a person queued it, SCHEDULE when a wake-up filed the standing task.",
});

export const AgentTicketSchema = z
  .object({
    id: uuid(),
    number: z.number().int().openapi({ example: 3 }),
    key: z.string().openapi({ example: "DG-3" }),
    title: z.string(),
    description: z.string().openapi({ description: "Markdown. The brief the agent works from." }),
    status: TicketStatusSchema,
    priority: TicketPrioritySchema,
    blockedReason: z.string().nullable(),
    source: AgentTicketSourceSchema,
    createdBy: PersonSchema.nullable(),
    createdAt: timestamp(),
    updatedAt: timestamp(),
    completedAt: nullableTimestamp(),
  })
  .openapi("AgentTicket");

export const AgentJobStatusSchema = z
  .enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"])
  .openapi("AgentJobStatus");
export const AgentJobTriggerSchema = z.enum(["MANUAL", "SCHEDULE"]).openapi("AgentJobTrigger");
export const AgentJobKindSchema = z.enum(["CODE", "REPORT"]).openapi("AgentJobKind", {
  description: "CODE runs Muse Code in the repository; REPORT is a single Muse call.",
});

export const AgentJobSchema = z
  .object({
    id: uuid(),
    ticketId: uuid().nullable(),
    ticketTitle: z.string(),
    trigger: AgentJobTriggerSchema,
    kind: AgentJobKindSchema,
    status: AgentJobStatusSchema,
    startedBy: PersonSchema.nullable().openapi({ description: "Null when the schedule started it." }),
    model: z.string(),
    maxSteps: z.number().int(),
    repoFullName: z.string().nullable(),
    branch: z.string().nullable(),
    prUrl: z.string().nullable(),
    summary: z.string().nullable().openapi({ description: "Markdown. The closing message or report." }),
    error: z.string().nullable(),
    usage: UsageTotalsSchema,
    createdAt: timestamp(),
    startedAt: nullableTimestamp(),
    finishedAt: nullableTimestamp(),
  })
  .openapi("AgentJob");

export const AgentTicketDetailSchema = AgentTicketSchema.extend({
  jobs: z.array(AgentJobSchema).openapi({ description: "Jobs that worked this ticket, newest first." }),
}).openapi("AgentTicketDetail");

export const AgentLogEntrySchema = z
  .object({
    id: uuid(),
    kind: z.enum(["agent", "ticket", "job", "schedule", "settings"]),
    message: z.string().openapi({ description: "Markdown." }),
    ticketId: uuid().nullable(),
    jobId: uuid().nullable(),
    actor: PersonSchema.nullable().openapi({ description: "Null when the agent or schedule did it." }),
    createdAt: timestamp(),
  })
  .openapi("AgentLogEntry");

export const UsageBreakdownRowSchema = UsageTotalsSchema.extend({
  key: z.string().openapi({ description: "The model id, trigger, or YYYY-MM-DD day." }),
}).openapi("UsageBreakdownRow");

export const AgentUsageSchema = z
  .object({
    totals: UsageTotalsSchema,
    byModel: z.array(UsageBreakdownRowSchema),
    byTrigger: z.array(UsageBreakdownRowSchema),
    byDay: z.array(UsageBreakdownRowSchema).openapi({
      description: "Last 30 days, oldest first. Days with no jobs are omitted.",
    }),
  })
  .openapi("AgentUsage");

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export const ListAgentsQuerySchema = z.object({
  q: z.string().trim().max(200).optional().openapi({
    description: "Matches the name or description, case-insensitively.",
  }),
  status: AgentStatusSchema.optional(),
  mine: flag().openapi({ description: "Only agents the caller owns. Needs a token.", type: "boolean" }),
  sort: CollectionSortSchema.optional(),
});

export const ListAgentTicketsQuerySchema = z.object({
  status: TicketStatusSchema.optional(),
});

export const ListLimitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100).openapi({
    description: "How many entries to return, newest first.",
  }),
});

const agentName = z
  .string()
  .trim()
  .min(1, "Give the agent a name.")
  .max(MAX_AGENT_NAME, `Keep the name under ${MAX_AGENT_NAME} characters.`);
const agentDescription = z
  .string()
  .trim()
  .min(1, "Say what this agent is for.")
  .max(MAX_AGENT_DESCRIPTION, `Keep the description under ${MAX_AGENT_DESCRIPTION} characters.`)
  .openapi({ description: "Markdown." });
const agentInstructions = z
  .string()
  .trim()
  .max(MAX_AGENT_INSTRUCTIONS, `Keep the instructions under ${MAX_AGENT_INSTRUCTIONS} characters.`)
  .openapi({ description: "Markdown. The standing brief every job starts from." });
const maxSteps = z
  .number()
  .int()
  .min(MIN_AGENT_STEPS, `Allow at least ${MIN_AGENT_STEPS} steps.`)
  .max(MAX_AGENT_STEPS, `Keep the step limit under ${MAX_AGENT_STEPS}.`);
const volunteerLocalModel = z
  .union([
    z.string().trim().max(MAX_LOCAL_MODEL, `Keep the model name under ${MAX_LOCAL_MODEL} characters.`),
    z.null(),
  ])
  .transform((value) => value || null)
  .openapi({ description: "An Ollama model tag, e.g. `qwen2.5-coder:14b`, or null.", type: "string" });
const standingTask = z
  .string()
  .trim()
  .max(MAX_STANDING_TASK, `Keep the standing task under ${MAX_STANDING_TASK} characters.`)
  .openapi({ description: "Markdown. What a scheduled wake-up does when the queue is empty." });
const hourUtc = z.union([z.number().int().min(0).max(23), z.null()]).openapi({
  description: "0–23. Needed for DAILY and WEEKLY.",
  type: "integer",
});
const weekday = z.union([z.number().int().min(0).max(6), z.null()]).openapi({
  description: "0 (Sunday) – 6 (Saturday). Needed for WEEKLY.",
  type: "integer",
});

type ScheduleShape = {
  schedule?: "NONE" | "HOURLY" | "DAILY" | "WEEKLY";
  scheduleHourUtc?: number | null;
  scheduleWeekday?: number | null;
};

/** Only checks what the body sends; the route fills gaps from the saved agent. */
function checkSchedule(value: ScheduleShape, ctx: z.RefinementCtx) {
  if (
    (value.schedule === "DAILY" || value.schedule === "WEEKLY") &&
    value.scheduleHourUtc === null
  ) {
    ctx.addIssue({ code: "custom", message: "Pick an hour (UTC).", path: ["scheduleHourUtc"] });
  }
  if (value.schedule === "WEEKLY" && value.scheduleWeekday === null) {
    ctx.addIssue({ code: "custom", message: "Pick a day of the week.", path: ["scheduleWeekday"] });
  }
}

export const CreateAgentBodySchema = z
  .object({
    name: agentName.openapi({ example: "Docs gardener" }),
    description: agentDescription,
    instructions: agentInstructions.default(""),
    isPublic: z.boolean(),
    ideaId: optionalUuid().default(null).openapi({
      description: "An idea the caller belongs to.",
      type: "string",
      format: "uuid",
    }),
    projectId: optionalUuid().default(null).openapi({
      description: "A project the caller belongs to. Its members become collaborators.",
      type: "string",
      format: "uuid",
    }),
    model: MuseModelIdSchema.default("muse-spark-1.3"),
    maxSteps: maxSteps.default(DEFAULT_AGENT_STEPS),
    allowSponsorTokens: z.boolean().default(false),
    allowVolunteerCompute: z.boolean().default(false),
    volunteerLocalModel: volunteerLocalModel.default(null),
    schedule: AgentScheduleSchema.default("NONE"),
    scheduleHourUtc: hourUtc.default(null),
    scheduleWeekday: weekday.default(null),
    standingTask: standingTask.default(""),
    firstTicket: z
      .string()
      .trim()
      .max(MAX_TICKET_TITLE, `Keep the first ticket under ${MAX_TICKET_TITLE} characters.`)
      .default("")
      .openapi({ description: "A first ticket title to queue, so the agent has something to do." }),
  })
  .superRefine(checkSchedule)
  .openapi("CreateAgentBody", {
    description:
      "Repositories are linked from the web app, where GitHub access is checked. An agent without a repository runs report jobs.",
  });

export const UpdateAgentBodySchema = z
  .object({
    name: agentName.optional(),
    description: agentDescription.optional(),
    instructions: agentInstructions.optional(),
    isPublic: z.boolean().optional(),
    ideaId: optionalUuid().optional().openapi({ type: "string", format: "uuid" }),
    projectId: optionalUuid().optional().openapi({ type: "string", format: "uuid" }),
    model: MuseModelIdSchema.optional(),
    maxSteps: maxSteps.optional(),
    allowSponsorTokens: z.boolean().optional(),
    allowVolunteerCompute: z.boolean().optional(),
    volunteerLocalModel: volunteerLocalModel.optional(),
    schedule: AgentScheduleSchema.optional(),
    scheduleHourUtc: hourUtc.optional(),
    scheduleWeekday: weekday.optional(),
    standingTask: standingTask.optional(),
    status: AgentStatusSchema.optional().openapi({
      description: "ACTIVE resumes the schedule, PAUSED stops it, ARCHIVED retires the agent.",
    }),
  })
  .openapi("UpdateAgentBody", {
    description: "Every field is optional; omitted fields keep their value. Only the owner may edit.",
  });

const ticketTitle = z
  .string()
  .trim()
  .min(1, "Give the ticket a title.")
  .max(MAX_TICKET_TITLE, `Keep the title under ${MAX_TICKET_TITLE} characters.`);
const ticketDescription = z
  .string()
  .trim()
  .max(MAX_TICKET_DESCRIPTION, `Keep the description under ${MAX_TICKET_DESCRIPTION} characters.`)
  .openapi({ description: "Markdown. The brief the agent works from." });
const blockedReason = z
  .string()
  .trim()
  .max(MAX_BLOCKED_REASON, `Keep the reason under ${MAX_BLOCKED_REASON} characters.`);

export const CreateAgentTicketBodySchema = z
  .object({
    title: ticketTitle,
    description: ticketDescription.default(""),
    priority: TicketPrioritySchema.default("MEDIUM"),
  })
  .openapi("CreateAgentTicketBody");

export const UpdateAgentTicketBodySchema = z
  .object({
    title: ticketTitle.optional(),
    description: ticketDescription.optional(),
    priority: TicketPrioritySchema.optional(),
    status: TicketStatusSchema.optional().openapi({ description: "Moves the ticket." }),
    blockedReason: blockedReason.optional().openapi({ description: "Required when status is BLOCKED." }),
  })
  .refine((value) => value.status !== "BLOCKED" || Boolean(value.blockedReason), {
    error: "Say what is blocking this ticket.",
    path: ["blockedReason"],
  })
  .openapi("UpdateAgentTicketBody");

// ---------------------------------------------------------------------------
// Params and envelopes
// ---------------------------------------------------------------------------

export const agentIdParam = z.object({
  id: uuid().openapi({ param: { name: "id", in: "path" }, description: "Agent id." }),
});

export const agentTicketNumberParam = agentIdParam.extend({
  number: z.coerce
    .number()
    .int()
    .min(1)
    .openapi({ param: { name: "number", in: "path" }, description: "Ticket number within the agent." }),
});

export const agentJobIdParam = agentIdParam.extend({
  jobId: uuid().openapi({ param: { name: "jobId", in: "path" } }),
});

export const ListAgentsResponseSchema = z.object({ data: z.array(AgentSchema) });
export const AgentResponseSchema = z.object({ data: AgentSchema });
export const ListAgentTicketsResponseSchema = z.object({ data: z.array(AgentTicketSchema) });
export const AgentTicketResponseSchema = z.object({ data: AgentTicketSchema });
export const AgentTicketDetailResponseSchema = z.object({ data: AgentTicketDetailSchema });
export const ListAgentJobsResponseSchema = z.object({ data: z.array(AgentJobSchema) });
export const AgentJobResponseSchema = z.object({ data: AgentJobSchema });
export const ListAgentLogResponseSchema = z.object({ data: z.array(AgentLogEntrySchema) });
export const AgentUsageResponseSchema = z.object({ data: AgentUsageSchema });
