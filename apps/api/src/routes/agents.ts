import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import {
  addAgentLog,
  createAgent,
  createAgentTicket,
  deleteAgent,
  deleteAgentTicket,
  describeSchedule,
  getActiveJobForTicket,
  getAgent,
  getAgentJob,
  getAgentRole,
  getAgentTicket,
  listAgentJobs,
  listAgentJobsForTicket,
  listAgentLinkOptions,
  listAgentLog,
  listAgentTickets,
  listAgents,
  moveAgentTicket,
  setAgentStatus,
  sumAgentUsage,
  sumAgentUsageByDay,
  sumAgentUsageByModel,
  sumAgentUsageByTrigger,
  updateAgentDetails,
  updateAgentSchedule,
  updateAgentTicket,
  type AgentRole,
  type AgentWithDetails,
} from "@westride/db/agents";
import type { Context } from "hono";
import { signInRequired, viewerOf, type Caller } from "../auth";
import { conflict, forbidden, notFound, onValidationError, validationFailed } from "../errors";
import { resolvePeople } from "../people";
import {
  EmptyResponseSchema,
  bearerSecurity,
  conflictResponse,
  internalErrorResponse,
  jsonContent,
  readErrorResponses,
  unauthorizedResponse,
  writeErrorResponses,
} from "../schemas/common";
import {
  AgentJobResponseSchema,
  AgentResponseSchema,
  AgentTicketDetailResponseSchema,
  AgentTicketResponseSchema,
  AgentUsageResponseSchema,
  CreateAgentBodySchema,
  CreateAgentTicketBodySchema,
  ListAgentJobsResponseSchema,
  ListAgentLogResponseSchema,
  ListAgentTicketsQuerySchema,
  ListAgentTicketsResponseSchema,
  ListAgentsQuerySchema,
  ListAgentsResponseSchema,
  ListLimitQuerySchema,
  UpdateAgentBodySchema,
  UpdateAgentTicketBodySchema,
  agentIdParam,
  agentJobIdParam,
  agentTicketNumberParam,
} from "../schemas/agents";
import {
  toAgentDetail,
  toAgentJob,
  toAgentJobs,
  toAgentLog,
  toAgentTicket,
  toAgentTicketDetail,
  toAgentTickets,
  toAgents,
} from "../serialize/agents";

const TAG = "Agents";

const TICKET_STATUS_LABELS = {
  BACKLOG: "Backlog",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  BLOCKED: "Roadblocked",
  DONE: "Done",
} as const;

type Access =
  | { ok: true; agent: AgentWithDetails; role: AgentRole }
  | { ok: false; reason: "not_found" | "not_collaborator" | "not_owner" };

/** Loads an agent the caller may change, with their role. */
async function access(agentId: string, caller: Caller, minimum: AgentRole): Promise<Access> {
  const agent = await getAgent(agentId, { clerkUserId: caller.userId });
  if (!agent) {
    return { ok: false, reason: "not_found" };
  }
  const role = await getAgentRole(agent, caller.userId);
  if (!role) {
    return { ok: false, reason: "not_collaborator" };
  }
  if (minimum === "OWNER" && role !== "OWNER") {
    return { ok: false, reason: "not_owner" };
  }
  return { ok: true, agent, role };
}

function accessError(c: Context, denied: Extract<Access, { ok: false }>) {
  switch (denied.reason) {
    case "not_found":
      return notFound(c, "That agent");
    case "not_collaborator":
      return forbidden(c, "Only the agent's owner and their team can change it.");
    case "not_owner":
      return forbidden(c, "Only the agent's owner can do that.");
  }
}

/** The links an agent may carry: only ideas and projects the member belongs to. */
async function checkLinks(
  userId: string,
  ideaId: string | null,
  projectId: string | null,
): Promise<{ message: string; fields: Record<string, string> } | null> {
  if (!ideaId && !projectId) {
    return null;
  }
  const options = await listAgentLinkOptions(userId);
  if (ideaId && !options.ideas.some((idea) => idea.id === ideaId)) {
    return { message: "Pick an idea you are a member of.", fields: { ideaId: "Pick an idea you are a member of." } };
  }
  if (projectId && !options.projects.some((project) => project.id === projectId)) {
    return {
      message: "Pick a project you are a member of.",
      fields: { projectId: "Pick a project you are a member of." },
    };
  }
  return null;
}

