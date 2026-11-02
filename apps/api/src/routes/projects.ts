import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import type { ProjectMemberRole } from "@westride/db";
import { listAgentsForProject } from "@westride/db/agents";
import {
  createMilestone,
  createProject,
  createTicket,
  deleteMilestone,
  deleteTicket,
  getProject,
  getTicket,
  listProjects,
  listTickets,
  moveTicket,
  updateMilestone,
  updateProjectDetails,
  updateTicket,
  type ProjectWithDetails,
} from "@westride/db/build";
import { addTicketComment, listTicketComments } from "@westride/db/build-agents";
import { getIdea, listIdeaNames } from "@westride/db/ideas";
import type { Context } from "hono";
import { signInRequired, viewerOf, type Caller } from "../auth";
import { forbidden, notFound, onValidationError, validationFailed } from "../errors";
import { resolvePeople, unknownPeople } from "../people";
import {
  EmptyResponseSchema,
  bearerSecurity,
  internalErrorResponse,
  jsonContent,
  readErrorResponses,
  unauthorizedResponse,
  writeErrorResponses,
} from "../schemas/common";
import {
  CreateCommentBodySchema,
  CreateMilestoneBodySchema,
  CreateProjectBodySchema,
  CreateTicketBodySchema,
  ListProjectsQuerySchema,
  ListProjectsResponseSchema,
  ListTicketsQuerySchema,
  ListTicketsResponseSchema,
  MilestoneResponseSchema,
  ProjectResponseSchema,
  TicketCommentResponseSchema,
  TicketDetailResponseSchema,
  TicketResponseSchema,
  UpdateMilestoneBodySchema,
  UpdateProjectBodySchema,
  UpdateTicketBodySchema,
  milestoneIdParam,
  projectIdParam,
  ticketNumberParam,
} from "../schemas/projects";
import {
  toComment,
  toMilestone,
  toProjectDetail,
  toProjects,
  toTicket,
  toTicketDetail,
  toTickets,
} from "../serialize/projects";

const TAG = "Projects";

async function projectDetail(c: Context, project: ProjectWithDetails) {
  const viewer = viewerOf(c);
  const [ideaNames, agents] = await Promise.all([
    project.ideaId ? listIdeaNames([project.ideaId], viewer) : new Map<string, string>(),
    listAgentsForProject(project.id, viewer),
  ]);
  const idea = project.ideaId
    ? { id: project.ideaId, name: ideaNames.get(project.ideaId) ?? "" }
    : null;
  return toProjectDetail(project, idea, agents, viewer.clerkUserId);
}

type Membership =
  | { ok: true; project: ProjectWithDetails; role: ProjectMemberRole }
  | { ok: false; reason: "not_found" | "not_member" | "not_owner" };

/** Loads a project the caller belongs to, with their role. */
async function membership(
  projectId: string,
  caller: Caller,
  minimum: ProjectMemberRole = "MEMBER",
): Promise<Membership> {
  const project = await getProject(projectId, { clerkUserId: caller.userId });
  if (!project) {
    return { ok: false, reason: "not_found" };
  }
  const role = project.members.find((member) => member.clerkUserId === caller.userId)?.role;
  if (!role) {
    return { ok: false, reason: "not_member" };
  }
  if (minimum === "OWNER" && role !== "OWNER") {
    return { ok: false, reason: "not_owner" };
  }
  return { ok: true, project, role };
}

function membershipError(c: Context, denied: Extract<Membership, { ok: false }>) {
  switch (denied.reason) {
    case "not_found":
      return notFound(c, "That project");
    case "not_member":
      return forbidden(c, "Only members of this project can change it.");
    case "not_owner":
      return forbidden(c, "Only an owner can do that.");
  }
}

