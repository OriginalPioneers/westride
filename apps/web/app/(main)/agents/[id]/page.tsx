import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Markdown } from "@astryxdesign/core/Markdown";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import {
  TICKET_STATUSES,
  agentTicketKey,
  describeSchedule,
  listAgentJobs,
  listAgentLog,
  listAgentTickets,
  nextQueuedAgentTicket,
  totalTickets,
} from "@westride/db/agents";
import { reconcileStaleJob } from "@/lib/agents/finish";
import {
  AGENT_LOG_KIND_LABELS,
  TICKET_STATUS_LABELS,
  agentJobsPath,
  agentLogPath,
  agentSettingsPath,
  agentTicketPath,
  agentTicketsPath,
  agentUsagePath,
} from "@/lib/agents/labels";
import { tickSchedulesIfDue } from "@/lib/agents/schedule";
import { projectPath } from "@/lib/build/labels";
import { formatMicrosAsUsd, formatTokens } from "@/lib/idea-factory/pricing";
import { resolveMemberProfiles } from "@/lib/ideas/members";
import { ideaPath } from "@/lib/ideas/filters";
import { EntityImageMenu } from "../../entity-image-menu";
import { AgentHeader } from "./agent-header";
import { JobRow } from "./job-row";
import { loadAgentPage } from "./load-agent";
import { NewAgentTicketButton } from "./tickets/new-ticket-button";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

/** Muse image actions called from this page can take a minute or two. */
export const maxDuration = 180;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const context = await loadAgentPage((await params).id);
  return { title: context ? context.agent.name : "Agent" };
}

