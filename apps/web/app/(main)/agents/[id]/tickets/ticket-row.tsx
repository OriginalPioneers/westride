import { ListItem } from "@astryxdesign/core/List";
import { HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { AgentTicket } from "@westride/db";
import { agentTicketKey } from "@westride/db/agent-rules";
import { agentTicketPath } from "@/lib/agents/labels";
import { ScheduledTicketBadge, TicketPriorityBadge, TicketStatusBadge } from "../../agent-badges";

/** One ticket in a list: key, title, and what changes triage. */
export function AgentTicketRow({
  ticket,
  agentName,
  showStatus,
}: {
  ticket: AgentTicket;
  agentName: string;
  showStatus: boolean;
}) {
  const detail = ticket.status === "BLOCKED" && ticket.blockedReason ? ticket.blockedReason : undefined;
  return (
    <ListItem
      href={agentTicketPath(ticket.agentId, ticket.number)}
      align="start"
      startContent={
        <Text type="supporting" hasTabularNumbers>
          {agentTicketKey(agentName, ticket.number)}
        </Text>
      }
      label={ticket.title}
      description={detail}
      endContent={
        <HStack gap={1} vAlign="center" wrap="wrap">
          {ticket.source === "SCHEDULE" ? <ScheduledTicketBadge /> : null}
          {ticket.priority !== "MEDIUM" ? <TicketPriorityBadge priority={ticket.priority} /> : null}
          {showStatus ? <TicketStatusBadge status={ticket.status} /> : null}
        </HStack>
      }
    />
  );
}