function checkTicketLinks(
  project: ProjectWithDetails,
  input: { milestoneId: string | null; repoId: string | null; assigneeClerkUserId: string | null },
): { message: string; fields: Record<string, string> } | null {
  if (input.milestoneId && !project.milestones.some((m) => m.id === input.milestoneId)) {
    return {
      message: "That milestone is not on this project.",
      fields: { milestoneId: "Pick one of this project's milestones." },
    };
  }
  if (input.repoId && !project.repos.some((repo) => repo.id === input.repoId)) {
    return {
      message: "That repository is not linked to this project.",
      fields: { repoId: "Pick one of this project's repositories." },
    };
  }
  if (
    input.assigneeClerkUserId &&
    !project.members.some((member) => member.clerkUserId === input.assigneeClerkUserId)
  ) {
    return {
      message: "Assign the ticket to someone on the project.",
      fields: { assigneeUserId: "Pick a project member." },
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Routes: projects
// ---------------------------------------------------------------------------

const listRoute = createRoute({
  method: "get",
  path: "/",
  operationId: "listProjects",
  tags: [TAG],
  summary: "List projects",
  description:
    "Projects the caller may see: every public project, plus private projects the caller belongs to when a token is sent.",
  security: bearerSecurity,
  request: { query: ListProjectsQuerySchema },
  responses: {
    200: jsonContent(ListProjectsResponseSchema, "Matching projects."),
    401: unauthorizedResponse,
    500: internalErrorResponse,
  },
});

const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  operationId: "getProject",
  tags: [TAG],
  summary: "Get a project",
  description:
    "One project with its team, repositories, milestones, ticket counts, and the agents linked to it that the caller may see.",
  security: bearerSecurity,
  request: { params: projectIdParam },
  responses: {
    200: jsonContent(ProjectResponseSchema, "The project."),
    ...readErrorResponses,
  },
});

const createRoute_ = createRoute({
  method: "post",
  path: "/",
  operationId: "createProject",
  tags: [TAG],
  summary: "Create a project",
  description:
    "Creates a project with the caller as an owner. Link it to an idea you belong to with `ideaId`. Repositories are linked from the web app, where GitHub access is checked.",
  security: bearerSecurity,
  request: { body: jsonContent(CreateProjectBodySchema, "The new project.") },
  responses: {
    201: jsonContent(ProjectResponseSchema, "The project as created."),
    ...writeErrorResponses,
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/{id}",
  operationId: "updateProject",
  tags: [TAG],
  summary: "Update a project",
  description:
    "Changes a project's name, description, visibility, status, or team. Only an owner may edit. Omitted fields keep their value.",
  security: bearerSecurity,
  request: { params: projectIdParam, body: jsonContent(UpdateProjectBodySchema, "The fields to change.") },
  responses: {
    200: jsonContent(ProjectResponseSchema, "The project after the change."),
    ...writeErrorResponses,
  },
});

// ---------------------------------------------------------------------------
// Routes: tickets
// ---------------------------------------------------------------------------

const listTicketsRoute = createRoute({
  method: "get",
  path: "/{id}/tickets",
  operationId: "listTickets",
  tags: [TAG],
  summary: "List a project's tickets",
  description: "Every ticket on the project, in board order within each status.",
  security: bearerSecurity,
  request: { params: projectIdParam, query: ListTicketsQuerySchema },
  responses: {
    200: jsonContent(ListTicketsResponseSchema, "The tickets."),
    ...readErrorResponses,
  },
});

const getTicketRoute = createRoute({
  method: "get",
  path: "/{id}/tickets/{number}",
  operationId: "getTicket",
  tags: [TAG],
  summary: "Get a ticket",
  description: "One ticket by its number within the project, with its comments.",
  security: bearerSecurity,
  request: { params: ticketNumberParam },
  responses: {
    200: jsonContent(TicketDetailResponseSchema, "The ticket."),
    ...readErrorResponses,
  },
});

const createTicketRoute = createRoute({
  method: "post",
  path: "/{id}/tickets",
  operationId: "createTicket",
  tags: [TAG],
  summary: "Create a ticket",
  description: "Adds a ticket to the backlog. Any project member may create tickets.",
  security: bearerSecurity,
  request: { params: projectIdParam, body: jsonContent(CreateTicketBodySchema, "The new ticket.") },
  responses: {
    201: jsonContent(TicketResponseSchema, "The ticket as created."),
    ...writeErrorResponses,
  },
});

const updateTicketRoute = createRoute({
  method: "patch",
  path: "/{id}/tickets/{number}",
  operationId: "updateTicket",
  tags: [TAG],
  summary: "Update or move a ticket",
  description:
    "Edits a ticket's fields and, when `status` is sent, moves it to that column. Any project member may edit.",
  security: bearerSecurity,
  request: { params: ticketNumberParam, body: jsonContent(UpdateTicketBodySchema, "The fields to change.") },
  responses: {
    200: jsonContent(TicketResponseSchema, "The ticket after the change."),
    ...writeErrorResponses,
  },
});

const deleteTicketRoute = createRoute({
  method: "delete",
  path: "/{id}/tickets/{number}",
  operationId: "deleteTicket",
  tags: [TAG],
  summary: "Delete a ticket",
  security: bearerSecurity,
  request: { params: ticketNumberParam },
  responses: {
    200: jsonContent(EmptyResponseSchema, "The ticket was deleted."),
    401: unauthorizedResponse,
    403: writeErrorResponses[403],
    404: writeErrorResponses[404],
    500: internalErrorResponse,
  },
});

const commentRoute = createRoute({
  method: "post",
  path: "/{id}/tickets/{number}/comments",
  operationId: "addTicketComment",
  tags: [TAG],
  summary: "Comment on a ticket",
  security: bearerSecurity,
  request: { params: ticketNumberParam, body: jsonContent(CreateCommentBodySchema, "The comment.") },
  responses: {
    201: jsonContent(TicketCommentResponseSchema, "The comment as saved."),
    ...writeErrorResponses,
  },
});

// ---------------------------------------------------------------------------
// Routes: milestones
// ---------------------------------------------------------------------------

const createMilestoneRoute = createRoute({
  method: "post",
  path: "/{id}/milestones",
  operationId: "createMilestone",
  tags: [TAG],
  summary: "Create a milestone",
  description: "Adds a milestone to the end of the roadmap. Any project member may do this.",
  security: bearerSecurity,
  request: { params: projectIdParam, body: jsonContent(CreateMilestoneBodySchema, "The new milestone.") },
  responses: {
    201: jsonContent(MilestoneResponseSchema, "The milestone as created."),
    ...writeErrorResponses,
  },
});

const updateMilestoneRoute = createRoute({
  method: "patch",
  path: "/{id}/milestones/{milestoneId}",
  operationId: "updateMilestone",
  tags: [TAG],
  summary: "Update a milestone",
  security: bearerSecurity,
  request: {
    params: milestoneIdParam,
    body: jsonContent(UpdateMilestoneBodySchema, "The fields to change."),
  },
  responses: {
    200: jsonContent(MilestoneResponseSchema, "The milestone after the change."),
    ...writeErrorResponses,
  },
});

const deleteMilestoneRoute = createRoute({
  method: "delete",
  path: "/{id}/milestones/{milestoneId}",
  operationId: "deleteMilestone",
  tags: [TAG],
  summary: "Delete a milestone",
  description: "Removes the milestone. Tickets that pointed at it keep everything else.",
  security: bearerSecurity,
  request: { params: milestoneIdParam },
  responses: {
    200: jsonContent(EmptyResponseSchema, "The milestone was deleted."),
    401: unauthorizedResponse,
    403: writeErrorResponses[403],
    404: writeErrorResponses[404],
    500: internalErrorResponse,
  },
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const projects = new OpenAPIHono({ defaultHook: onValidationError });

projects.openapi(listRoute, async (c) => {
  const query = c.req.valid("query");
  const viewer = viewerOf(c);
  const rows = await listProjects(viewer, {
    query: query.q,
    status: query.status,
    mineOnly: query.mine,
    sort: query.sort,
  });
  const ideaNames = await listIdeaNames(
    rows.flatMap((row) => (row.ideaId ? [row.ideaId] : [])),
    viewer,
  );
  return c.json({ data: await toProjects(rows, ideaNames, viewer.clerkUserId) }, 200);
});

projects.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const project = await getProject(id, viewerOf(c));
  if (!project) {
    return notFound(c, "That project");
  }
  return c.json({ data: await projectDetail(c, project) }, 200);
});

projects.openapi(createRoute_, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const body = c.req.valid("json");

  if (body.ideaId) {
    const idea = await getIdea(body.ideaId, { clerkUserId: caller.userId });
    if (!idea || !idea.members.some((member) => member.clerkUserId === caller.userId)) {
      return validationFailed(c, "Only members of an idea can start a project from it.", {
        ideaId: "Pick an idea you belong to, or start without one.",
      });
    }
  }

  const invites = body.invites.filter((invite) => invite.userId !== caller.userId);
  const unknown = await unknownPeople(invites.map((invite) => invite.userId));
  if (unknown.length > 0) {
    return validationFailed(c, "Someone you invited does not have a WeStride account.", {
      invites: `No member has the id ${unknown.join(", ")}.`,
    });
  }

  const created = await createProject({
    name: body.name,
    description: body.description,
    isPublic: body.isPublic,
    ideaId: body.ideaId,
    // Owner is last so a repeated id cannot replace that role.
    members: [
      ...invites.map((invite) => ({ clerkUserId: invite.userId, role: invite.role })),
      { clerkUserId: caller.userId, role: "OWNER" as const },
    ],
  });
  const project = await getProject(created.id, viewerOf(c));
  if (!project) {
    return notFound(c, "The new project");
  }
  return c.json({ data: await projectDetail(c, project) }, 201);
});

projects.openapi(updateRoute, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const access = await membership(id, caller, "OWNER");
  if (!access.ok) {
    return membershipError(c, access);
  }
  const { project } = access;

  const members = body.members
    ? body.members.map((member) => ({ clerkUserId: member.userId, role: member.role }))
    : project.members.map((member) => ({ clerkUserId: member.clerkUserId, role: member.role }));
  if (!members.some((member) => member.role === "OWNER")) {
    return validationFailed(c, "Keep at least one owner.", { members: "Keep at least one owner." });
  }
  const current = new Set(project.members.map((member) => member.clerkUserId));
  const unknown = await unknownPeople(
    members.map((member) => member.clerkUserId).filter((userId) => !current.has(userId)),
  );
  if (unknown.length > 0) {
    return validationFailed(c, "Someone you added does not have a WeStride account.", {
      members: `No member has the id ${unknown.join(", ")}.`,
    });
  }

  await updateProjectDetails(id, {
    name: body.name ?? project.name,
    description: body.description ?? project.description,
    isPublic: body.isPublic ?? project.isPublic,
    status: body.status ?? project.status,
    members,
  });

  const updated = await getProject(id, viewerOf(c));
  if (!updated) {
    // The editor left a private project; it is no longer theirs to read.
    return notFound(c, "That project");
  }
  return c.json({ data: await projectDetail(c, updated) }, 200);
});