export default async function AgentOverviewPage({ params }: { params: Params }) {
  const { id } = await params;
  const context = await loadAgentPage(id);
  if (!context) {
    notFound();
  }
  after(tickSchedulesIfDue);
  const { agent } = context;
  const [storedJobs, tickets, log, nextTicket] = await Promise.all([
    listAgentJobs(agent.id, 5),
    listAgentTickets(agent.id),
    listAgentLog(agent.id, 8),
    nextQueuedAgentTicket(agent.id),
  ]);
  const jobs = await Promise.all(storedJobs.map((job) => reconcileStaleJob(job)));
  const profiles = await resolveMemberProfiles([
    agent.ownerClerkUserId,
    ...jobs.flatMap((job) => (job.startedByClerkUserId ? [job.startedByClerkUserId] : [])),
  ]);
  const ticketsById = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const total = totalTickets(agent.ticketCounts);
  const ownerName = profiles.get(agent.ownerClerkUserId)?.name ?? "WeStride member";
  const repo = agent.repoOwner && agent.repoName ? `${agent.repoOwner}/${agent.repoName}` : null;

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <AgentHeader
            context={context}
            section="overview"
            actions={
              context.canWork ? (
                <>
                  <NewAgentTicketButton agentId={agent.id} runsCode={context.runsCode} />
                  {context.isOwner ? (
                    <>
                      <EntityImageMenu
                        kind="agent"
                        id={agent.id}
                        name={agent.name}
                        imageUrl={agent.imageUrl}
                        hasMetaConnection={context.hasMetaConnection}
                      />
                      <Button label="Settings" variant="secondary" href={agentSettingsPath(agent.id)} />
                    </>
                  ) : null}
                </>
              ) : null
            }
          />
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={8}>
            {agent.status !== "ACTIVE" ? (
              <Banner
                status="info"
                title={agent.status === "PAUSED" ? "This agent is paused" : "This agent is archived"}
                description={
                  agent.status === "PAUSED"
                    ? "Its tickets are kept, but nothing runs until an owner resumes it."
                    : "Its log and spend are kept for the record. It no longer runs."
                }
              />
            ) : null}

            <Markdown headingLevelStart={2} contentWidth="100%">
              {agent.description}
            </Markdown>

            {agent.project || agent.idea ? (
              <Text type="supporting">
                {agent.project ? (
                  <>
                    Works on the project <Link href={projectPath(agent.project.id)}>{agent.project.name}</Link>
                    {agent.idea ? " and " : "."}
                  </>
                ) : null}
                {agent.idea ? (
                  <>
                    {agent.project ? "the idea " : "Works on the idea "}
                    <Link href={ideaPath(agent.idea.slug)}>{agent.idea.name}</Link>.
                  </>
                ) : null}
              </Text>
            ) : null}

            <Divider />

            <VStack gap={3}>
              <Heading level={2}>Schedule</Heading>
              {agent.schedule === "NONE" ? (
                <Text type="supporting">
                  Not scheduled. It works when someone runs a ticket.
                  {context.isOwner ? (
                    <>
                      {" "}
                      <Link href={agentSettingsPath(agent.id)}>Set a schedule</Link> to have it work on its own.
                    </>
                  ) : null}
                </Text>
              ) : (
                <MetadataList columns="multi">
                  <MetadataListItem label="Runs">{describeSchedule(agent)}</MetadataListItem>
                  <MetadataListItem label="Next run">
                    {agent.status === "ACTIVE" && agent.nextRunAt ? (
                      <Timestamp value={agent.nextRunAt.toISOString()} format="relative" />
                    ) : (
                      "Paused"
                    )}
                  </MetadataListItem>
                  <MetadataListItem label="Last run">
                    {agent.lastRunAt ? <Timestamp value={agent.lastRunAt.toISOString()} format="relative" /> : "Never"}
                  </MetadataListItem>
                  <MetadataListItem label="Will work on">
                    {nextTicket ? (
                      <Link href={agentTicketPath(agent.id, nextTicket.number)}>
                        {`${agentTicketKey(agent.name, nextTicket.number)} · ${nextTicket.title}`}
                      </Link>
                    ) : agent.standingTask.trim() ? (
                      `Standing task: ${agent.standingTask.split("\n")[0]}`
                    ) : (
                      "Nothing queued and no standing task"
                    )}
                  </MetadataListItem>
                </MetadataList>
              )}
            </VStack>

            <VStack gap={3}>
              <HStack gap={3} vAlign="center" wrap="wrap">
                <StackItem size="fill">
                  <Heading level={2}>Tickets</Heading>
                </StackItem>
                <Link href={agentTicketsPath(agent.id)} isStandalone>
                  All tickets
                </Link>
              </HStack>
              {total === 0 ? (
                <Text type="supporting">No tickets yet. Queue the first one and the agent has work to do.</Text>
              ) : (
                <List density="compact">
                  {TICKET_STATUSES.map((status) => (
                    <ListItem
                      key={status}
                      href={agentTicketsPath(agent.id, status)}
                      label={TICKET_STATUS_LABELS[status]}
                      endContent={
                        <Text type="supporting" hasTabularNumbers>
                          {agent.ticketCounts[status]}
                        </Text>
                      }
                    />
                  ))}
                </List>
              )}
            </VStack>

            <VStack gap={3}>
              <HStack gap={3} vAlign="center" wrap="wrap">
                <StackItem size="fill">
                  <Heading level={2}>Recent jobs</Heading>
                </StackItem>
                <Link href={agentJobsPath(agent.id)} isStandalone>
                  All jobs
                </Link>
              </HStack>
              {jobs.length === 0 ? (
                <Text type="supporting">No jobs yet. Open a ticket and run it.</Text>
              ) : (
                <List>
                  {jobs.map((job) => {
                    const ticket = job.ticketId ? ticketsById.get(job.ticketId) : undefined;
                    return (
                      <JobRow
                        key={job.id}
                        job={job}
                        ticketKey={ticket ? agentTicketKey(agent.name, ticket.number) : null}
                        starterName={
                          job.startedByClerkUserId ? (profiles.get(job.startedByClerkUserId)?.name ?? null) : null
                        }
                      />
                    );
                  })}
                </List>
              )}
            </VStack>

            <VStack gap={3}>
              <HStack gap={3} vAlign="center" wrap="wrap">
                <StackItem size="fill">
                  <Heading level={2}>Usage</Heading>
                </StackItem>
                <Link href={agentUsagePath(agent.id)} isStandalone>
                  Breakdown
                </Link>
              </HStack>
              <MetadataList columns="multi">
                <MetadataListItem label="Jobs">{agent.usage.jobs}</MetadataListItem>
                <MetadataListItem label="Model calls">{formatTokens(agent.usage.modelCalls)}</MetadataListItem>
                <MetadataListItem label="Tokens">{formatTokens(agent.usage.totalTokens)}</MetadataListItem>
                <MetadataListItem label="Estimated spend">
                  {formatMicrosAsUsd(agent.usage.estimatedCostMicros)}
                </MetadataListItem>
              </MetadataList>
            </VStack>

            <VStack gap={3}>
              <HStack gap={3} vAlign="center" wrap="wrap">
                <StackItem size="fill">
                  <Heading level={2}>Log</Heading>
                </StackItem>
                <Link href={agentLogPath(agent.id)} isStandalone>
                  Full log
                </Link>
              </HStack>
              {log.length === 0 ? (
                <Text type="supporting">Nothing yet.</Text>
              ) : (
                <List density="compact">
                  {log.map((entry) => (
                    <ListItem
                      key={entry.id}
                      label={entry.message}
                      description={AGENT_LOG_KIND_LABELS[entry.kind] ?? entry.kind}
                      endContent={
                        <Text type="supporting">
                          <Timestamp value={entry.createdAt.toISOString()} format="relative" />
                        </Text>
                      }
                    />
                  ))}
                </List>
              )}
            </VStack>

            <Divider />

            <MetadataList columns="multi" title="Details">
              <MetadataListItem label="Owner">{ownerName}</MetadataListItem>
              <MetadataListItem label="Model">{agent.model}</MetadataListItem>
              <MetadataListItem label="Step budget">{agent.maxSteps}</MetadataListItem>
              <MetadataListItem label="Repository">
                {repo && agent.repoHtmlUrl ? (
                  <Link href={agent.repoHtmlUrl} isExternalLink>
                    {repo}
                  </Link>
                ) : (
                  "None · jobs run as reports"
                )}
              </MetadataListItem>
              <MetadataListItem label="Jobs run as">
                {context.runsCode ? "Muse Code in a sandbox, ending in a pull request" : "Muse reports with web search"}
              </MetadataListItem>
              <MetadataListItem label="Created">
                <Timestamp value={agent.createdAt.toISOString()} format="date" />
              </MetadataListItem>
            </MetadataList>

            {agent.instructions.trim() ? (
              <VStack gap={3}>
                <Heading level={2}>Standing instructions</Heading>
                <Markdown headingLevelStart={3} contentWidth="100%" density="compact">
                  {agent.instructions}
                </Markdown>
              </VStack>
            ) : null}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
