"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { Icon } from "@astryxdesign/core/Icon";
import { SparklesIcon } from "@heroicons/react/20/solid";
import type { ProjectStatus, TicketPriority, TicketStatus } from "@westride/db";
import {
  PROJECT_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from "@/lib/build/labels";

const PROJECT_STATUS_VARIANT: Record<
  ProjectStatus,
  "neutral" | "blue" | "green" | "orange"
> = {
  PLANNING: "neutral",
  BUILDING: "blue",
  LAUNCHED: "green",
  PAUSED: "orange",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge
      variant={PROJECT_STATUS_VARIANT[status]}
      label={PROJECT_STATUS_LABELS[status]}
    />
  );
}

const TICKET_STATUS_VARIANT: Record<
  TicketStatus,
  "neutral" | "blue" | "purple" | "error" | "green"
> = {
  BACKLOG: "neutral",
  IN_PROGRESS: "blue",
  IN_REVIEW: "purple",
  BLOCKED: "error",
  DONE: "green",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge
      variant={TICKET_STATUS_VARIANT[status]}
      label={TICKET_STATUS_LABELS[status]}
    />
  );
}

const PRIORITY_VARIANT: Record<TicketPriority, "neutral" | "teal" | "orange" | "red"> = {
  LOW: "neutral",
  MEDIUM: "teal",
  HIGH: "orange",
  URGENT: "red",
};

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge variant={PRIORITY_VARIANT[priority]} label={TICKET_PRIORITY_LABELS[priority]} />
  );
}

/** Marks a ticket Muse drafted during planning. */
export function MuseDraftedBadge() {
  return (
    <Badge
      variant="purple"
      icon={<Icon icon={SparklesIcon} size="xsm" />}
      label="Muse"
    />
  );
}