async function agentDetail(c: Context, agent: AgentWithDetails) {
  const viewer = viewerOf(c);
  const role = await getAgentRole(agent, viewer.clerkUserId);
  return toAgentDetail(agent, role);
}

// ---------------------------------------------------------------------------
// Routes: agents
// ---------------------------------------------------------------------------

const listRoute = createRoute({
  method: "get",
  path: "/",
  operationId: "listAgents",
  tags: [TAG],
  summary: "List agents",
  description:
    "Agents the caller may see: every public agent, plus the caller's own agents and agents linked to their projects and ideas when a token is sent. In lists `viewerRole` only reports OWNER; fetch one agent to learn whether the caller is a collaborator.",
  security: bearerSecurity,
  request: { query: ListAgentsQuerySchema },
  responses: {
    200: jsonContent(ListAgentsResponseSchema, "Matching agents."),
    401: unauthorizedResponse,
    500: internalErrorResponse,
  },
});

const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  operationId: "getAgent",
  tags: [TAG],
  summary: "Get an agent",
  description: "One agent with its brief, schedule, repository, ticket counts, usage, and the caller's role.",
  security: bearerSecurity,
  request: { params: agentIdParam },
  responses: {
    200: jsonContent(AgentResponseSchema, "The agent."),
    ...readErrorResponses,
  },
});

