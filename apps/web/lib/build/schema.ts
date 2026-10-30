import type {
  MilestoneStatus,
  ProjectMemberRole,
  ProjectStatus,
  TicketPriority,
  TicketStatus,
} from "@westride/db";
import { z } from "zod";
import { parseGithubRepoRef } from "@/lib/github/repo-ref";

export const MAX_PROJECT_NAME = 120;
export const MAX_PROJECT_DESCRIPTION = 8000;
export const MAX_PROJECT_MEMBERS = 30;
export const MAX_TICKET_TITLE = 160;
export const MAX_TICKET_DESCRIPTION = 8000;
export const MAX_BLOCKED_REASON = 600;
export const MAX_MILESTONE_TITLE = 120;
export const MAX_MILESTONE_DESCRIPTION = 2000;

const projectStatuses = [
  "PLANNING",
  "BUILDING",
  "LAUNCHED",
  "PAUSED",
] as const satisfies readonly ProjectStatus[];
const memberRoles = ["OWNER", "MEMBER"] as const satisfies readonly ProjectMemberRole[];
const ticketStatuses = [
  "BACKLOG",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
  "DONE",
] as const satisfies readonly TicketStatus[];
const ticketPriorities = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
] as const satisfies readonly TicketPriority[];
const milestoneStatuses = [
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
] as const satisfies readonly MilestoneStatus[];

export const uuidSchema = z.string().uuid();

const memberSchema = z.object({
  clerkUserId: z.string().trim().min(1).max(128),
  role: z.enum(memberRoles, { error: "Choose a role." }),
});

const memberListSchema = z
  .array(memberSchema)
  .max(MAX_PROJECT_MEMBERS, `A project can have up to ${MAX_PROJECT_MEMBERS} people.`)
  .transform((members) => {
    const byUser = new Map<string, z.output<typeof memberSchema>>();
    for (const member of members) {
      byUser.set(member.clerkUserId, member);
    }
    return [...byUser.values()];
  });

const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Give the project a name.")
  .max(MAX_PROJECT_NAME, `Keep the name under ${MAX_PROJECT_NAME} characters.`);

const projectDescriptionSchema = z
  .string()
  .trim()
  .min(1, "Describe what you are building.")
  .max(
    MAX_PROJECT_DESCRIPTION,
    `Keep the description under ${MAX_PROJECT_DESCRIPTION} characters.`,
  );

const githubRepoUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (url) => !url || parseGithubRepoRef(url) !== null,
    "Use a GitHub repository link, like https://github.com/owner/repo.",
  );

export const createProjectSchema = z.object({
  name: projectNameSchema,
  description: projectDescriptionSchema,
  isPublic: z.boolean({ error: "Choose who can see this project." }),
  /** The idea this project builds. Empty when started fresh. */
  ideaId: z.union([uuidSchema, z.literal("")]).default(""),
  /** People besides the creator, who becomes an owner. */
  invites: memberListSchema,
  /** Repositories to link right away. */
  githubRepoUrls: z.array(githubRepoUrlSchema).max(10).default([]),
});

export type CreateProjectInput = z.output<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    name: projectNameSchema,
    description: projectDescriptionSchema,
    isPublic: z.boolean(),
    status: z.enum(projectStatuses, { error: "Choose a status." }),
    members: memberListSchema,
  })
  .refine((value) => value.members.some((member) => member.role === "OWNER"), {
    error: "Keep at least one owner.",
    path: ["members"],
  });

export type UpdateProjectInput = z.output<typeof updateProjectSchema>;

const optionalUuid = z.union([uuidSchema, z.literal(""), z.null()]).transform(
  (value) => value || null,
);

const ticketFields = {
  title: z
    .string()
    .trim()
    .min(1, "Give the ticket a title.")
    .max(MAX_TICKET_TITLE, `Keep the title under ${MAX_TICKET_TITLE} characters.`),
  description: z
    .string()
    .trim()
    .max(
      MAX_TICKET_DESCRIPTION,
      `Keep the description under ${MAX_TICKET_DESCRIPTION} characters.`,
    )
    .default(""),
  priority: z.enum(ticketPriorities, { error: "Choose a priority." }),
  milestoneId: optionalUuid.default(null),
  repoId: optionalUuid.default(null),
  assigneeClerkUserId: z
    .union([z.string().trim().max(128), z.null()])
    .transform((value) => value || null)
    .default(null),
};

export const ticketSchema = z.object(ticketFields);

export type TicketInputValues = z.output<typeof ticketSchema>;

export const moveTicketSchema = z
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

export const milestoneSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the milestone a title.")
    .max(MAX_MILESTONE_TITLE, `Keep the title under ${MAX_MILESTONE_TITLE} characters.`),
  description: z
    .string()
    .trim()
    .max(
      MAX_MILESTONE_DESCRIPTION,
      `Keep the description under ${MAX_MILESTONE_DESCRIPTION} characters.`,
    )
    .default(""),
  status: z.enum(milestoneStatuses, { error: "Choose a status." }),
  targetDate: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date."), z.literal(""), z.null()])
    .transform((value) => value || null)
    .default(null),
});

export type MilestoneInputValues = z.output<typeof milestoneSchema>;

export type FieldErrors = Partial<Record<string, string>>;

export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

/** The project draft the create dialog holds. */
export type ProjectDraft = {
  name: string;
  description: string;
  isPublic: boolean;
  ideaId: string;
  invites: { clerkUserId: string; role: ProjectMemberRole }[];
  githubRepoUrls: string[];
};

export function validateProjectDraft(draft: ProjectDraft): FieldErrors {
  const parsed = createProjectSchema.safeParse(draft);
  return parsed.success ? {} : fieldErrorsFrom(parsed.error);
}

export type ProjectEditDraft = {
  name: string;
  description: string;
  isPublic: boolean;
  status: ProjectStatus;
  members: { clerkUserId: string; role: ProjectMemberRole }[];
};

export function validateProjectEdit(draft: ProjectEditDraft): FieldErrors {
  const parsed = updateProjectSchema.safeParse(draft);
  return parsed.success ? {} : fieldErrorsFrom(parsed.error);
}

export type TicketDraft = {
  title: string;
  description: string;
  priority: TicketPriority;
  milestoneId: string | null;
  repoId: string | null;
  assigneeClerkUserId: string | null;
};

export function validateTicketDraft(draft: TicketDraft): FieldErrors {
  const parsed = ticketSchema.safeParse(draft);
  return parsed.success ? {} : fieldErrorsFrom(parsed.error);
}