projects.openapi(listTicketsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { status } = c.req.valid("query");
  const project = await getProject(id, viewerOf(c));
  if (!project) {
    return notFound(c, "That project");
  }
  const rows = await listTickets(id);
  const filtered = status ? rows.filter((ticket) => ticket.status === status) : rows;
  return c.json({ data: await toTickets(filtered, project.name) }, 200);
});

projects.openapi(getTicketRoute, async (c) => {
  const { id, number } = c.req.valid("param");
  const project = await getProject(id, viewerOf(c));
  if (!project) {
    return notFound(c, "That project");
  }
  const ticket = await getTicket(id, number);
  if (!ticket) {
    return notFound(c, "That ticket");
  }
  const comments = await listTicketComments(ticket.id);
  return c.json({ data: await toTicketDetail(ticket, comments, project.name) }, 200);
});

projects.openapi(createTicketRoute, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const access = await membership(id, caller);
  if (!access.ok) {
    return membershipError(c, access);
  }
  const input = {
    title: body.title,
    description: body.description,
    priority: body.priority,
    milestoneId: body.milestoneId,
    repoId: body.repoId,
    assigneeClerkUserId: body.assigneeUserId,
  };
  const linkProblem = checkTicketLinks(access.project, input);
  if (linkProblem) {
    return validationFailed(c, linkProblem.message, linkProblem.fields);
  }
  const ticket = await createTicket(id, caller.userId, input);
  const people = await resolvePeople([ticket.createdByClerkUserId]);
  return c.json({ data: toTicket(ticket, access.project.name, people) }, 201);
});

