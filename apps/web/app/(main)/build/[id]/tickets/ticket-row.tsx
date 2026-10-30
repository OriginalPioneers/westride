import { ListItem } from "@astryxdesign/core/List";
import { HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { TicketWithDetails } from "@westride/db/build";
import { ticketKey } from "@westride/db/build-rules";
import { ticketPath } from "@/lib/build/labels";
import { MuseDraftedBadge, TicketPriorityBadge, TicketStatusBadge } from "../../project-badges";

/** One ticket in a list. Dense: key, title, and the facts that change triage. */
export function TicketRow({
  ticket,
  projectName,
  assigneeName,
  showStatus,
}: {
  ticket: TicketWithDetails;
  projectName: string;
  assigneeName: string | null;
  /** Shown when the list mixes statuses. */
  showStatus: boolean;
}) {
  const details = [
    assigneeName,
    ticket.milestone?.title ?? null,
    ticket.repo ? `${ticket.repo.owner}/${ticket.repo.name}` : null,
    ticket.status === "BLOCKED" && ticket.blockedReason ? ticket.blockedReason : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <ListItem
      href={ticketPath(ticket.projectId, ticket.number)}
      align="start"
      startContent={
        <Text type="supporting" hasTabularNumbers>
          {ticketKey(projectName, ticket.number)}
        </Text>
      }
      label={ticket.title}
      description={details.length > 0 ? details.join(" · ") : undefined}
      endContent={
        <HStack gap={1} vAlign="center" wrap="wrap">
          {ticket.source === "MUSE" ? <MuseDraftedBadge /> : null}
          {ticket.priority !== "MEDIUM" ? (
            <TicketPriorityBadge priority={ticket.priority} />
          ) : null}
          {showStatus ? <TicketStatusBadge status={ticket.status} /> : null}
        </HStack>
      }
    />
  );
}
