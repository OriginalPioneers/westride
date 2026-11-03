import type {
  Agent,
  AgentJob,
  AgentLogEntry,
  AgentTicket,
  AgentTicketDetail,
  Person,
} from "@westride/api-client";
import type {
  AgentJob as AgentJobRow,
  AgentLogEntry as AgentLogRow,
  AgentTicket as AgentTicketRow,
} from "@westride/db";
import {
  agentTicketKey,
  describeSchedule,
  type AgentRole,
  type AgentWithDetails,
} from "@westride/db/agents";
import { personOrNull, resolvePeople } from "../people";

export function toAgent(agent: AgentWithDetails, people: Map<string, Person>, viewerRole: AgentRole | null): Agent {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    instructions: agent.instructions,
    imageUrl: agent.imageUrl,
    status: agent.status,
    isPublic: agent.isPublic,
    owner: personOrNull(people, agent.ownerClerkUserId) as Person,
    idea: agent.idea,
    project: agent.project,
    model: agent.model,
    maxSteps: agent.maxSteps,
    allowSponsorTokens: agent.allowSponsorTokens,
    allowVolunteerCompute: agent.allowVolunteerCompute,
    volunteerLocalModel: agent.volunteerLocalModel,
    repo:
      agent.repoOwner && agent.repoName && agent.repoHtmlUrl
        ? {
            owner: agent.repoOwner,
            name: agent.repoName,
            htmlUrl: agent.repoHtmlUrl,
            defaultBranch: agent.repoDefaultBranch ?? "main",
            isPrivate: agent.repoIsPrivate ?? false,
          }
        : null,
    schedule: {
      schedule: agent.schedule,
      hourUtc: agent.scheduleHourUtc,
      weekday: agent.scheduleWeekday,
      standingTask: agent.standingTask,
      summary: describeSchedule(agent),
      nextRunAt: agent.nextRunAt?.toISOString() ?? null,
      lastRunAt: agent.lastRunAt?.toISOString() ?? null,
    },
    ticketCounts: agent.ticketCounts,
    usage: agent.usage,
    activeJobs: agent.activeJobs,
    viewerRole,
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString(),
  };
}

/**
 * Lists only know the cheap part of the viewer's role: ownership. Collaborator
 * status needs a membership lookup, which the detail route does.
 */
export async function toAgents(agents: AgentWithDetails[], viewerId: string | null): Promise<Agent[]> {
  const people = await resolvePeople(agents.map((agent) => agent.ownerClerkUserId));
  return agents.map((agent) =>
    toAgent(agent, people, viewerId !== null && agent.ownerClerkUserId === viewerId ? "OWNER" : null),
  );
}

export async function toAgentDetail(agent: AgentWithDetails, viewerRole: AgentRole | null): Promise<Agent> {
  const people = await resolvePeople([agent.ownerClerkUserId]);
  return toAgent(agent, people, viewerRole);
}

export function toAgentTicket(ticket: AgentTicketRow, agentName: string, people: Map<string, Person>): AgentTicket {
  return {
    id: ticket.id,
    number: ticket.number,
    key: agentTicketKey(agentName, ticket.number),
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    blockedReason: ticket.blockedReason,
    source: ticket.source,
    createdBy: personOrNull(people, ticket.createdByClerkUserId),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    completedAt: ticket.completedAt?.toISOString() ?? null,
  };
}

export async function toAgentTickets(tickets: AgentTicketRow[], agentName: string): Promise<AgentTicket[]> {
  const people = await resolvePeople(
    tickets.flatMap((ticket) => (ticket.createdByClerkUserId ? [ticket.createdByClerkUserId] : [])),
  );
  return tickets.map((ticket) => toAgentTicket(ticket, agentName, people));
}

export function toAgentJob(job: AgentJobRow, people: Map<string, Person>): AgentJob {
  return {
    id: job.id,
    ticketId: job.ticketId,
    ticketTitle: job.ticketTitle,
    trigger: job.trigger,
    kind: job.kind,
    status: job.status,
    startedBy: personOrNull(people, job.startedByClerkUserId),
    model: job.model,
    maxSteps: job.maxSteps,
    repoFullName: job.repoFullName,
    branch: job.branch,
    prUrl: job.prUrl,
    summary: job.summary,
    error: job.error,
    usage: {
      jobs: 1,
      modelCalls: job.modelCalls,
      inputTokens: job.inputTokens,
      cachedTokens: job.cachedTokens,
      outputTokens: job.outputTokens,
      reasoningTokens: job.reasoningTokens,
      totalTokens: job.totalTokens,
      estimatedCostMicros: job.estimatedCostMicros,
    },
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
  };
}

export async function toAgentJobs(jobs: AgentJobRow[]): Promise<AgentJob[]> {
  const people = await resolvePeople(
    jobs.flatMap((job) => (job.startedByClerkUserId ? [job.startedByClerkUserId] : [])),
  );
  return jobs.map((job) => toAgentJob(job, people));
}

export async function toAgentTicketDetail(
  ticket: AgentTicketRow,
  jobs: AgentJobRow[],
  agentName: string,
): Promise<AgentTicketDetail> {
  const people = await resolvePeople([
    ...(ticket.createdByClerkUserId ? [ticket.createdByClerkUserId] : []),
    ...jobs.flatMap((job) => (job.startedByClerkUserId ? [job.startedByClerkUserId] : [])),
  ]);
  return {
    ...toAgentTicket(ticket, agentName, people),
    jobs: jobs.map((job) => toAgentJob(job, people)),
  };
}

export async function toAgentLog(entries: AgentLogRow[]): Promise<AgentLogEntry[]> {
  const people = await resolvePeople(
    entries.flatMap((entry) => (entry.actorClerkUserId ? [entry.actorClerkUserId] : [])),
  );
  return entries.map((entry) => ({
    id: entry.id,
    kind: entry.kind as AgentLogEntry["kind"],
    message: entry.message,
    ticketId: entry.ticketId,
    jobId: entry.jobId,
    actor: personOrNull(people, entry.actorClerkUserId),
    createdAt: entry.createdAt.toISOString(),
  }));
}