const createRoute_ = createRoute({
  method: "post",
  path: "/",
  operationId: "createAgent",
  tags: [TAG],
  summary: "Create an agent",
  description:
    "Creates an agent owned by the caller. Link it to an idea or project you belong to so their members can work its tickets. Scheduled jobs run on the owner's Muse key.",
  security: bearerSecurity,
  request: { body: jsonContent(CreateAgentBodySchema, "The new agent.") },
  responses: {
    201: jsonContent(AgentResponseSchema, "The agent as created."),
    ...writeErrorResponses,
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/{id}",
  operationId: "updateAgent",
  tags: [TAG],
  summary: "Update an agent",
  description:
    "Changes an agent's details, links, model, schedule, or status. Only the owner may edit. Omitted fields keep their value.",
  security: bearerSecurity,
  request: { params: agentIdParam, body: jsonContent(UpdateAgentBodySchema, "The fields to change.") },
  responses: {
    200: jsonContent(AgentResponseSchema, "The agent after the change."),
    ...writeErrorResponses,
  },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  operationId: "deleteAgent",
  tags: [TAG],
  summary: "Delete an agent",
  description: "Removes the agent, its tickets, jobs, and log. Fails while a job is queued or running.",
  security: bearerSecurity,
  request: { params: agentIdParam },
  responses: {
    200: jsonContent(EmptyResponseSchema, "The agent was deleted."),
    401: unauthorizedResponse,
    403: writeErrorResponses[403],
    404: writeErrorResponses[404],
    409: conflictResponse,
    500: internalErrorResponse,
  },
});

// ---------------------------------------------------------------------------
// Routes: tickets
// ---------------------------------------------------------------------------

const listTicketsRoute = createRoute({
  method: "get",
  path: "/{id}/tickets",
  operationId: "listAgentTickets",
  tags: [TAG],
  summary: "List an agent's tickets",
  description: "The agent's queue, in the order it will be worked within each status.",
  security: bearerSecurity,
  request: { params: agentIdParam, query: ListAgentTicketsQuerySchema },
  responses: {
    200: jsonContent(ListAgentTicketsResponseSchema, "The tickets."),
    ...readErrorResponses,
  },
});

const getTicketRoute = createRoute({
  method: "get",
  path: "/{id}/tickets/{number}",
  operationId: "getAgentTicket",
  tags: [TAG],
  summary: "Get an agent ticket",
  description: "One ticket with the jobs that worked it.",
  security: bearerSecurity,
  request: { params: agentTicketNumberParam },
  responses: {
    200: jsonContent(AgentTicketDetailResponseSchema, "The ticket."),
    ...readErrorResponses,
  },
});

const createTicketRoute = createRoute({
  method: "post",
  path: "/{id}/tickets",
  operationId: "createAgentTicket",
  tags: [TAG],
  summary: "Queue a ticket for an agent",
  description:
    "Adds a ticket to the agent's backlog. The owner and collaborators may queue tickets. Starting a job is done from the web app.",
  security: bearerSecurity,
  request: { params: agentIdParam, body: jsonContent(CreateAgentTicketBodySchema, "The new ticket.") },
  responses: {
    201: jsonContent(AgentTicketResponseSchema, "The ticket as created."),
    ...writeErrorResponses,
  },
});

const updateTicketRoute = createRoute({
  method: "patch",
  path: "/{id}/tickets/{number}",
  operationId: "updateAgentTicket",
  tags: [TAG],
  summary: "Update or move an agent ticket",
  description: "Edits a ticket and, when `status` is sent, moves it. A ticket with a running job cannot be moved.",
  security: bearerSecurity,
  request: {
    params: agentTicketNumberParam,
    body: jsonContent(UpdateAgentTicketBodySchema, "The fields to change."),
  },
  responses: {
    200: jsonContent(AgentTicketResponseSchema, "The ticket after the change."),
    ...writeErrorResponses,
    409: conflictResponse,
  },
});

const deleteTicketRoute = createRoute({
  method: "delete",
  path: "/{id}/tickets/{number}",
  operationId: "deleteAgentTicket",
  tags: [TAG],
  summary: "Delete an agent ticket",
  security: bearerSecurity,
  request: { params: agentTicketNumberParam },
  responses: {
    200: jsonContent(EmptyResponseSchema, "The ticket was deleted."),
    401: unauthorizedResponse,
    403: writeErrorResponses[403],
    404: writeErrorResponses[404],
    409: conflictResponse,
    500: internalErrorResponse,
  },
});

// ---------------------------------------------------------------------------
// Routes: jobs, log, usage
// ---------------------------------------------------------------------------

const listJobsRoute = createRoute({
  method: "get",
  path: "/{id}/jobs",
  operationId: "listAgentJobs",
  tags: [TAG],
  summary: "List an agent's jobs",
  description: "Jobs newest first, with status, outcome, and usage.",
  security: bearerSecurity,
  request: { params: agentIdParam, query: ListLimitQuerySchema },
  responses: {
    200: jsonContent(ListAgentJobsResponseSchema, "The jobs."),
    ...readErrorResponses,
  },
});

const getJobRoute = createRoute({
  method: "get",
  path: "/{id}/jobs/{jobId}",
  operationId: "getAgentJob",
  tags: [TAG],
  summary: "Get a job",
  security: bearerSecurity,
  request: { params: agentJobIdParam },
  responses: {
    200: jsonContent(AgentJobResponseSchema, "The job."),
    ...readErrorResponses,
  },
});

const logRoute = createRoute({
  method: "get",
  path: "/{id}/log",
  operationId: "listAgentLog",
  tags: [TAG],
  summary: "Read an agent's log",
  description: "What the agent and its team did, newest first.",
  security: bearerSecurity,
  request: { params: agentIdParam, query: ListLimitQuerySchema },
  responses: {
    200: jsonContent(ListAgentLogResponseSchema, "Log entries."),
    ...readErrorResponses,
  },
});

const usageRoute = createRoute({
  method: "get",
  path: "/{id}/usage",
  operationId: "getAgentUsage",
  tags: [TAG],
  summary: "Get an agent's usage",
  description: "Token and cost totals, broken down by model, trigger, and day.",
  security: bearerSecurity,
  request: { params: agentIdParam },
  responses: {
    200: jsonContent(AgentUsageResponseSchema, "Usage."),
    ...readErrorResponses,
  },
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const agents = new OpenAPIHono({ defaultHook: onValidationError });

agents.openapi(listRoute, async (c) => {
  const query = c.req.valid("query");
  const viewer = viewerOf(c);
  const rows = await listAgents(viewer, {
    query: query.q,
    status: query.status,
    mineOnly: query.mine,
    sort: query.sort,
  });
  return c.json({ data: await toAgents(rows, viewer.clerkUserId) }, 200);
});

agents.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const agent = await getAgent(id, viewerOf(c));
  if (!agent) {
    return notFound(c, "That agent");
  }
  return c.json({ data: await agentDetail(c, agent) }, 200);
});

agents.openapi(createRoute_, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const body = c.req.valid("json");
  const linkProblem = await checkLinks(caller.userId, body.ideaId, body.projectId);
  if (linkProblem) {
    return validationFailed(c, linkProblem.message, linkProblem.fields);
  }

  const { id } = await createAgent(caller.userId, {
    name: body.name,
    description: body.description,
    instructions: body.instructions,
    isPublic: body.isPublic,
    ideaId: body.ideaId,
    projectId: body.projectId,
    model: body.model,
    maxSteps: body.maxSteps,
    allowSponsorTokens: body.allowSponsorTokens,
    allowVolunteerCompute: body.allowVolunteerCompute,
    volunteerLocalModel: body.volunteerLocalModel,
    repo: null,
    schedule: body.schedule,
    scheduleHourUtc: body.scheduleHourUtc,
    scheduleWeekday: body.scheduleWeekday,
    standingTask: body.standingTask,
  });
  await addAgentLog(id, { kind: "agent", message: `Created ${body.name}.`, actorClerkUserId: caller.userId });
  if (body.schedule !== "NONE") {
    await addAgentLog(id, {
      kind: "schedule",
      message: `Schedule set: ${describeSchedule(body)}.`,
      actorClerkUserId: caller.userId,
    });
  }
  if (body.firstTicket) {
    const ticket = await createAgentTicket(id, {
      title: body.firstTicket,
      description: "",
      priority: "MEDIUM",
      createdByClerkUserId: caller.userId,
    });
    await addAgentLog(id, {
      kind: "ticket",
      message: `Queued ticket #${ticket.number}: ${ticket.title}.`,
      ticketId: ticket.id,
      actorClerkUserId: caller.userId,
    });
  }

  const agent = await getAgent(id, viewerOf(c));
  if (!agent) {
    return notFound(c, "The new agent");
  }
  return c.json({ data: await toAgentDetail(agent, "OWNER") }, 201);
});

