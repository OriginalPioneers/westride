import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List } from "@astryxdesign/core/List";
import { Markdown } from "@astryxdesign/core/Markdown";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import {
  agentTicketKey,
  getAgentTicket,
  isJobActive,
  listAgentJobEvents,
  listAgentJobsForTicket,
} from "@westride/db/agents";
import { reconcileStaleJob } from "@/lib/agents/finish";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  agentJobsPath,
  agentPath,
  agentTicketsPath,
} from "@/lib/agents/labels";
import { toJobSnapshot } from "@/lib/agents/snapshot";
import { FIRST_EVENT_SEQUENCE } from "@/lib/agents/start";
import { resolveMemberProfiles } from "@/lib/ideas/members";
import { ScheduledTicketBadge, TicketPriorityBadge, TicketStatusBadge } from "../../../agent-badges";
import { JobRow } from "../../job-row";
import { loadAgentPage } from "../../load-agent";
import { JobLog } from "./job-log";
import { RunJobButton } from "./run-job-button";
import { AgentTicketStatusControl, DeleteAgentTicketButton, EditAgentTicketButton } from "./ticket-controls";

type Params = Promise<{ id: string; number: string }>;

/** Starting a job (sandbox + clone, or a long Muse call) can take a while. */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function loadTicketPage(params: Params) {
  const { id, number } = await params;
  const parsedNumber = Number.parseInt(number, 10);
  if (!Number.isInteger(parsedNumber) || parsedNumber < 1) {
    return null;
  }
  const context = await loadAgentPage(id);
  if (!context) {
    return null;
  }
  const ticket = await getAgentTicket(context.agent.id, parsedNumber);
  return ticket ? { context, ticket } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const loaded = await loadTicketPage(params);
  if (!loaded) {
    return { title: "Ticket" };
  }
  return { title: `${agentTicketKey(loaded.context.agent.name, loaded.ticket.number)} · ${loaded.ticket.title}` };
}

export default async function AgentTicketPage({ params }: { params: Params }) {
  const loaded = await loadTicketPage(params);
  if (!loaded) {
    notFound();
  }
  const { context, ticket } = loaded;
  const { agent } = context;
  const storedJobs = await listAgentJobsForTicket(ticket.id);
  const jobs = await Promise.all(storedJobs.map((job) => reconcileStaleJob(job)));
  const latestJob = jobs[0] ?? null;
  const latestEvents = latestJob ? await listAgentJobEvents(latestJob.id, FIRST_EVENT_SEQUENCE) : [];
  const activeJob = jobs.find((job) => isJobActive(job.status)) ?? null;
  const profiles = await resolveMemberProfiles([
    ...(ticket.createdByClerkUserId ? [ticket.createdByClerkUserId] : []),
    ...jobs.flatMap((job) => (job.startedByClerkUserId ? [job.startedByClerkUserId] : [])),
  ]);
  const nameOf = (clerkUserId: string | null) =>
    clerkUserId ? (profiles.get(clerkUserId)?.name ?? "WeStride member") : null;
  const key = agentTicketKey(agent.name, ticket.number);
  const repoFullName = agent.repoOwner && agent.repoName ? `${agent.repoOwner}/${agent.repoName}` : null;

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={4}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Link href={agentPath(agent.id)} isStandalone>
                {agent.name}
              </Link>
              <Text type="supporting">/</Text>
              <Link href={agentTicketsPath(agent.id)} isStandalone>
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
                    {ticket.source === "SCHEDULE" ? <ScheduledTicketBadge /> : null}
                  </HStack>
                  <Heading level={1}>{ticket.title}</Heading>
                </VStack>
              </StackItem>
              {context.canWork ? (
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <RunJobButton
                    agentId={agent.id}
                    ticketId={ticket.id}
                    agentName={agent.name}
                    model={agent.model}
                    runsCode={context.runsCode}
                    repoFullName={repoFullName}
                    hasMetaConnection={context.hasMetaConnection}
                    hasComputeAccess={context.hasComputeAccess}
                    isDisabled={activeJob !== null || ticket.status === "DONE" || agent.status !== "ACTIVE"}
                    disabledReason={
                      activeJob
                        ? "The agent is already on this ticket."
                        : ticket.status === "DONE"
                          ? "This ticket is done."
                          : agent.status !== "ACTIVE"
                            ? "The agent is paused."
                            : undefined
                    }
                  />
                  <AgentTicketStatusControl ticket={ticket} />
                  <EditAgentTicketButton ticket={ticket} runsCode={context.runsCode} />
                  <DeleteAgentTicketButton ticket={ticket} />
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
                No description yet. Write what &ldquo;done&rdquo; looks like so the agent has a brief to work from.
              </Text>
            )}

            {latestJob ? (
              <>
                <Divider />
                <VStack gap={4}>
                  <HStack gap={3} vAlign="center" wrap="wrap">
                    <StackItem size="fill">
                      <Heading level={2}>Latest job</Heading>
                    </StackItem>
                    {jobs.length > 1 ? (
                      <Link href={agentJobsPath(agent.id)} isStandalone>
                        {`All ${jobs.length} jobs for this agent`}
                      </Link>
                    ) : null}
                  </HStack>
                  <JobLog
                    key={latestJob.id}
                    agentId={agent.id}
                    initial={toJobSnapshot(latestJob, latestEvents)}
                    canCancel={context.canWork}
                    defaultOpen={isJobActive(latestJob.status)}
                  />
                </VStack>
                {jobs.length > 1 ? (
                  <VStack gap={3}>
                    <Heading level={3}>Earlier jobs</Heading>
                    <List density="compact">
                      {jobs.slice(1).map((job) => (
                        <JobRow key={job.id} job={job} ticketKey={key} starterName={nameOf(job.startedByClerkUserId)} />
                      ))}
                    </List>
                  </VStack>
                ) : null}
              </>
            ) : null}

            <Divider />

            <MetadataList columns="multi" title="Details">
              <MetadataListItem label="Status">{TICKET_STATUS_LABELS[ticket.status]}</MetadataListItem>
              <MetadataListItem label="Priority">{TICKET_PRIORITY_LABELS[ticket.priority]}</MetadataListItem>
              <MetadataListItem label="Queued by">
                {ticket.source === "SCHEDULE" ? "The schedule" : (nameOf(ticket.createdByClerkUserId) ?? "WeStride member")}
              </MetadataListItem>
              <MetadataListItem label="Runs as">
                {context.runsCode && repoFullName ? `Muse Code in ${repoFullName}` : "A Muse report"}
              </MetadataListItem>
              <MetadataListItem label="Created">
                <Timestamp value={ticket.createdAt.toISOString()} format="date" />
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
