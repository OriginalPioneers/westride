import type {
  AgentJobKind,
  AgentJobTrigger,
  AgentRunStatus,
  AgentSchedule,
  AgentStatus,
  TicketStatus,
} from "@westride/db";

export {
  AGENT_RUN_STATUS_LABELS as AGENT_JOB_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_ORDER,
  TICKET_STATUS_LABELS,
  parseTicketStatusParam,
} from "@/lib/build/labels";

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  ARCHIVED: "Archived",
};

export const AGENT_STATUS_HINTS: Record<AgentStatus, string> = {
  ACTIVE: "Runs on its schedule and on request.",
  PAUSED: "Keeps its tickets, but nothing runs until it is resumed.",
  ARCHIVED: "Kept for its log and spend. It no longer runs.",
};

export const AGENT_SCHEDULE_LABELS: Record<AgentSchedule, string> = {
  NONE: "Not scheduled",
  HOURLY: "Every hour",
  DAILY: "Every day",
  WEEKLY: "Every week",
};

export const AGENT_SCHEDULE_ORDER: AgentSchedule[] = ["NONE", "HOURLY", "DAILY", "WEEKLY"];

export const AGENT_JOB_KIND_LABELS: Record<AgentJobKind, string> = {
  CODE: "Code",
  REPORT: "Report",
};

export const AGENT_JOB_KIND_HINTS: Record<AgentJobKind, string> = {
  CODE: "Muse Code worked in the repository and opened a pull request.",
  REPORT: "Muse researched and wrote up an answer.",
};

export const AGENT_JOB_TRIGGER_LABELS: Record<AgentJobTrigger, string> = {
  MANUAL: "On request",
  SCHEDULE: "Scheduled",
};

/** One line under each ticket column, for agents. */
export const AGENT_TICKET_STATUS_HINTS: Record<TicketStatus, string> = {
  BACKLOG: "Queued for the agent, in priority order.",
  IN_PROGRESS: "The agent is on it now.",
  IN_REVIEW: "Finished; a pull request or report is waiting for a look.",
  BLOCKED: "The agent could not finish. Fix the reason and send it back.",
  DONE: "Accepted and closed.",
};

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const AGENT_LOG_KIND_LABELS: Record<string, string> = {
  agent: "Agent",
  ticket: "Ticket",
  job: "Job",
  schedule: "Schedule",
  settings: "Settings",
};

/** Whether a job status counts as finished for the UI. */
export function isTerminalJobStatus(status: AgentRunStatus): boolean {
  return status === "SUCCEEDED" || status === "FAILED" || status === "CANCELLED";
}

export function agentsPath(): string {
  return "/agents";
}

export function agentPath(agentId: string): string {
  return `/agents/${agentId}`;
}

export function agentTicketsPath(agentId: string, status?: TicketStatus): string {
  const base = `/agents/${agentId}/tickets`;
  return status ? `${base}?status=${status.toLowerCase()}` : base;
}

export function agentTicketPath(agentId: string, number: number): string {
  return `/agents/${agentId}/tickets/${number}`;
}

export function agentJobsPath(agentId: string): string {
  return `/agents/${agentId}/jobs`;
}

export function agentJobPath(agentId: string, jobId: string): string {
  return `/agents/${agentId}/jobs/${jobId}`;
}

export function agentLogPath(agentId: string): string {
  return `/agents/${agentId}/log`;
}

export function agentUsagePath(agentId: string): string {
  return `/agents/${agentId}/usage`;
}

export function agentSettingsPath(agentId: string): string {
  return `/agents/${agentId}/settings`;
}
