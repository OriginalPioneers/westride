"use client";

import { useRouter } from "next/navigation";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import type { TicketStatus } from "@westride/db";
import { TICKET_STATUSES, type TicketCounts } from "@westride/db/build-rules";
import { TICKET_STATUS_LABELS, ticketsPath } from "@/lib/build/labels";

const ALL = "all";

export function TicketStatusFilter({
  projectId,
  selected,
  counts,
}: {
  projectId: string;
  selected: TicketStatus | null;
  counts: TicketCounts;
}) {
  const router = useRouter();
  return (
    <SegmentedControl
      label="Show tickets"
      value={selected ?? ALL}
      onChange={(value) => {
        router.push(
          value === ALL ? ticketsPath(projectId) : ticketsPath(projectId, value as TicketStatus),
        );
      }}
    >
      <SegmentedControlItem value={ALL} label="All" />
      {TICKET_STATUSES.map((status) => (
        <SegmentedControlItem
          key={status}
          value={status}
          label={
            counts[status] > 0
              ? `${TICKET_STATUS_LABELS[status]} (${counts[status]})`
              : TICKET_STATUS_LABELS[status]
          }
        />
      ))}
    </SegmentedControl>
  );
}
