import { z } from "@hono/zod-openapi";
import {
  MAX_BLOCKED_REASON,
  MAX_COMMENT,
  MAX_MILESTONE_DESCRIPTION,
  MAX_MILESTONE_TITLE,
  MAX_PROJECT_DESCRIPTION,
  MAX_PROJECT_MEMBERS,
  MAX_PROJECT_NAME,
  MAX_TICKET_DESCRIPTION,
  MAX_TICKET_TITLE,
} from "@westride/db/limits";
import {
  CollectionSortSchema,
  ContentOriginSchema,
  GithubRepoLinkSchema,
  PersonSchema,
  TicketCountsSchema,
  TicketPrioritySchema,
  TicketStatusSchema,
  flag,
  nullableTimestamp,
  optionalUuid,
  timestamp,
  userId,
  uuid,
} from "./common";
import { AgentSummarySchema } from "./ideas";

export const ProjectStatusSchema = z
  .enum(["PLANNING", "BUILDING", "LAUNCHED", "PAUSED"])
  .openapi("ProjectStatus");

export const ProjectMemberRoleSchema = z.enum(["OWNER", "MEMBER"]).openapi("ProjectMemberRole");

export const MilestoneStatusSchema = z
  .enum(["PLANNED", "ACTIVE", "COMPLETED"])
  .openapi("MilestoneStatus");

export const ProjectMemberSchema = PersonSchema.extend({
  role: ProjectMemberRoleSchema,
}).openapi("ProjectMember");

export const ProjectRepoSchema = GithubRepoLinkSchema.extend({
  id: uuid().openapi({ description: "The link's id, used when a ticket targets this repository." }),
  isPrimary: z.boolean().openapi({ description: "The repository agents work in unless a ticket says otherwise." }),
}).openapi("ProjectRepo");

export const MilestoneSchema = z
  .object({
    id: uuid(),
    title: z.string().openapi({ example: "Public beta" }),
    description: z.string().openapi({ description: "Markdown." }),
    status: MilestoneStatusSchema,
    targetDate: z.string().nullable().openapi({ description: "ISO date (YYYY-MM-DD), or null.", example: "2026-06-30" }),
    sortOrder: z.number().int(),
    createdAt: timestamp(),
    updatedAt: timestamp(),
  })
  .openapi("Milestone");

export const LinkedNameSchema = z.object({ id: uuid(), name: z.string() });

export const ProjectSchema = z
  .object({
    id: uuid(),
    name: z.string().openapi({ example: "Tool Library App" }),
    description: z.string().openapi({ description: "Markdown." }),
    status: ProjectStatusSchema,
    imageUrl: z.string().nullable(),
    isPublic: z.boolean(),
    origin: ContentOriginSchema,
    idea: LinkedNameSchema.nullable().openapi({ description: "The idea this project builds, if any." }),
    members: z.array(ProjectMemberSchema).openapi({ description: "Owners first." }),
    repos: z.array(ProjectRepoSchema).openapi({ description: "Primary first." }),
    milestones: z.array(MilestoneSchema).openapi({ description: "In roadmap order." }),
    ticketCounts: TicketCountsSchema,
    viewerRole: ProjectMemberRoleSchema.nullable().openapi({ description: "The caller's role, or null." }),
    createdAt: timestamp(),
    updatedAt: timestamp(),
  })
  .openapi("Project");

export const ProjectDetailSchema = ProjectSchema.extend({
  agents: z.array(AgentSummarySchema).openapi({
    description: "Agents linked to this project that the caller may see.",
  }),
}).openapi("ProjectDetail");

export const TicketSourceSchema = z.enum(["MEMBER", "MUSE"]).openapi({
  description: "MEMBER when a person wrote it, MUSE when planning drafted it.",
});