agents.openapi(updateRoute, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const found = await access(id, caller, "OWNER");
  if (!found.ok) {
    return accessError(c, found);
  }
  const { agent } = found;

  const ideaId = body.ideaId === undefined ? agent.ideaId : body.ideaId;
  const projectId = body.projectId === undefined ? agent.projectId : body.projectId;
  const linkProblem = await checkLinks(caller.userId, ideaId, projectId);
  if (linkProblem) {
    return validationFailed(c, linkProblem.message, linkProblem.fields);
  }

  const detailKeys = [
    "name",
    "description",
    "instructions",
    "isPublic",
    "ideaId",
    "projectId",
    "model",
    "maxSteps",
    "allowSponsorTokens",
    "allowVolunteerCompute",
    "volunteerLocalModel",
  ] as const;
  const scheduleKeys = ["schedule", "scheduleHourUtc", "scheduleWeekday", "standingTask"] as const;
  const touchesDetails = detailKeys.some((key) => body[key] !== undefined);
  const touchesSchedule = scheduleKeys.some((key) => body[key] !== undefined);

  if (touchesDetails) {
    await updateAgentDetails(id, {
      name: body.name ?? agent.name,
      description: body.description ?? agent.description,
      instructions: body.instructions ?? agent.instructions,
      isPublic: body.isPublic ?? agent.isPublic,
      ideaId,
      projectId,
      model: body.model ?? agent.model,
      maxSteps: body.maxSteps ?? agent.maxSteps,
      allowSponsorTokens: body.allowSponsorTokens ?? agent.allowSponsorTokens,
      allowVolunteerCompute: body.allowVolunteerCompute ?? agent.allowVolunteerCompute,
      volunteerLocalModel:
        body.volunteerLocalModel === undefined ? agent.volunteerLocalModel : body.volunteerLocalModel,
    });
    await addAgentLog(id, {
      kind: "settings",
      message: "Updated the agent's details.",
      actorClerkUserId: caller.userId,
    });
  }

  if (touchesSchedule) {
    const spec = {
      schedule: body.schedule ?? agent.schedule,
      scheduleHourUtc: body.scheduleHourUtc === undefined ? agent.scheduleHourUtc : body.scheduleHourUtc,
      scheduleWeekday: body.scheduleWeekday === undefined ? agent.scheduleWeekday : body.scheduleWeekday,
      standingTask: body.standingTask ?? agent.standingTask,
    };
    if ((spec.schedule === "DAILY" || spec.schedule === "WEEKLY") && spec.scheduleHourUtc === null) {
      return validationFailed(c, "Pick an hour (UTC).", { scheduleHourUtc: "Pick an hour (UTC)." });
    }
    if (spec.schedule === "WEEKLY" && spec.scheduleWeekday === null) {
      return validationFailed(c, "Pick a day of the week.", { scheduleWeekday: "Pick a day of the week." });
    }
    await updateAgentSchedule(id, body.status ?? agent.status, spec);
    await addAgentLog(id, {
      kind: "schedule",
      message: spec.schedule === "NONE" ? "Schedule cleared." : `Schedule set: ${describeSchedule(spec)}.`,
      actorClerkUserId: caller.userId,
    });
  }

  if (body.status && body.status !== agent.status) {
    const current = touchesSchedule ? await getAgent(id, viewerOf(c)) : agent;
    if (current) {
      await setAgentStatus(current, body.status);
      const verb = body.status === "ACTIVE" ? "Resumed" : body.status === "PAUSED" ? "Paused" : "Archived";
      await addAgentLog(id, { kind: "agent", message: `${verb} the agent.`, actorClerkUserId: caller.userId });
    }
  }

  const updated = await getAgent(id, viewerOf(c));
  if (!updated) {
    return notFound(c, "That agent");
  }
  return c.json({ data: await toAgentDetail(updated, "OWNER") }, 200);
});

