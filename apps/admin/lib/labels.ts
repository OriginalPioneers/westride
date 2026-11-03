import type {
  AgentSchedule,
  AgentStatus,
  CloudLedgerKind,
  ContentOrigin,
  DeviceStatus,
  IdeaType,
  PledgeKind,
  PledgeStatus,
  ProjectStatus,
} from "@westride/db";

type BadgeTone = "neutral" | "success" | "warning" | "info";

export const IDEA_TYPE_LABELS: Record<IdeaType, string> = {
  BUSINESS: "Business",
  NON_PROFIT: "Non-Profit",
  GAME: "Game",
  OPEN_SOURCE: "Open Source",
  WEBSITE: "Website",
  MOBILE_APP: "Mobile App",
};

export const ORIGIN_LABELS: Record<ContentOrigin, string> = {
  MEMBER: "Created by a member",
  IMPORT: "Imported",
};

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: BadgeTone }> = {
  PLANNING: { label: "Planning", tone: "neutral" },
  BUILDING: { label: "Building", tone: "info" },
  LAUNCHED: { label: "Launched", tone: "success" },
  PAUSED: { label: "Paused", tone: "warning" },
};

export const AGENT_STATUS: Record<AgentStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  PAUSED: { label: "Paused", tone: "warning" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
};

export const AGENT_SCHEDULE_LABELS: Record<AgentSchedule, string> = {
  NONE: "On demand",
  HOURLY: "Hourly",
  DAILY: "Daily",
  WEEKLY: "Weekly",
};

export const PLEDGE_KIND_LABELS: Record<PledgeKind, string> = {
  TOKENS: "Tokens",
  COMPUTE: "Compute",
};

export const PLEDGE_STATUS: Record<PledgeStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  PAUSED: { label: "Paused", tone: "warning" },
  REVOKED: { label: "Revoked", tone: "neutral" },
};

export const DEVICE_STATUS: Record<DeviceStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: "Linked", tone: "success" },
  REVOKED: { label: "Unlinked", tone: "neutral" },
};

export const LEDGER_KIND_LABELS: Record<CloudLedgerKind, string> = {
  TOP_UP: "Funds added",
  CODE: "Code redeemed",
  AI_USAGE: "Meta AI",
  COMPUTE_USAGE: "Compute",
  ADJUSTMENT: "Adjustment",
};