export const TicketSchema = z
  .object({
    id: uuid(),
    number: z.number().int().openapi({ description: "Per-project sequence starting at 1.", example: 12 }),
    key: z.string().openapi({ description: "Short code from the project's name.", example: "TLA-12" }),
    title: z.string().openapi({ example: "Add a search box to the catalog" }),
    description: z.string().openapi({ description: "Markdown. Written as what done looks like." }),
    status: TicketStatusSchema,
    priority: TicketPrioritySchema,
    blockedReason: z.string().nullable(),
    milestone: z.object({ id: uuid(), title: z.string() }).nullable(),
    repo: z.object({ id: uuid(), owner: z.string(), name: z.string() }).nullable(),
    assignee: PersonSchema.nullable(),
    source: TicketSourceSchema,
    createdBy: PersonSchema.nullable(),
    createdAt: timestamp(),
    updatedAt: timestamp(),
    completedAt: nullableTimestamp(),
  })
  .openapi("Ticket");

export const TicketCommentSchema = z
  .object({
    id: uuid(),
    body: z.string().openapi({ description: "Markdown." }),
    author: PersonSchema.nullable().openapi({ description: "Null when an agent run wrote it." }),
    agentRunId: uuid().nullable(),
    createdAt: timestamp(),
  })
  .openapi("TicketComment");

export const TicketDetailSchema = TicketSchema.extend({
  comments: z.array(TicketCommentSchema).openapi({ description: "Oldest first." }),
}).openapi("TicketDetail");

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export const ListProjectsQuerySchema = z.object({
  q: z.string().trim().max(200).optional().openapi({
    description: "Matches the name or description, case-insensitively.",
  }),
  status: ProjectStatusSchema.optional(),
  mine: flag().openapi({
    description: "Only projects the caller belongs to. Needs a token.",
    type: "boolean",
  }),
  sort: CollectionSortSchema.optional(),
});

export const ListTicketsQuerySchema = z.object({
  status: TicketStatusSchema.optional(),
});

const projectName = z
  .string()
  .trim()
  .min(1, "Give the project a name.")
  .max(MAX_PROJECT_NAME, `Keep the name under ${MAX_PROJECT_NAME} characters.`)
  .openapi({ example: "Tool Library App" });

const projectDescription = z
  .string()
  .trim()
  .min(1, "Describe what you are building.")
  .max(MAX_PROJECT_DESCRIPTION, `Keep the description under ${MAX_PROJECT_DESCRIPTION} characters.`)
  .openapi({ description: "Markdown." });

const projectInvite = z.object({ userId: userId(), role: ProjectMemberRoleSchema });

export const CreateProjectBodySchema = z
  .object({
    name: projectName,
    description: projectDescription,
    isPublic: z.boolean(),
    ideaId: optionalUuid().default(null).openapi({
      description: "The idea this project builds. You must be on that idea's team.",
      type: "string",
      format: "uuid",
    }),
    invites: z
      .array(projectInvite)
      .max(MAX_PROJECT_MEMBERS, `A project can have up to ${MAX_PROJECT_MEMBERS} people.`)
      .default([])
      .openapi({ description: "People to add besides you. You become an owner." }),
  })
  .openapi("CreateProjectBody");

