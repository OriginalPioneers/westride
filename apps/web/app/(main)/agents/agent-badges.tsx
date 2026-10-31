"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { Icon } from "@astryxdesign/core/Icon";
import { ClockIcon } from "@heroicons/react/20/solid";
import type { AgentJobKind, AgentJobTrigger, AgentRunStatus, AgentSchedule, AgentStatus } from "@westride/db";
import {
  AGENT_JOB_KIND_LABELS,
  AGENT_JOB_STATUS_LABELS,
  AGENT_JOB_TRIGGER_LABELS,
  AGENT_SCHEDULE_LABELS,
  AGENT_STATUS_LABELS,
} from "@/lib/agents/labels";

export { TicketPriorityBadge, TicketStatusBadge } from "../build/project-badges";

const AGENT_STATUS_VARIANT: Record<AgentStatus, "green" | "orange" | "neutral"> = {
  ACTIVE: "green",
  PAUSED: "orange",
  ARCHIVED: "neutral",
};

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  return <Badge variant={AGENT_STATUS_VARIANT[status]} label={AGENT_STATUS_LABELS[status]} />;
}

const JOB_STATUS_VARIANT: Record<AgentRunStatus, "neutral" | "blue" | "green" | "error" | "orange"> = {
  QUEUED: "neutral",
  RUNNING: "blue",
  SUCCEEDED: "green",
  FAILED: "error",
  CANCELLED: "orange",
};

export function JobStatusBadge({ status }: { status: AgentRunStatus }) {
  return <Badge variant={JOB_STATUS_VARIANT[status]} label={AGENT_JOB_STATUS_LABELS[status]} />;
}

export function JobKindBadge({ kind }: { kind: AgentJobKind }) {
  return <Badge variant={kind === "CODE" ? "purple" : "teal"} label={AGENT_JOB_KIND_LABELS[kind]} />;
}

export function JobTriggerBadge({ trigger }: { trigger: AgentJobTrigger }) {
  return (
    <Badge
      variant={trigger === "SCHEDULE" ? "blue" : "neutral"}
      icon={trigger === "SCHEDULE" ? <Icon icon={ClockIcon} size="xsm" /> : undefined}
      label={AGENT_JOB_TRIGGER_LABELS[trigger]}
    />
  );
}

/** Shown on cards and headers when an agent has a schedule. */
export function ScheduleBadge({ schedule }: { schedule: AgentSchedule }) {
  if (schedule === "NONE") {
    return null;
  }
  return (
    <Badge variant="blue" icon={<Icon icon={ClockIcon} size="xsm" />} label={AGENT_SCHEDULE_LABELS[schedule]} />
  );
}

/** Marks a ticket the schedule filed from the standing task. */
export function ScheduledTicketBadge() {
  return <Badge variant="blue" icon={<Icon icon={ClockIcon} size="xsm" />} label="Scheduled" />;
}