agents.openapi(deleteRoute, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const { id } = c.req.valid("param");
  const found = await access(id, caller, "OWNER");
  if (!found.ok) {
    return accessError(c, found);
  }
  if (found.agent.activeJobs > 0) {
    return conflict(c, "Stop the running job before deleting the agent.");
  }
  await deleteAgent(id);
  return c.json({ data: { ok: true as const } }, 200);
});

agents.openapi(listTicketsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { status } = c.req.valid("query");
  const agent = await getAgent(id, viewerOf(c));
  if (!agent) {
    return notFound(c, "That agent");
  }
  const rows = await listAgentTickets(id);
  const filtered = status ? rows.filter((ticket) => ticket.status === status) : rows;
  return c.json({ data: await toAgentTickets(filtered, agent.name) }, 200);
});

agents.openapi(getTicketRoute, async (c) => {
  const { id, number } = c.req.valid("param");
  const agent = await getAgent(id, viewerOf(c));
  if (!agent) {
    return notFound(c, "That agent");
  }
  const ticket = await getAgentTicket(id, number);
  if (!ticket) {
    return notFound(c, "That ticket");
  }
  const jobs = await listAgentJobsForTicket(ticket.id);
  return c.json({ data: await toAgentTicketDetail(ticket, jobs, agent.name) }, 200);
});

agents.openapi(createTicketRoute, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const found = await access(id, caller, "COLLABORATOR");
  if (!found.ok) {
    return accessError(c, found);
  }
  const ticket = await createAgentTicket(id, { ...body, createdByClerkUserId: caller.userId });
  await addAgentLog(id, {
    kind: "ticket",
    message: `Queued ticket #${ticket.number}: ${ticket.title}.`,
    ticketId: ticket.id,
    actorClerkUserId: caller.userId,
  });
  const people = await resolvePeople([caller.userId]);
  return c.json({ data: toAgentTicket(ticket, found.agent.name, people) }, 201);
});