projects.openapi(updateTicketRoute, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const { id, number } = c.req.valid("param");
  const body = c.req.valid("json");
  const access = await membership(id, caller);
  if (!access.ok) {
    return membershipError(c, access);
  }
  const existing = await getTicket(id, number);
  if (!existing) {
    return notFound(c, "That ticket");
  }

  const input = {
    title: body.title ?? existing.title,
    description: body.description ?? existing.description,
    priority: body.priority ?? existing.priority,
    milestoneId: body.milestoneId === undefined ? existing.milestoneId : body.milestoneId,
    repoId: body.repoId === undefined ? existing.repoId : body.repoId,
    assigneeClerkUserId:
      body.assigneeUserId === undefined ? existing.assigneeClerkUserId : body.assigneeUserId,
  };
  const linkProblem = checkTicketLinks(access.project, input);
  if (linkProblem) {
    return validationFailed(c, linkProblem.message, linkProblem.fields);
  }

  let ticket = await updateTicket(id, existing.id, input);
  if (ticket && body.status && body.status !== existing.status) {
    try {
      ticket = await moveTicket(id, existing.id, body.status, body.blockedReason ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.startsWith("Say what is blocking")) {
        return validationFailed(c, message, { blockedReason: message });
      }
      throw error;
    }
  }
  if (!ticket) {
    return notFound(c, "That ticket");
  }
  const people = await resolvePeople([ticket.createdByClerkUserId, ticket.assigneeClerkUserId ?? ""]);
  return c.json({ data: toTicket(ticket, access.project.name, people) }, 200);
});

