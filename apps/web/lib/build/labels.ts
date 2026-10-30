import type {
  AgentRunStatus,
  MilestoneStatus,
  ProjectMemberRole,
  ProjectStatus,
  TicketPriority,
  TicketStatus,
} from "@westride/db";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  BUILDING: "Building",
  LAUNCHED: "Launched",
  PAUSED: "Paused",
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "PLANNING",
  "BUILDING",
  "LAUNCHED",
  "PAUSED",
];

export const PROJECT_ROLE_LABELS: Record<ProjectMemberRole, string> = {
  OWNER: "Owner",
  MEMBER: "Member",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  BACKLOG: "Backlog",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  BLOCKED: "Roadblocked",
  DONE: "Done",
};

/** One line under each board column. */
export const TICKET_STATUS_HINTS: Record<TicketStatus, string> = {
  BACKLOG: "Pending work, in priority order.",
  IN_PROGRESS: "Someone, or a Muse agent, is on it.",
  IN_REVIEW: "A pull request is open and needs a look.",
  BLOCKED: "Stuck until something changes.",
  DONE: "Merged, shipped, or otherwise finished.",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const TICKET_PRIORITY_ORDER: TicketPriority[] = [
  "URGENT",
  "HIGH",
  "MEDIUM",
  "LOW",
];

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  COMPLETED: "Completed",
};

export function buildPath(): string {
  return "/build";
}

export function projectPath(projectId: string): string {
  return `/build/${projectId}`;
}

export function ticketsPath(projectId: string, status?: TicketStatus): string {
  const base = `/build/${projectId}/tickets`;
  return status ? `${base}?status=${status.toLowerCase()}` : base;
}

export function ticketPath(projectId: string, number: number): string {
  return `/build/${projectId}/tickets/${number}`;
}

export function projectSettingsPath(projectId: string): string {
  return `/build/${projectId}/settings`;
}

export function boardPath(projectId: string): string {
  return `/build/${projectId}/board`;
}

export function activityPath(projectId: string): string {
  return `/build/${projectId}/activity`;
}

export function runsPath(projectId: string): string {
  return `/build/${projectId}/runs`;
}

export const AGENT_RUN_STATUS_LABELS: Record<AgentRunStatus, string> = {
  QUEUED: "Starting",
  RUNNING: "Working",
  SUCCEEDED: "Finished",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

/** `in_progress` or `in-progress` in a URL reads as IN_PROGRESS. */
export function parseTicketStatusParam(value: string | undefined): TicketStatus | null {
  if (!value) {
    return null;
  }
  const upper = value.toUpperCase().replace(/-/g, "_");
  return upper in TICKET_STATUS_LABELS ? (upper as TicketStatus) : null;
}
