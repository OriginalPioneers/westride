import type { AgentSchedule, AgentStatus, TicketPriority, TicketStatus } from "@westride/db";
import { z } from "zod";
import {
  DEFAULT_AGENT_STEPS,
  MAX_AGENT_DESCRIPTION,
  MAX_AGENT_INSTRUCTIONS,
  MAX_AGENT_NAME,
  MAX_AGENT_STEPS,
  MAX_BLOCKED_REASON,
  MAX_JOB_INSTRUCTIONS,
  MAX_LOCAL_MODEL,
  MAX_STANDING_TASK,
  MAX_TICKET_DESCRIPTION,
  MAX_TICKET_TITLE,
  MIN_AGENT_STEPS,
} from "@westride/db/limits";
import { fieldErrorsFrom, uuidSchema, type FieldErrors } from "@/lib/build/schema";
import { parseGithubRepoRef } from "@/lib/github/repo-ref";

export {
  DEFAULT_AGENT_STEPS,
  MAX_AGENT_DESCRIPTION,
  MAX_AGENT_INSTRUCTIONS,
  MAX_AGENT_NAME,
  MAX_AGENT_STEPS,
  MAX_BLOCKED_REASON,
  MAX_JOB_INSTRUCTIONS,
  MAX_LOCAL_MODEL,
  MAX_STANDING_TASK,
  MAX_TICKET_DESCRIPTION,
  MAX_TICKET_TITLE,
  MIN_AGENT_STEPS,
  fieldErrorsFrom,
  uuidSchema,
};
export type { FieldErrors };

const agentStatuses = ["ACTIVE", "PAUSED", "ARCHIVED"] as const satisfies readonly AgentStatus[];
const agentSchedules = ["NONE", "HOURLY", "DAILY", "WEEKLY"] as const satisfies readonly AgentSchedule[];
const ticketStatuses = [
  "BACKLOG",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
  "DONE",
] as const satisfies readonly TicketStatus[];
const ticketPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const satisfies readonly TicketPriority[];

const optionalUuid = z
  .union([uuidSchema, z.literal(""), z.null()])
  .transform((value) => value || null);

const agentFields = {
  name: z
    .string()
    .trim()
    .min(1, "Give the agent a name.")
    .max(MAX_AGENT_NAME, `Keep the name under ${MAX_AGENT_NAME} characters.`),
  description: z
    .string()
    .trim()
    .min(1, "Say what this agent is for.")
    .max(MAX_AGENT_DESCRIPTION, `Keep the description under ${MAX_AGENT_DESCRIPTION} characters.`),
  instructions: z
    .string()
    .trim()
    .max(MAX_AGENT_INSTRUCTIONS, `Keep the instructions under ${MAX_AGENT_INSTRUCTIONS} characters.`)
    .default(""),
  isPublic: z.boolean({ error: "Choose who can see this agent." }),
  ideaId: optionalUuid.default(null),
  projectId: optionalUuid.default(null),
  model: z.string().trim().min(1, "Choose a model."),
  maxSteps: z
    .number({ error: "Set a step limit." })
    .int()
    .min(MIN_AGENT_STEPS, `Allow at least ${MIN_AGENT_STEPS} steps.`)
    .max(MAX_AGENT_STEPS, `Keep the step limit under ${MAX_AGENT_STEPS}.`)
    .default(DEFAULT_AGENT_STEPS),
  /** Let supporters' token pledges on the linked idea pay for this agent's jobs. */
  allowSponsorTokens: z.boolean().default(false),
  /** Let supporters' computers run this agent's code jobs (public repos only). */
  allowVolunteerCompute: z.boolean().default(false),
  /** Ollama model a volunteer computer may use when it has no Meta key. */
  volunteerLocalModel: z
    .union([z.string().trim().max(MAX_LOCAL_MODEL, `Keep the model name under ${MAX_LOCAL_MODEL} characters.`), z.null()])
    .transform((value) => value || null)
    .default(null),
};

export const githubRepoUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (url) => !url || parseGithubRepoRef(url) !== null,
    "Use a GitHub repository link, like https://github.com/owner/repo.",
  );

const scheduleFields = {
  schedule: z.enum(agentSchedules, { error: "Choose a schedule." }),
  scheduleHourUtc: z
    .union([z.number().int().min(0).max(23), z.null()])
    .default(null),
  scheduleWeekday: z
    .union([z.number().int().min(0).max(6), z.null()])
    .default(null),
  standingTask: z
    .string()
    .trim()
    .max(MAX_STANDING_TASK, `Keep the standing task under ${MAX_STANDING_TASK} characters.`)
    .default(""),
};

