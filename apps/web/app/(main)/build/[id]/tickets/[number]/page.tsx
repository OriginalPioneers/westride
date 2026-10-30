import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Markdown } from "@astryxdesign/core/Markdown";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { getTicket, ticketKey } from "@westride/db/build";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  projectPath,
  ticketsPath,
} from "@/lib/build/labels";
import { resolveMemberProfiles } from "@/lib/ideas/members";
import {
  MuseDraftedBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "../../../project-badges";
import { loadProjectPage } from "../../load-project";
import { DeleteTicketButton, EditTicketButton, TicketStatusControl } from "./ticket-controls";

type Params = Promise<{ id: string; number: string }>;

async function loadTicketPage(params: Params) {
  const { id, number } = await params;
  const parsedNumber = Number.parseInt(number, 10);
  if (!Number.isInteger(parsedNumber) || parsedNumber < 1) {
    return null;
  }
  const context = await loadProjectPage(id);
  if (!context) {
    return null;
  }
  const ticket = await getTicket(context.project.id, parsedNumber);
  return ticket ? { context, ticket } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const loaded = await loadTicketPage(params);
  if (!loaded) {
    return { title: "Ticket" };
  }
  return {
    title: `${ticketKey(loaded.context.project.name, loaded.ticket.number)} · ${loaded.ticket.title}`,
  };
}

export default async function TicketPage({ params }: { params: Params }) {
  const loaded = await loadTicketPage(params);
  if (!loaded) {
    notFound();
  }
  const { context, ticket } = loaded;
  const { project } = context;
  const profiles = await resolveMemberProfiles([
    ...project.members.map((member) => member.clerkUserId),
    ticket.createdByClerkUserId,
    ...(ticket.assigneeClerkUserId ? [ticket.assigneeClerkUserId] : []),
  ]);
  const nameOf = (clerkUserId: string | null) =>
    clerkUserId ? (profiles.get(clerkUserId)?.name ?? "WeStride member") : null;
  const key = ticketKey(project.name, ticket.number);
  const dialogOptions = {
    projectId: project.id,
    milestones: project.milestones,
    repos: project.repos,
    members: project.members.map((member) => ({
      clerkUserId: member.clerkUserId,
      name: nameOf(member.clerkUserId) ?? "WeStride member",
    })),
  };

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={4}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Link href={projectPath(project.id)} isStandalone>
                {project.name}
              </Link>
              <Text type="supporting">/</Text>
              <Link href={ticketsPath(project.id)} isStandalone>
                Tickets
              </Link>
              <Text type="supporting">/</Text>
              <Text type="supporting" hasTabularNumbers>
                {key}
              </Text>
            </HStack>
            <HStack gap={4} vAlign="center" wrap="wrap">
              <StackItem size="fill">
                <VStack gap={2}>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <TicketStatusBadge status={ticket.status} />
                    <TicketPriorityBadge priority={ticket.priority} />
                    {ticket.source === "MUSE" ? <MuseDraftedBadge /> : null}
                  </HStack>
                  <Heading level={1}>{ticket.title}</Heading>
                </VStack>
              </StackItem>
              {context.isMember ? (
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <TicketStatusControl ticket={ticket} />
                  <EditTicketButton ticket={ticket} options={dialogOptions} />
                  <DeleteTicketButton ticket={ticket} />
                </HStack>
              ) : null}
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={8}>
            {ticket.status === "BLOCKED" && ticket.blockedReason ? (
              <Banner status="warning" title="Roadblocked" description={ticket.blockedReason} />
            ) : null}

            {ticket.description ? (
              <Markdown headingLevelStart={2} contentWidth="100%">
                {ticket.description}
              </Markdown>
            ) : (
              <Text type="supporting">
                No description yet. Write what &ldquo;done&rdquo; looks like so a
                teammate, or a Muse Code agent, can pick it up.
              </Text>
            )}

            <Divider />

            <MetadataList columns="multi" title="Details">
              <MetadataListItem label="Status">
                {TICKET_STATUS_LABELS[ticket.status]}
              </MetadataListItem>
              <MetadataListItem label="Priority">
                {TICKET_PRIORITY_LABELS[ticket.priority]}
              </MetadataListItem>
              <MetadataListItem label="Assignee">
                {nameOf(ticket.assigneeClerkUserId) ?? "Unassigned"}
              </MetadataListItem>
              <MetadataListItem label="Milestone">
                {ticket.milestone?.title ?? "None"}
              </MetadataListItem>
              <MetadataListItem label="Repository">
                {ticket.repo ? (
                  <Link href={ticket.repo.htmlUrl} isExternalLink>
                    {`${ticket.repo.owner}/${ticket.repo.name}`}
                  </Link>
                ) : project.repos.find((repo) => repo.isPrimary) ? (
                  `${project.repos.find((repo) => repo.isPrimary)!.owner}/${project.repos.find((repo) => repo.isPrimary)!.name} (primary)`
                ) : (
                  "None linked"
                )}
              </MetadataListItem>
              <MetadataListItem label="Created">
                <Timestamp value={ticket.createdAt.toISOString()} format="date" />
                {` by ${nameOf(ticket.createdByClerkUserId)}`}
              </MetadataListItem>
              {ticket.completedAt ? (
                <MetadataListItem label="Completed">
                  <Timestamp value={ticket.completedAt.toISOString()} format="date" />
                </MetadataListItem>
              ) : null}
            </MetadataList>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
