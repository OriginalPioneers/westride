import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { listTickets, TICKET_STATUSES } from "@westride/db/build";
import {
  TICKET_STATUS_HINTS,
  TICKET_STATUS_LABELS,
  parseTicketStatusParam,
} from "@/lib/build/labels";
import { resolveMemberProfiles } from "@/lib/ideas/members";
import { loadProjectPage } from "../load-project";
import { ProjectHeader } from "../project-header";
import { NewTicketButton } from "./new-ticket-button";
import { TicketStatusFilter } from "./status-filter";
import { TicketRow } from "./ticket-row";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const context = await loadProjectPage((await params).id);
  return { title: context ? `Tickets · ${context.project.name}` : "Tickets" };
}

export default async function TicketsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const context = await loadProjectPage(id);
  if (!context) {
    notFound();
  }
  const { project } = context;
  const rawStatus = Array.isArray(query.status) ? query.status[0] : query.status;
  const selected = parseTicketStatusParam(rawStatus);

  const [tickets, profiles] = await Promise.all([
    listTickets(project.id),
    resolveMemberProfiles(project.members.map((member) => member.clerkUserId)),
  ]);
  const members = project.members.map((member) => ({
    clerkUserId: member.clerkUserId,
    name: profiles.get(member.clerkUserId)?.name ?? "WeStride member",
  }));
  const assigneeName = (clerkUserId: string | null) =>
    clerkUserId ? (profiles.get(clerkUserId)?.name ?? "WeStride member") : null;

  const visibleStatuses = selected ? [selected] : TICKET_STATUSES;
  const sections = visibleStatuses
    .map((status) => ({
      status,
      tickets: tickets.filter((ticket) => ticket.status === status),
    }))
    .filter((section) => selected !== null || section.tickets.length > 0);

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <ProjectHeader
            context={context}
            section="tickets"
            actions={
              context.isMember ? (
                <NewTicketButton
                  projectId={project.id}
                  milestones={project.milestones}
                  repos={project.repos}
                  members={members}
                />
              ) : null
            }
          />
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={6}>
            <TicketStatusFilter
              projectId={project.id}
              selected={selected}
              counts={project.ticketCounts}
            />

            {tickets.length === 0 ? (
              <EmptyState
                title="No tickets yet"
                description="Break the build into tickets small enough to finish in a sitting. Each one can later be handed to a Muse Code agent."
                actions={
                  context.isMember ? (
                    <NewTicketButton
                      variant="secondary"
                      projectId={project.id}
                      milestones={project.milestones}
                      repos={project.repos}
                      members={members}
                    />
                  ) : undefined
                }
              />
            ) : sections.length === 0 ? (
              <EmptyState
                title={`Nothing ${TICKET_STATUS_LABELS[selected!].toLowerCase()}`}
                description={TICKET_STATUS_HINTS[selected!]}
              />
            ) : (
              <VStack gap={8}>
                {sections.map((section) => (
                  <VStack key={section.status} gap={3}>
                    <HStack gap={3} vAlign="center" wrap="wrap">
                      <Heading level={2}>{TICKET_STATUS_LABELS[section.status]}</Heading>
                      <StackItem size="fill">
                        <Text type="supporting">{TICKET_STATUS_HINTS[section.status]}</Text>
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
                          <TicketRow
                            key={ticket.id}
                            ticket={ticket}
                            projectName={project.name}
                            assigneeName={assigneeName(ticket.assigneeClerkUserId)}
                            showStatus={false}
                          />
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