const scheduleRefinement = (
  value: { schedule: AgentSchedule; scheduleHourUtc: number | null; scheduleWeekday: number | null },
  ctx: z.RefinementCtx,
) => {
  if ((value.schedule === "DAILY" || value.schedule === "WEEKLY") && value.scheduleHourUtc === null) {
    ctx.addIssue({ code: "custom", message: "Pick an hour (UTC).", path: ["scheduleHourUtc"] });
  }
  if (value.schedule === "WEEKLY" && value.scheduleWeekday === null) {
    ctx.addIssue({ code: "custom", message: "Pick a day of the week.", path: ["scheduleWeekday"] });
  }
};

export const agentDetailsSchema = z.object(agentFields);
export type AgentDetailsInput = z.output<typeof agentDetailsSchema>;

export const agentScheduleSchema = z.object(scheduleFields).superRefine(scheduleRefinement);
export type AgentScheduleValues = z.output<typeof agentScheduleSchema>;

export const createAgentSchema = z
  .object({
    ...agentFields,
    ...scheduleFields,
    githubRepoUrl: githubRepoUrlSchema.default(""),
    /** A first ticket to queue, so a new agent has something to do. */
    firstTicket: z
      .string()
      .trim()
      .max(MAX_TICKET_TITLE, `Keep the first ticket under ${MAX_TICKET_TITLE} characters.`)
      .default(""),
  })
  .superRefine(scheduleRefinement);
export type CreateAgentInput = z.output<typeof createAgentSchema>;

export const agentRepoSchema = z.object({ githubRepoUrl: githubRepoUrlSchema });

export const agentStatusSchema = z.object({
  status: z.enum(agentStatuses, { error: "Choose a status." }),
});

export const agentTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the ticket a title.")
    .max(MAX_TICKET_TITLE, `Keep the title under ${MAX_TICKET_TITLE} characters.`),
  description: z
    .string()
    .trim()
    .max(MAX_TICKET_DESCRIPTION, `Keep the description under ${MAX_TICKET_DESCRIPTION} characters.`)
    .default(""),
  priority: z.enum(ticketPriorities, { error: "Choose a priority." }),
});
export type AgentTicketValues = z.output<typeof agentTicketSchema>;

export const moveAgentTicketSchema = z
  .object({
    status: z.enum(ticketStatuses, { error: "Choose a status." }),
    blockedReason: z
      .string()
      .trim()
      .max(MAX_BLOCKED_REASON, `Keep the reason under ${MAX_BLOCKED_REASON} characters.`)
      .default(""),
  })
  .refine((value) => value.status !== "BLOCKED" || value.blockedReason.length > 0, {
    error: "Say what is blocking this ticket.",
    path: ["blockedReason"],
  });

export const runJobSchema = z.object({
  instructions: z
    .string()
    .trim()
    .max(MAX_JOB_INSTRUCTIONS, `Keep the guidance under ${MAX_JOB_INSTRUCTIONS} characters.`)
    .default(""),
});

// ---------------------------------------------------------------------------
// Drafts the dialogs hold
// ---------------------------------------------------------------------------

export type AgentDraft = {
  name: string;
  description: string;
  instructions: string;
  isPublic: boolean;
  ideaId: string | null;
  projectId: string | null;
  model: string;
  maxSteps: number;
  allowSponsorTokens: boolean;
  allowVolunteerCompute: boolean;
  volunteerLocalModel: string | null;
  githubRepoUrl: string;
  schedule: AgentSchedule;
  scheduleHourUtc: number | null;
  scheduleWeekday: number | null;
  standingTask: string;
  firstTicket: string;
};

export function validateAgentDraft(draft: AgentDraft): FieldErrors {
  const parsed = createAgentSchema.safeParse(draft);
  return parsed.success ? {} : fieldErrorsFrom(parsed.error);
}

export type AgentDetailsDraft = Omit<
  AgentDraft,
  "githubRepoUrl" | "schedule" | "scheduleHourUtc" | "scheduleWeekday" | "standingTask" | "firstTicket"
>;

export function validateAgentDetails(draft: AgentDetailsDraft): FieldErrors {
  const parsed = agentDetailsSchema.safeParse(draft);
  return parsed.success ? {} : fieldErrorsFrom(parsed.error);
}

export type AgentScheduleDraft = Pick<
  AgentDraft,
  "schedule" | "scheduleHourUtc" | "scheduleWeekday" | "standingTask"
>;

export function validateAgentSchedule(draft: AgentScheduleDraft): FieldErrors {
  const parsed = agentScheduleSchema.safeParse(draft);
  return parsed.success ? {} : fieldErrorsFrom(parsed.error);
}

export type AgentTicketDraft = {
  title: string;
  description: string;
  priority: TicketPriority;
};

export function validateAgentTicketDraft(draft: AgentTicketDraft): FieldErrors {
  const parsed = agentTicketSchema.safeParse(draft);
  return parsed.success ? {} : fieldErrorsFrom(parsed.error);
}