agents.openapi(updateTicketRoute, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const { id, number } = c.req.valid("param");
  const body = c.req.valid("json");
  const found = await access(id, caller, "COLLABORATOR");
  if (!found.ok) {
    return accessError(c, found);
  }
  const existing = await getAgentTicket(id, number);
  if (!existing) {
    return notFound(c, "That ticket");
  }

  const editsFields = body.title !== undefined || body.description !== undefined || body.priority !== undefined;
  const moves = body.status !== undefined && body.status !== existing.status;
  if (moves && body.status !== "IN_PROGRESS" && (await getActiveJobForTicket(existing.id))) {
    return conflict(c, "Stop the running job before moving this ticket.");
  }

  let ticket = existing;
  if (editsFields) {
    const updated = await updateAgentTicket(id, existing.id, {
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      priority: body.priority ?? existing.priority,
    });
    if (!updated) {
      return notFound(c, "That ticket");
    }
    ticket = updated;
    await addAgentLog(id, {
      kind: "ticket",
      message: `Edited ticket #${ticket.number}: ${ticket.title}.`,
      ticketId: ticket.id,
      actorClerkUserId: caller.userId,
    });
  }
  if (moves && body.status) {
    const movedTo = await moveAgentTicket(
      id,
      existing.id,
      body.status,
      body.status === "BLOCKED" ? (body.blockedReason ?? null) : null,
    );
    if (!movedTo) {
      return notFound(c, "That ticket");
    }
    ticket = movedTo;
    await addAgentLog(id, {
      kind: "ticket",
      message: `Moved ticket #${ticket.number} to ${TICKET_STATUS_LABELS[ticket.status]}.`,
      ticketId: ticket.id,
      actorClerkUserId: caller.userId,
    });
  }

  const people = await resolvePeople(ticket.createdByClerkUserId ? [ticket.createdByClerkUserId] : []);
  return c.json({ data: toAgentTicket(ticket, found.agent.name, people) }, 200);
});

agents.openapi(deleteTicketRoute, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const { id, number } = c.req.valid("param");
  const found = await access(id, caller, "COLLABORATOR");
  if (!found.ok) {
    return accessError(c, found);
  }
  const existing = await getAgentTicket(id, number);
  if (!existing) {
    return notFound(c, "That ticket");
  }
  if (await getActiveJobForTicket(existing.id)) {
    return conflict(c, "Stop the running job before deleting this ticket.");
  }
  await deleteAgentTicket(id, existing.id);
  await addAgentLog(id, {
    kind: "ticket",
    message: `Deleted ticket #${existing.number}: ${existing.title}.`,
    actorClerkUserId: caller.userId,
  });
  return c.json({ data: { ok: true as const } }, 200);
});

agents.openapi(listJobsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { limit } = c.req.valid("query");
  const agent = await getAgent(id, viewerOf(c));
  if (!agent) {
    return notFound(c, "That agent");
  }
  const jobs = await listAgentJobs(id, limit);
  return c.json({ data: await toAgentJobs(jobs) }, 200);
});

agents.openapi(getJobRoute, async (c) => {
  const { id, jobId } = c.req.valid("param");
  const agent = await getAgent(id, viewerOf(c));
  if (!agent) {
    return notFound(c, "That agent");
  }
  const job = await getAgentJob(jobId);
  if (!job || job.agentId !== id) {
    return notFound(c, "That job");
  }
  const people = await resolvePeople(job.startedByClerkUserId ? [job.startedByClerkUserId] : []);
  return c.json({ data: toAgentJob(job, people) }, 200);
});

agents.openapi(logRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { limit } = c.req.valid("query");
  const agent = await getAgent(id, viewerOf(c));
  if (!agent) {
    return notFound(c, "That agent");
  }
  const entries = await listAgentLog(id, limit);
  return c.json({ data: await toAgentLog(entries) }, 200);
});

agents.openapi(usageRoute, async (c) => {
  const { id } = c.req.valid("param");
  const agent = await getAgent(id, viewerOf(c));
  if (!agent) {
    return notFound(c, "That agent");
  }
  const [totals, byModel, byTrigger, byDay] = await Promise.all([
    sumAgentUsage(id),
    sumAgentUsageByModel(id),
    sumAgentUsageByTrigger(id),
    sumAgentUsageByDay(id),
  ]);
  return c.json({ data: { totals, byModel, byTrigger, byDay } }, 200);
});
