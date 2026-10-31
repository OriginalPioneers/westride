import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TICKET_STATUSES, listAgentTickets } from "@westride/db/agents";
import { AGENT_TICKET_STATUS_HINTS, TICKET_STATUS_LABELS, parseTicketStatusParam } from "@/lib/agents/labels";
import { AgentHeader } from "../agent-header";
import { loadAgentPage } from "../load-agent";
import { NewAgentTicketButton } from "./new-ticket-button";
import { AgentTicketStatusFilter } from "./status-filter";
import { AgentTicketRow } from "./ticket-row";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const context = await loadAgentPage((await params).id);
  return { title: context ? `Tickets · ${context.agent.name}` : "Tickets" };
}

export default async function AgentTicketsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const context = await loadAgentPage(id);
  if (!context) {
    notFound();
  }
  const { agent } = context;
  const rawStatus = Array.isArray(query.status) ? query.status[0] : query.status;
  const selected = parseTicketStatusParam(rawStatus);
  const tickets = await listAgentTickets(agent.id);

  const visibleStatuses = selected ? [selected] : TICKET_STATUSES;
  const sections = visibleStatuses
    .map((status) => ({ status, tickets: tickets.filter((ticket) => ticket.status === status) }))
    .filter((section) => selected !== null || section.tickets.length > 0);

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <AgentHeader
            context={context}
            section="tickets"
            actions={context.canWork ? <NewAgentTicketButton agentId={agent.id} runsCode={context.runsCode} /> : null}
          />
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={6}>
            <AgentTicketStatusFilter agentId={agent.id} selected={selected} counts={agent.ticketCounts} />

            {tickets.length === 0 ? (
              <EmptyState
                title="No tickets yet"
                description="Each ticket is one job for the agent. Queue a few in priority order; scheduled runs take the top one."
                actions={
                  context.canWork ? (
                    <NewAgentTicketButton agentId={agent.id} runsCode={context.runsCode} variant="secondary" />
                  ) : undefined
                }
              />
            ) : sections.length === 0 ? (
              <EmptyState
                title={`Nothing ${TICKET_STATUS_LABELS[selected!].toLowerCase()}`}
                description={AGENT_TICKET_STATUS_HINTS[selected!]}
              />
            ) : (
              <VStack gap={8}>
                {sections.map((section) => (
                  <VStack key={section.status} gap={3}>
                    <HStack gap={3} vAlign="center" wrap="wrap">
                      <Heading level={2}>{TICKET_STATUS_LABELS[section.status]}</Heading>
                      <StackItem size="fill">
                        <Text type="supporting">{AGENT_TICKET_STATUS_HINTS[section.status]}</Text>
                      </StackItem>
                      <Text type="supporting" hasTabularNumbers>
                        {section.tickets.length}
                      </Text>
                    </HStack>
                    {section.tickets.length === 0 ? (
                      <Text type="supporting">None right now.</Text>
                    ) : (
                      <List density="compact">
                        {section.tickets.map((ticket) => (
                          <AgentTicketRow key={ticket.id} ticket={ticket} agentName={agent.name} showStatus={false} />
                        ))}
                      </List>
                    )}
                  </VStack>
                ))}
              </VStack>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
