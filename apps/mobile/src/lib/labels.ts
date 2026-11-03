import type {
  AgentJobStatus,
  AgentStatus,
  IdeaType,
  IdeaView,
  ProjectStatus,
  TicketPriority,
  TicketStatus,
} from "@westride/api-client";
import type { Tone } from "@/theme";

export const IDEA_TYPE_LABELS: Record<IdeaType, string> = {
  BUSINESS: "Business",
  NON_PROFIT: "Non-Profit",
  GAME: "Game",
  OPEN_SOURCE: "Open Source",
  WEBSITE: "Website",
  MOBILE_APP: "Mobile App",
};

export const IDEA_TYPE_TONE: Record<IdeaType, Tone> = {
  BUSINESS: "blue",
  NON_PROFIT: "green",
  GAME: "purple",
  OPEN_SOURCE: "gray",
  WEBSITE: "blue",
  MOBILE_APP: "purple",
};

export const IDEA_VIEW_LABELS: Record<IdeaView | "all", string> = {
  all: "Discover",
  mine: "Yours",
  following: "Following",
  featured: "Best of",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  BUILDING: "Building",
  LAUNCHED: "Launched",
  PAUSED: "Paused",
};

export const PROJECT_STATUS_TONE: Record<ProjectStatus, Tone> = {
  PLANNING: "gray",
  BUILDING: "blue",
  LAUNCHED: "green",
  PAUSED: "purple",
};

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  ARCHIVED: "Archived",
};

export const AGENT_STATUS_TONE: Record<AgentStatus, Tone> = {
  ACTIVE: "green",
  PAUSED: "purple",
  ARCHIVED: "gray",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  BACKLOG: "Backlog",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  BLOCKED: "Roadblocked",
  DONE: "Done",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const AGENT_JOB_STATUS_LABELS: Record<AgentJobStatus, string> = {
  QUEUED: "Starting",
  RUNNING: "Working",
  SUCCEEDED: "Finished",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const IDEA_TYPES = Object.keys(IDEA_TYPE_LABELS) as IdeaType[];