export const UpdateProjectBodySchema = z
  .object({
    name: projectName.optional(),
    description: projectDescription.optional(),
    isPublic: z.boolean().optional(),
    status: ProjectStatusSchema.optional(),
    members: z
      .array(projectInvite)
      .max(MAX_PROJECT_MEMBERS, `A project can have up to ${MAX_PROJECT_MEMBERS} people.`)
      .optional()
      .openapi({ description: "The whole team after the change. Keep at least one owner." }),
  })
  .openapi("UpdateProjectBody", {
    description: "Every field is optional; omitted fields keep their value. Only owners may edit.",
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
  .openapi({ description: "Markdown. Write what done looks like; agents work from this text." });

const blockedReason = z
  .string()
  .trim()
  .max(MAX_BLOCKED_REASON, `Keep the reason under ${MAX_BLOCKED_REASON} characters.`)
  .openapi({ description: "Why the ticket is blocked. Required when status is BLOCKED." });

const assigneeUserId = z
  .union([userId(), z.literal(""), z.null()])
  .transform((value) => value || null)
  .openapi({ description: "A team member's id, or null for nobody.", type: "string" });

export const CreateTicketBodySchema = z
  .object({
    title: ticketTitle,
    description: ticketDescription.default(""),
    priority: TicketPrioritySchema.default("MEDIUM"),
    milestoneId: optionalUuid().default(null).openapi({ type: "string", format: "uuid" }),
    repoId: optionalUuid().default(null).openapi({
      description: "One of the project's repository link ids. Null means the primary.",
      type: "string",
      format: "uuid",
    }),
    assigneeUserId: assigneeUserId.default(null),
  })
  .openapi("CreateTicketBody");

export const UpdateTicketBodySchema = z
  .object({
    title: ticketTitle.optional(),
    description: ticketDescription.optional(),
    priority: TicketPrioritySchema.optional(),
    milestoneId: optionalUuid().optional().openapi({ type: "string", format: "uuid" }),
    repoId: optionalUuid().optional().openapi({ type: "string", format: "uuid" }),
    assigneeUserId: assigneeUserId.optional(),
    status: TicketStatusSchema.optional().openapi({
      description: "Moves the ticket. It lands at the top of the new column.",
    }),
    blockedReason: blockedReason.optional(),
  })
  .refine((value) => value.status !== "BLOCKED" || Boolean(value.blockedReason), {
    error: "Say what is blocking this ticket.",
    path: ["blockedReason"],
  })
  .openapi("UpdateTicketBody", {
    description: "Every field is optional; omitted fields keep their value.",
  });

export const CreateCommentBodySchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1, "Write a comment.")
      .max(MAX_COMMENT, `Keep comments under ${MAX_COMMENT} characters.`)
      .openapi({ description: "Markdown." }),
  })
  .openapi("CreateCommentBody");

const milestoneTitle = z
  .string()
  .trim()
  .min(1, "Give the milestone a title.")
  .max(MAX_MILESTONE_TITLE, `Keep the title under ${MAX_MILESTONE_TITLE} characters.`);

const milestoneDescription = z
  .string()
  .trim()
  .max(MAX_MILESTONE_DESCRIPTION, `Keep the description under ${MAX_MILESTONE_DESCRIPTION} characters.`)
  .openapi({ description: "Markdown." });

const targetDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-06-30."), z.literal(""), z.null()])
  .transform((value) => value || null)
  .openapi({ description: "ISO date (YYYY-MM-DD), or null.", type: "string", format: "date" });

export const CreateMilestoneBodySchema = z
  .object({
    title: milestoneTitle,
    description: milestoneDescription.default(""),
    status: MilestoneStatusSchema.default("PLANNED"),
    targetDate: targetDate.default(null),
  })
  .openapi("CreateMilestoneBody");

export const UpdateMilestoneBodySchema = z
  .object({
    title: milestoneTitle.optional(),
    description: milestoneDescription.optional(),
    status: MilestoneStatusSchema.optional(),
    targetDate: targetDate.optional(),
  })
  .openapi("UpdateMilestoneBody");

// ---------------------------------------------------------------------------
// Params and envelopes
// ---------------------------------------------------------------------------

export const projectIdParam = z.object({
  id: uuid().openapi({ param: { name: "id", in: "path" }, description: "Project id." }),
});

export const ticketNumberParam = projectIdParam.extend({
  number: z.coerce
    .number()
    .int()
    .min(1)
    .openapi({ param: { name: "number", in: "path" }, description: "Ticket number within the project.", example: 12 }),
});

export const milestoneIdParam = projectIdParam.extend({
  milestoneId: uuid().openapi({ param: { name: "milestoneId", in: "path" } }),
});

export const ListProjectsResponseSchema = z.object({ data: z.array(ProjectSchema) });
export const ProjectResponseSchema = z.object({ data: ProjectDetailSchema });
export const ListTicketsResponseSchema = z.object({ data: z.array(TicketSchema) });
export const TicketResponseSchema = z.object({ data: TicketSchema });
export const TicketDetailResponseSchema = z.object({ data: TicketDetailSchema });
export const TicketCommentResponseSchema = z.object({ data: TicketCommentSchema });
export const MilestoneResponseSchema = z.object({ data: MilestoneSchema });
