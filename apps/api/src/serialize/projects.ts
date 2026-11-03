import type {
  Milestone,
  Person,
  Project,
  ProjectDetail,
  Ticket,
  TicketComment,
  TicketDetail,
} from "@westride/api-client";
import type { ProjectMilestone, TicketComment as TicketCommentRow } from "@westride/db";
import type { AgentWithDetails } from "@westride/db/agents";
import { ticketKey, type ProjectWithDetails, type TicketWithDetails } from "@westride/db/build";
import { personOrNull, resolvePeople } from "../people";
import { toAgentSummary } from "./ideas";

export function projectPeopleIds(project: ProjectWithDetails): string[] {
  return project.members.map((member) => member.clerkUserId);
}

export function toMilestone(milestone: ProjectMilestone): Milestone {
  return {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    status: milestone.status,
    targetDate: milestone.targetDate,
    sortOrder: milestone.sortOrder,
    createdAt: milestone.createdAt.toISOString(),
    updatedAt: milestone.updatedAt.toISOString(),
  };
}

export function toProject(
  project: ProjectWithDetails,
  idea: { id: string; name: string } | null,
  people: Map<string, Person>,
  viewerId: string | null,
): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    imageUrl: project.imageUrl,
    isPublic: project.isPublic,
    origin: project.origin,
    idea,
    members: project.members.map((member) => ({
      ...(personOrNull(people, member.clerkUserId) as Person),
      role: member.role,
    })),
    repos: project.repos.map((repo) => ({
      id: repo.id,
      owner: repo.owner,
      name: repo.name,
      htmlUrl: repo.htmlUrl,
      defaultBranch: repo.defaultBranch,
      isPrivate: repo.isPrivate,
      isPrimary: repo.isPrimary,
    })),
    milestones: project.milestones.map(toMilestone),
    ticketCounts: project.ticketCounts,
    viewerRole:
      viewerId === null
        ? null
        : (project.members.find((member) => member.clerkUserId === viewerId)?.role ?? null),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export async function toProjects(
  projects: ProjectWithDetails[],
  ideaNames: Map<string, string>,
  viewerId: string | null,
): Promise<Project[]> {
  const people = await resolvePeople(projects.flatMap(projectPeopleIds));
  return projects.map((project) =>
    toProject(
      project,
      project.ideaId ? { id: project.ideaId, name: ideaNames.get(project.ideaId) ?? "" } : null,
      people,
      viewerId,
    ),
  );
}

export async function toProjectDetail(
  project: ProjectWithDetails,
  idea: { id: string; name: string } | null,
  agents: AgentWithDetails[],
  viewerId: string | null,
): Promise<ProjectDetail> {
  const people = await resolvePeople(projectPeopleIds(project));
  return {
    ...toProject(project, idea, people, viewerId),
    agents: agents.map(toAgentSummary),
  };
}

export function ticketPeopleIds(ticket: TicketWithDetails): string[] {
  return [ticket.createdByClerkUserId, ticket.assigneeClerkUserId].filter(
    (id): id is string => Boolean(id),
  );
}

export function toTicket(
  ticket: TicketWithDetails,
  projectName: string,
  people: Map<string, Person>,
): Ticket {
  return {
    id: ticket.id,
    number: ticket.number,
    key: ticketKey(projectName, ticket.number),
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    blockedReason: ticket.blockedReason,
    milestone: ticket.milestone ? { id: ticket.milestone.id, title: ticket.milestone.title } : null,
    repo: ticket.repo ? { id: ticket.repo.id, owner: ticket.repo.owner, name: ticket.repo.name } : null,
    assignee: personOrNull(people, ticket.assigneeClerkUserId),
    source: ticket.source,
    createdBy: personOrNull(people, ticket.createdByClerkUserId),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    completedAt: ticket.completedAt?.toISOString() ?? null,
  };
}

export async function toTickets(tickets: TicketWithDetails[], projectName: string): Promise<Ticket[]> {
  const people = await resolvePeople(tickets.flatMap(ticketPeopleIds));
  return tickets.map((ticket) => toTicket(ticket, projectName, people));
}

export function toComment(comment: TicketCommentRow, people: Map<string, Person>): TicketComment {
  return {
    id: comment.id,
    body: comment.body,
    author: personOrNull(people, comment.authorClerkUserId),
    agentRunId: comment.agentRunId,
    createdAt: comment.createdAt.toISOString(),
  };
}

export async function toTicketDetail(
  ticket: TicketWithDetails,
  comments: TicketCommentRow[],
  projectName: string,
): Promise<TicketDetail> {
  const people = await resolvePeople([
    ...ticketPeopleIds(ticket),
    ...comments.flatMap((comment) => (comment.authorClerkUserId ? [comment.authorClerkUserId] : [])),
  ]);
  return {
    ...toTicket(ticket, projectName, people),
    comments: comments.map((comment) => toComment(comment, people)),
  };
}
