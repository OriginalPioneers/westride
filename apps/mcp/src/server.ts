import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { WestrideApiError, type Me, type WestrideApi } from "@westride/api-client";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Every tool is a thin call into the WeStride API with the caller's token, so
// the API's visibility and permission rules apply unchanged. Descriptions are
// written for the assistant reading them: what the thing is, when to use it,
// and what it needs.
// ---------------------------------------------------------------------------

const READ = { readOnlyHint: true, idempotentHint: true, openWorldHint: false } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false } as const;

const uuid = z.string().uuid();
const ticketStatus = z.enum(["BACKLOG", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE"]);
const ticketPriority = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const sort = z
  .enum(["updated", "newest", "oldest", "name-asc", "name-desc"])
  .optional()
  .describe("Sort order. Defaults to most recently updated first.");
const userId = z.string().describe("A member id, e.g. user_2x9F… Find your own with whoami.");

function ok(data: unknown, text?: string): CallToolResult {
  return {
    content: [{ type: "text", text: text ?? JSON.stringify(data, null, 2) }],
    structuredContent: typeof data === "object" && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : { data },
  };
}

function failed(error: unknown, fallback: string): CallToolResult {
  if (error instanceof WestrideApiError) {
    const fields = error.fields
      ? "\n" + Object.entries(error.fields).map(([key, message]) => `- ${key}: ${message}`).join("\n")
      : "";
    return { isError: true, content: [{ type: "text", text: `${error.message}${fields}` }] };
  }
  console.error(error);
  return { isError: true, content: [{ type: "text", text: fallback }] };
}

/** Drops undefined keys so a partial update only sends what the assistant set. */
function compact<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}

export function createMcpServer(api: WestrideApi, me: Me): McpServer {
  const server = new McpServer(
    { name: "westride", version: "1.0.0" },
    {
      instructions: [
        `This server is connected to WeStride as ${me.name} (member id ${me.id}).`,
        "WeStride is where people turn ideas into projects and put agents to work on them. Ideas hold the pitch and team; projects build ideas with repositories, milestones, and a ticket board; agents are Muse-powered workers with their own ticket queue, schedule, jobs, and log; the Academy has learning tracks.",
        "Reads return what this member could see on the website; writes act as them with the same permissions. Private items they cannot see read as not found.",
        "Before creating or deleting anything, confirm the details with the member. Ids are UUIDs; tickets are addressed by their number within a project or agent.",
      ].join("\n\n"),
    },
  );

  const run = (fallback: string, work: () => Promise<CallToolResult>) => async () => {
    try {
      return await work();
    } catch (error) {
      return failed(error, fallback);
    }
  };

  // ---------------------------------------------------------------------------
  // Me
  // ---------------------------------------------------------------------------

  server.registerTool(
    "whoami",
    {
      title: "Who am I",
      description:
        "The WeStride member this session is signed in as: their id, name, and how the session was authenticated. Use the id when a tool asks for your own member id.",
      annotations: READ,
    },
    run("Could not read the signed-in member.", async () => ok({ me: await api.getMe() })),
  );

  // ---------------------------------------------------------------------------
  // Ideas
  // ---------------------------------------------------------------------------

  server.registerTool(
    "list_ideas",
    {
      title: "List ideas",
      description:
        "Find ideas on WeStride. Returns every public idea plus private ideas the member is on the team of. Filter by free text, type, category slug, country, collection (mine, following, featured), or the kind of support an idea wants.",
      inputSchema: {
        q: z.string().optional().describe("Matches the name or description."),
        type: z.enum(["BUSINESS", "NON_PROFIT", "GAME", "OPEN_SOURCE"]).optional(),
        category: z.string().optional().describe("A category slug from list_idea_categories."),
        country: z.string().length(2).optional().describe("ISO 3166-1 alpha-2 country code."),
        view: z.enum(["mine", "following", "featured"]).optional().describe("mine = ideas the member is on; following = ideas they follow."),
        wants: z.enum(["tokens", "compute", "capital"]).optional().describe("Only ideas asking for this kind of support."),
        sort,
      },
      annotations: READ,
    },
    async (input) => {
      try {
        return ok({ ideas: await api.listIdeas(compact(input)) });
      } catch (error) {
        return failed(error, "Could not list ideas.");
      }
    },
  );

  server.registerTool(
    "list_idea_categories",
    {
      title: "List idea categories",
      description: "Every category an idea can carry, with the slug to filter list_ideas by.",
      annotations: READ,
    },
    run("Could not list categories.", async () => ok({ categories: await api.listCategories() })),
  );

  server.registerTool(
    "get_idea",
    {
      title: "Get an idea",
      description:
        "One idea in full: pitch, team with roles, categories, countries, repository, prototype, support wanted, follower count, plus the projects and agents linked to it that the member may see.",
      inputSchema: { ideaId: uuid },
      annotations: READ,
    },
    async ({ ideaId }) => {
      try {
        return ok({ idea: await api.getIdea(ideaId) });
      } catch (error) {
        return failed(error, "Could not load that idea.");
      }
    },
  );

  server.registerTool(
    "create_idea",
    {
      title: "Create an idea",
      description:
        "Start a new idea with the member as founder. Give it a clear name, a Markdown description, one to six categories (new category names are allowed), and say whether it is public. Invite teammates by member id; they must already have WeStride accounts. Confirm the details with the member before calling this.",
      inputSchema: {
        name: z.string().min(1).max(120),
        description: z.string().min(1).describe("Markdown. What the idea is and why it matters."),
        type: z.enum(["BUSINESS", "NON_PROFIT", "GAME", "OPEN_SOURCE"]),
        categories: z.array(z.string()).min(1).max(6).describe("Category names, e.g. [\"AI\", \"Education\"]."),
        isPublic: z.boolean().describe("Public ideas are visible to everyone; private ones only to the team."),
        invites: z
          .array(z.object({ userId, role: z.enum(["FOUNDER", "MEMBER"]) }))
          .optional()
          .describe("Teammates to add besides the member, who becomes a founder."),
      },
      annotations: WRITE,
    },
    async (input) => {
      try {
        const idea = await api.createIdea(input);
        return ok({ idea }, `Created idea "${idea.name}" (${idea.id}). View it at https://westride.org/ideas/${idea.id}\n\n${JSON.stringify(idea, null, 2)}`);
      } catch (error) {
        return failed(error, "Could not create the idea.");
      }
    },
  );

  server.registerTool(
    "update_idea",
    {
      title: "Update an idea",
      description:
        "Change an idea's name, description, categories, prototype link, or team. Only a founder may edit. Send just the fields to change; `members` replaces the whole team and must keep a founder. Setting a prototype needs an HTTPS link, instructions, and prototypeTested=true.",
      inputSchema: {
        ideaId: uuid,
        name: z.string().min(1).max(120).optional(),
        description: z.string().min(1).optional().describe("Markdown."),
        categories: z.array(z.string()).min(1).max(6).optional(),
        prototypeUrl: z.string().url().nullable().optional().describe("HTTPS link people can try, or null to remove it."),
        prototypeInstructions: z.string().nullable().optional().describe("What to try in the prototype."),
        prototypeTested: z.boolean().optional().describe("Confirm the prototype link was opened and works."),
        members: z
          .array(z.object({ userId, role: z.enum(["FOUNDER", "MEMBER"]) }))
          .optional()
          .describe("The full team after the change."),
      },
      annotations: WRITE,
    },
    async ({ ideaId, ...body }) => {
      try {
        return ok({ idea: await api.updateIdea(ideaId, compact(body)) });
      } catch (error) {
        return failed(error, "Could not update the idea.");
      }
    },
  );

  server.registerTool(
    "follow_idea",
    {
      title: "Follow or unfollow an idea",
      description: "Follow an idea so it shows up in the member's `following` collection, or stop following it.",
      inputSchema: { ideaId: uuid, follow: z.boolean().default(true).describe("false to unfollow.") },
      annotations: { ...WRITE, idempotentHint: true },
    },
    async ({ ideaId, follow }) => {
      try {
        const state = follow ? await api.followIdea(ideaId) : await api.unfollowIdea(ideaId);
        return ok(state, follow ? "Now following this idea." : "No longer following this idea.");
      } catch (error) {
        return failed(error, "Could not change the follow state.");
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------------

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description:
        "Find projects: the teams building ideas, each with a status, repositories, milestones, and a ticket board. Returns public projects plus private ones the member belongs to.",
      inputSchema: {
        q: z.string().optional().describe("Matches the name or description."),
        status: z.enum(["PLANNING", "BUILDING", "LAUNCHED", "PAUSED"]).optional(),
        mine: z.boolean().optional().describe("Only projects the member belongs to."),
        sort,
      },
      annotations: READ,
    },
    async (input) => {
      try {
        return ok({ projects: await api.listProjects(compact(input)) });
      } catch (error) {
        return failed(error, "Could not list projects.");
      }
    },
  );

  server.registerTool(
    "get_project",
    {
      title: "Get a project",
      description:
        "One project in full: team with roles, linked repositories (with ids for tickets), milestones (with ids), ticket counts per status, the idea it builds, and the agents attached to it. Call this before creating tickets so you can reference milestone and repository ids.",
      inputSchema: { projectId: uuid },
      annotations: READ,
    },
    async ({ projectId }) => {
      try {
        return ok({ project: await api.getProject(projectId) });
      } catch (error) {
        return failed(error, "Could not load that project.");
      }
    },
  );

  server.registerTool(
    "create_project",
    {
      title: "Create a project",
      description:
        "Start a project with the member as owner. Optionally link it to an idea the member belongs to (its id) and invite teammates by member id. GitHub repositories are linked later on the website. Confirm the details with the member before calling this.",
      inputSchema: {
        name: z.string().min(1).max(120),
        description: z.string().min(1).describe("Markdown. What is being built."),
        isPublic: z.boolean(),
        ideaId: uuid.nullable().optional().describe("The idea this project builds, if any."),
        invites: z.array(z.object({ userId, role: z.enum(["OWNER", "MEMBER"]) })).optional(),
      },
      annotations: WRITE,
    },
    async (input) => {
      try {
        const project = await api.createProject(compact(input));
        return ok({ project }, `Created project "${project.name}" (${project.id}). View it at https://westride.org/build/${project.id}\n\n${JSON.stringify(project, null, 2)}`);
      } catch (error) {
        return failed(error, "Could not create the project.");
      }
    },
  );

  server.registerTool(
    "update_project",
    {
      title: "Update a project",
      description:
        "Change a project's name, description, visibility, status, or team. Only an owner may edit. Send just the fields to change; `members` replaces the whole team and must keep an owner.",
      inputSchema: {
        projectId: uuid,
        name: z.string().min(1).max(120).optional(),
        description: z.string().min(1).optional().describe("Markdown."),
        isPublic: z.boolean().optional(),
        status: z.enum(["PLANNING", "BUILDING", "LAUNCHED", "PAUSED"]).optional(),
        members: z.array(z.object({ userId, role: z.enum(["OWNER", "MEMBER"]) })).optional(),
      },
      annotations: WRITE,
    },
    async ({ projectId, ...body }) => {
      try {
        return ok({ project: await api.updateProject(projectId, compact(body)) });
      } catch (error) {
        return failed(error, "Could not update the project.");
      }
    },
  );

  server.registerTool(
    "list_tickets",
    {
      title: "List a project's tickets",
      description:
        "The project's ticket board in order, optionally one status column. Each ticket has a number (use it with get_ticket and update_ticket), key, status, priority, assignee, and milestone.",
      inputSchema: { projectId: uuid, status: ticketStatus.optional() },
      annotations: READ,
    },
    async ({ projectId, status }) => {
      try {
        return ok({ tickets: await api.listTickets(projectId, compact({ status })) });
      } catch (error) {
        return failed(error, "Could not list tickets.");
      }
    },
  );

  server.registerTool(
    "get_ticket",
    {
      title: "Get a ticket",
      description: "One project ticket by number, with its full description and comments.",
      inputSchema: { projectId: uuid, number: z.number().int().min(1).describe("The ticket number within the project.") },
      annotations: READ,
    },
    async ({ projectId, number }) => {
      try {
        return ok({ ticket: await api.getTicket(projectId, number) });
      } catch (error) {
        return failed(error, "Could not load that ticket.");
      }
    },
  );

  server.registerTool(
    "create_ticket",
    {
      title: "Create a ticket",
      description:
        "Add a ticket to a project's backlog. Any project member may do this. Write the description as what done looks like, since agents work from it. Milestone, repository, and assignee ids come from get_project.",
      inputSchema: {
        projectId: uuid,
        title: z.string().min(1).max(160),
        description: z.string().optional().describe("Markdown. What done looks like."),
        priority: ticketPriority.optional().describe("Defaults to MEDIUM."),
        milestoneId: uuid.nullable().optional(),
        repoId: uuid.nullable().optional().describe("One of the project's repository link ids. Omit for the primary."),
        assigneeUserId: userId.nullable().optional().describe("A project member's id."),
      },
      annotations: WRITE,
    },
    async ({ projectId, ...body }) => {
      try {
        const ticket = await api.createTicket(projectId, compact(body));
        return ok({ ticket }, `Created ${ticket.key}: ${ticket.title}\n\n${JSON.stringify(ticket, null, 2)}`);
      } catch (error) {
        return failed(error, "Could not create the ticket.");
      }
    },
  );

  server.registerTool(
    "update_ticket",
    {
      title: "Update or move a ticket",
      description:
        "Edit a project ticket or move it between columns by setting `status`. Moving to BLOCKED needs a `blockedReason`. Send just the fields to change; send null to clear the milestone, repository, or assignee.",
      inputSchema: {
        projectId: uuid,
        number: z.number().int().min(1),
        title: z.string().min(1).max(160).optional(),
        description: z.string().optional(),
        priority: ticketPriority.optional(),
        status: ticketStatus.optional(),
        blockedReason: z.string().optional(),
        milestoneId: uuid.nullable().optional(),
        repoId: uuid.nullable().optional(),
        assigneeUserId: userId.nullable().optional(),
      },
      annotations: WRITE,
    },
    async ({ projectId, number, ...body }) => {
      try {
        return ok({ ticket: await api.updateTicket(projectId, number, compact(body)) });
      } catch (error) {
        return failed(error, "Could not update the ticket.");
      }
    },
  );

  server.registerTool(
    "delete_ticket",
    {
      title: "Delete a ticket",
      description: "Permanently delete a project ticket and its comments. Ask the member to confirm first.",
      inputSchema: { projectId: uuid, number: z.number().int().min(1) },
      annotations: DESTRUCTIVE,
    },
    async ({ projectId, number }) => {
      try {
        await api.deleteTicket(projectId, number);
        return ok({ deleted: true }, `Deleted ticket #${number}.`);
      } catch (error) {
        return failed(error, "Could not delete the ticket.");
      }
    },
  );

  server.registerTool(
    "comment_on_ticket",
    {
      title: "Comment on a ticket",
      description: "Add a Markdown comment to a project ticket as the member.",
      inputSchema: { projectId: uuid, number: z.number().int().min(1), body: z.string().min(1).describe("Markdown.") },
      annotations: WRITE,
    },
    async ({ projectId, number, body }) => {
      try {
        return ok({ comment: await api.addTicketComment(projectId, number, { body }) });
      } catch (error) {
        return failed(error, "Could not add the comment.");
      }
    },
  );

  server.registerTool(
    "create_milestone",
    {
      title: "Create a milestone",
      description: "Add a milestone to the end of a project's roadmap. Any project member may do this.",
      inputSchema: {
        projectId: uuid,
        title: z.string().min(1).max(120),
        description: z.string().optional().describe("Markdown."),
        status: z.enum(["PLANNED", "ACTIVE", "COMPLETED"]).optional().describe("Defaults to PLANNED."),
        targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().describe("YYYY-MM-DD."),
      },
      annotations: WRITE,
    },
    async ({ projectId, ...body }) => {
      try {
        return ok({ milestone: await api.createMilestone(projectId, compact(body)) });
      } catch (error) {
        return failed(error, "Could not create the milestone.");
      }
    },
  );

  server.registerTool(
    "update_milestone",
    {
      title: "Update a milestone",
      description: "Change a milestone's title, description, status, or target date. Send just the fields to change.",
      inputSchema: {
        projectId: uuid,
        milestoneId: uuid,
        title: z.string().min(1).max(120).optional(),
        description: z.string().optional(),
        status: z.enum(["PLANNED", "ACTIVE", "COMPLETED"]).optional(),
        targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      },
      annotations: WRITE,
    },
    async ({ projectId, milestoneId, ...body }) => {
      try {
        return ok({ milestone: await api.updateMilestone(projectId, milestoneId, compact(body)) });
      } catch (error) {
        return failed(error, "Could not update the milestone.");
      }
    },
  );

  server.registerTool(
    "delete_milestone",
    {
      title: "Delete a milestone",
      description: "Remove a milestone from a project's roadmap. Tickets that pointed at it are kept. Ask the member to confirm first.",
      inputSchema: { projectId: uuid, milestoneId: uuid },
      annotations: DESTRUCTIVE,
    },
    async ({ projectId, milestoneId }) => {
      try {
        await api.deleteMilestone(projectId, milestoneId);
        return ok({ deleted: true }, "Deleted the milestone.");
      } catch (error) {
        return failed(error, "Could not delete the milestone.");
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Agents
  // ---------------------------------------------------------------------------

  server.registerTool(
    "list_agents",
    {
      title: "List agents",
      description:
        "Find WeStride agents: Muse-powered workers that take tickets from a queue, on demand or on a schedule, and report what they did. Returns public agents plus the member's own and those linked to their projects and ideas.",
      inputSchema: {
        q: z.string().optional().describe("Matches the name or description."),
        status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
        mine: z.boolean().optional().describe("Only agents the member owns."),
        sort,
      },
      annotations: READ,
    },
    async (input) => {
      try {
        return ok({ agents: await api.listAgents(compact(input)) });
      } catch (error) {
        return failed(error, "Could not list agents.");
      }
    },
  );

  server.registerTool(
    "get_agent",
    {
      title: "Get an agent",
      description:
        "One agent in full: its brief (instructions), model and step limit, schedule, repository, linked idea and project, ticket counts, usage totals, and what the member may do with it (viewerRole).",
      inputSchema: { agentId: uuid },
      annotations: READ,
    },
    async ({ agentId }) => {
      try {
        return ok({ agent: await api.getAgent(agentId) });
      } catch (error) {
        return failed(error, "Could not load that agent.");
      }
    },
  );

  server.registerTool(
    "create_agent",
    {
      title: "Create an agent",
      description:
        "Create an agent owned by the member. Give it a name, a description, and Markdown instructions (the standing brief every job starts from). Link it to a project or idea the member belongs to so teammates can queue work. Optionally set a schedule (DAILY/WEEKLY need an hour in UTC; WEEKLY needs a weekday) and a standing task for wake-ups with an empty queue. A repository is linked later on the website; without one the agent writes reports. Confirm with the member before calling this.",
      inputSchema: {
        name: z.string().min(1).max(80),
        description: z.string().min(1).describe("Markdown. What the agent is for."),
        instructions: z.string().optional().describe("Markdown. The brief every job starts from."),
        isPublic: z.boolean(),
        ideaId: uuid.nullable().optional(),
        projectId: uuid.nullable().optional(),
        model: z.enum(["muse-spark-1.3", "muse-spark-1.3-contributor", "muse-wonder-1.0"]).optional().describe("Defaults to muse-spark-1.3."),
        maxSteps: z.number().int().min(10).max(400).optional().describe("Step limit per job. Defaults to 120."),
        schedule: z.enum(["NONE", "HOURLY", "DAILY", "WEEKLY"]).optional(),
        scheduleHourUtc: z.number().int().min(0).max(23).nullable().optional(),
        scheduleWeekday: z.number().int().min(0).max(6).nullable().optional().describe("0 is Sunday."),
        standingTask: z.string().optional().describe("Markdown. What a scheduled wake-up does when the queue is empty."),
        firstTicket: z.string().max(160).optional().describe("A first ticket title to queue."),
      },
      annotations: WRITE,
    },
    async (input) => {
      try {
        const agent = await api.createAgent(compact(input));
        return ok({ agent }, `Created agent "${agent.name}" (${agent.id}). View it at https://westride.org/agents/${agent.id}\n\n${JSON.stringify(agent, null, 2)}`);
      } catch (error) {
        return failed(error, "Could not create the agent.");
      }
    },
  );

  server.registerTool(
    "update_agent",
    {
      title: "Update an agent",
      description:
        "Change an agent's details, links, model, schedule, or status. Only the owner may edit. Set status to PAUSED to stop the schedule, ACTIVE to resume, or ARCHIVED to retire it. Send just the fields to change.",
      inputSchema: {
        agentId: uuid,
        name: z.string().min(1).max(80).optional(),
        description: z.string().min(1).optional(),
        instructions: z.string().optional(),
        isPublic: z.boolean().optional(),
        ideaId: uuid.nullable().optional(),
        projectId: uuid.nullable().optional(),
        model: z.enum(["muse-spark-1.3", "muse-spark-1.3-contributor", "muse-wonder-1.0"]).optional(),
        maxSteps: z.number().int().min(10).max(400).optional(),
        schedule: z.enum(["NONE", "HOURLY", "DAILY", "WEEKLY"]).optional(),
        scheduleHourUtc: z.number().int().min(0).max(23).nullable().optional(),
        scheduleWeekday: z.number().int().min(0).max(6).nullable().optional(),
        standingTask: z.string().optional(),
        status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
      },
      annotations: WRITE,
    },
    async ({ agentId, ...body }) => {
      try {
        return ok({ agent: await api.updateAgent(agentId, compact(body)) });
      } catch (error) {
        return failed(error, "Could not update the agent.");
      }
    },
  );

  server.registerTool(
    "delete_agent",
    {
      title: "Delete an agent",
      description: "Permanently delete an agent with its tickets, jobs, and log. Only the owner may, and not while a job is running. Ask the member to confirm first.",
      inputSchema: { agentId: uuid },
      annotations: DESTRUCTIVE,
    },
    async ({ agentId }) => {
      try {
        await api.deleteAgent(agentId);
        return ok({ deleted: true }, "Deleted the agent.");
      } catch (error) {
        return failed(error, "Could not delete the agent.");
      }
    },
  );

  server.registerTool(
    "list_agent_tickets",
    {
      title: "List an agent's tickets",
      description: "The agent's work queue in the order it will be worked, optionally one status.",
      inputSchema: { agentId: uuid, status: ticketStatus.optional() },
      annotations: READ,
    },
    async ({ agentId, status }) => {
      try {
        return ok({ tickets: await api.listAgentTickets(agentId, compact({ status })) });
      } catch (error) {
        return failed(error, "Could not list the agent's tickets.");
      }
    },
  );

  server.registerTool(
    "get_agent_ticket",
    {
      title: "Get an agent ticket",
      description: "One agent ticket by number, with the jobs that worked it and their summaries.",
      inputSchema: { agentId: uuid, number: z.number().int().min(1) },
      annotations: READ,
    },
    async ({ agentId, number }) => {
      try {
        return ok({ ticket: await api.getAgentTicket(agentId, number) });
      } catch (error) {
        return failed(error, "Could not load that ticket.");
      }
    },
  );

  server.registerTool(
    "queue_agent_ticket",
    {
      title: "Queue work for an agent",
      description:
        "Add a ticket to an agent's backlog. The owner and collaborators (members of the linked project or idea) may queue work. Write the description as a brief the agent can act on. Jobs are started from the website.",
      inputSchema: {
        agentId: uuid,
        title: z.string().min(1).max(160),
        description: z.string().optional().describe("Markdown. The brief the agent works from."),
        priority: ticketPriority.optional().describe("Defaults to MEDIUM. URGENT is worked first."),
      },
      annotations: WRITE,
    },
    async ({ agentId, ...body }) => {
      try {
        const ticket = await api.createAgentTicket(agentId, compact(body));
        return ok({ ticket }, `Queued ${ticket.key}: ${ticket.title}\n\n${JSON.stringify(ticket, null, 2)}`);
      } catch (error) {
        return failed(error, "Could not queue the ticket.");
      }
    },
  );

  server.registerTool(
    "update_agent_ticket",
    {
      title: "Update or move an agent ticket",
      description: "Edit an agent ticket or move it by setting `status`. Moving to BLOCKED needs a `blockedReason`. A ticket with a running job cannot be moved.",
      inputSchema: {
        agentId: uuid,
        number: z.number().int().min(1),
        title: z.string().min(1).max(160).optional(),
        description: z.string().optional(),
        priority: ticketPriority.optional(),
        status: ticketStatus.optional(),
        blockedReason: z.string().optional(),
      },
      annotations: WRITE,
    },
    async ({ agentId, number, ...body }) => {
      try {
        return ok({ ticket: await api.updateAgentTicket(agentId, number, compact(body)) });
      } catch (error) {
        return failed(error, "Could not update the ticket.");
      }
    },
  );

  server.registerTool(
    "delete_agent_ticket",
    {
      title: "Delete an agent ticket",
      description: "Permanently delete an agent ticket. Not allowed while a job is running on it. Ask the member to confirm first.",
      inputSchema: { agentId: uuid, number: z.number().int().min(1) },
      annotations: DESTRUCTIVE,
    },
    async ({ agentId, number }) => {
      try {
        await api.deleteAgentTicket(agentId, number);
        return ok({ deleted: true }, `Deleted ticket #${number}.`);
      } catch (error) {
        return failed(error, "Could not delete the ticket.");
      }
    },
  );

  server.registerTool(
    "list_agent_jobs",
    {
      title: "List an agent's jobs",
      description: "What the agent has run, newest first: trigger, kind (CODE or REPORT), status, pull request, summary, and token usage.",
      inputSchema: { agentId: uuid, limit: z.number().int().min(1).max(500).optional().describe("Defaults to 100.") },
      annotations: READ,
    },
    async ({ agentId, limit }) => {
      try {
        return ok({ jobs: await api.listAgentJobs(agentId, compact({ limit })) });
      } catch (error) {
        return failed(error, "Could not list jobs.");
      }
    },
  );

  server.registerTool(
    "get_agent_job",
    {
      title: "Get a job",
      description: "One agent job with its outcome: status, summary or report, error, pull request, and usage.",
      inputSchema: { agentId: uuid, jobId: uuid },
      annotations: READ,
    },
    async ({ agentId, jobId }) => {
      try {
        return ok({ job: await api.getAgentJob(agentId, jobId) });
      } catch (error) {
        return failed(error, "Could not load that job.");
      }
    },
  );

  server.registerTool(
    "read_agent_log",
    {
      title: "Read an agent's log",
      description: "A newest-first record of what the agent and its team did: tickets queued and moved, jobs run, settings and schedule changes.",
      inputSchema: { agentId: uuid, limit: z.number().int().min(1).max(500).optional().describe("Defaults to 100.") },
      annotations: READ,
    },
    async ({ agentId, limit }) => {
      try {
        return ok({ entries: await api.listAgentLog(agentId, compact({ limit })) });
      } catch (error) {
        return failed(error, "Could not read the log.");
      }
    },
  );

  server.registerTool(
    "get_agent_usage",
    {
      title: "Get an agent's usage",
      description: "Token and estimated cost totals for an agent, broken down by model, trigger, and day over the last 30 days. Costs are USD in millionths.",
      inputSchema: { agentId: uuid },
      annotations: READ,
    },
    async ({ agentId }) => {
      try {
        return ok({ usage: await api.getAgentUsage(agentId) });
      } catch (error) {
        return failed(error, "Could not load usage.");
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Academy
  // ---------------------------------------------------------------------------

  server.registerTool(
    "list_academy_tracks",
    {
      title: "List academy tracks",
      description:
        "List every WeStride Academy learning track in recommended order. Each track includes its difficulty, estimated duration, category, tags, prerequisite track slugs, learning objectives, and the badge earned on completion.",
      annotations: READ,
    },
    run("Could not list academy tracks.", async () => ok({ tracks: await api.listAcademyTracks() })),
  );

  server.registerTool(
    "get_academy_track",
    {
      title: "Get an academy track",
      description: "One Academy track by slug, with its lessons in order.",
      inputSchema: { slug: z.string().describe("The track slug from list_academy_tracks.") },
      annotations: READ,
    },
    async ({ slug }) => {
      try {
        return ok({ track: await api.getAcademyTrack(slug) });
      } catch (error) {
        return failed(error, "Could not load that track.");
      }
    },
  );

  return server;
}