projects.openapi(deleteTicketRoute, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const { id, number } = c.req.valid("param");
  const access = await membership(id, caller);
  if (!access.ok) {
    return membershipError(c, access);
  }
  const ticket = await getTicket(id, number);
  if (!ticket) {
    return notFound(c, "That ticket");
  }
  await deleteTicket(id, ticket.id);
  return c.json({ data: { ok: true as const } }, 200);
});

projects.openapi(commentRoute, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const { id, number } = c.req.valid("param");
  const body = c.req.valid("json");
  const access = await membership(id, caller);
  if (!access.ok) {
    return membershipError(c, access);
  }
  const ticket = await getTicket(id, number);
  if (!ticket) {
    return notFound(c, "That ticket");
  }
  const comment = await addTicketComment({
    ticketId: ticket.id,
    authorClerkUserId: caller.userId,
    body: body.body,
  });
  const people = await resolvePeople([caller.userId]);
  return c.json({ data: toComment(comment, people) }, 201);
});

projects.openapi(createMilestoneRoute, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const access = await membership(id, caller);
  if (!access.ok) {
    return membershipError(c, access);
  }
  const milestone = await createMilestone(id, body);
  return c.json({ data: toMilestone(milestone) }, 201);
});

projects.openapi(updateMilestoneRoute, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const { id, milestoneId } = c.req.valid("param");
  const body = c.req.valid("json");
  const access = await membership(id, caller);
  if (!access.ok) {
    return membershipError(c, access);
  }
  const existing = access.project.milestones.find((milestone) => milestone.id === milestoneId);
  if (!existing) {
    return notFound(c, "That milestone");
  }
  const milestone = await updateMilestone(id, milestoneId, {
    title: body.title ?? existing.title,
    description: body.description ?? existing.description,
    status: body.status ?? existing.status,
    targetDate: body.targetDate === undefined ? existing.targetDate : body.targetDate,
  });
  if (!milestone) {
    return notFound(c, "That milestone");
  }
  return c.json({ data: toMilestone(milestone) }, 200);
});

projects.openapi(deleteMilestoneRoute, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const { id, milestoneId } = c.req.valid("param");
  const access = await membership(id, caller);
  if (!access.ok) {
    return membershipError(c, access);
  }
  const removed = await deleteMilestone(id, milestoneId);
  if (!removed) {
    return notFound(c, "That milestone");
  }
  return c.json({ data: { ok: true as const } }, 200);
});
