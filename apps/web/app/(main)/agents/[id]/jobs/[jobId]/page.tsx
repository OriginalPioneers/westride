import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import {
  agentTicketKey,
  getAgentJob,
  getAgentTicketById,
  isJobActive,
  listAgentJobEvents,
} from "@westride/db/agents";
import { reconcileStaleJob } from "@/lib/agents/finish";
import {
  AGENT_JOB_KIND_HINTS,
  AGENT_JOB_TRIGGER_LABELS,
  agentJobsPath,
  agentPath,
  agentTicketPath,
} from "@/lib/agents/labels";
import { toJobSnapshot } from "@/lib/agents/snapshot";
import { FIRST_EVENT_SEQUENCE } from "@/lib/agents/start";
import { formatMicrosAsUsd, formatTokens } from "@/lib/idea-factory/pricing";
import { resolveMemberProfiles } from "@/lib/ideas/members";
import { loadAgentPage } from "../../load-agent";
import { JobLog } from "../../tickets/[number]/job-log";

type Params = Promise<{ id: string; jobId: string }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";

async function loadJobPage(params: Params) {
  const { id, jobId } = await params;
  if (!UUID.test(jobId)) {
    return null;
  }
  const context = await loadAgentPage(id);
  if (!context) {
    return null;
  }
  const stored = await getAgentJob(jobId);
  if (!stored || stored.agentId !== context.agent.id) {
    return null;
  }
  return { context, job: await reconcileStaleJob(stored) };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const loaded = await loadJobPage(params);
  return { title: loaded ? `Job · ${loaded.job.ticketTitle}` : "Job" };
}

export default async function AgentJobPage({ params }: { params: Params }) {
  const loaded = await loadJobPage(params);
  if (!loaded) {
    notFound();
  }
  const { context, job } = loaded;
  const { agent } = context;
  const [events, ticket, profiles] = await Promise.all([
    listAgentJobEvents(job.id, FIRST_EVENT_SEQUENCE),
    job.ticketId ? getAgentTicketById(job.ticketId) : null,
    resolveMemberProfiles([job.paidByClerkUserId, ...(job.startedByClerkUserId ? [job.startedByClerkUserId] : [])]),
  ]);
  const nameOf = (clerkUserId: string | null) =>
    clerkUserId ? (profiles.get(clerkUserId)?.name ?? "WeStride member") : null;
  const key = ticket ? agentTicketKey(agent.name, ticket.number) : null;

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
              <Link href={agentJobsPath(agent.id)} isStandalone>
                Jobs
              </Link>
            </HStack>
            <HStack gap={4} vAlign="center" wrap="wrap">
              <StackItem size="fill">
                <VStack gap={1}>
                  <Heading level={1}>{job.ticketTitle}</Heading>
                  <Text type="supporting">
                    {ticket && key ? (
                      <>
                        Ticket <Link href={agentTicketPath(agent.id, ticket.number)}>{key}</Link>
                      </>
                    ) : (
                      "The ticket has since been deleted."
                    )}
                    {" · "}
                    {AGENT_JOB_KIND_HINTS[job.kind]}
                  </Text>
                </VStack>
              </StackItem>
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={8}>
            <JobLog
              key={job.id}
              agentId={agent.id}
              initial={toJobSnapshot(job, events)}
              canCancel={context.canWork}
              defaultOpen={isJobActive(job.status) || !job.summary}
            />

            <Divider />

            <MetadataList columns="multi" title="Usage and cost">
              <MetadataListItem label="Model">{job.model}</MetadataListItem>
              <MetadataListItem label="Model calls">{formatTokens(job.modelCalls)}</MetadataListItem>
              <MetadataListItem label="Input tokens">{formatTokens(job.inputTokens)}</MetadataListItem>
              <MetadataListItem label="Cached input">{formatTokens(job.cachedTokens)}</MetadataListItem>
              <MetadataListItem label="Output tokens">{formatTokens(job.outputTokens)}</MetadataListItem>
              <MetadataListItem label="Reasoning tokens">{formatTokens(job.reasoningTokens)}</MetadataListItem>
              <MetadataListItem label="Total tokens">{formatTokens(job.totalTokens)}</MetadataListItem>
              <MetadataListItem label="Estimated cost">{formatMicrosAsUsd(Number(job.estimatedCostMicros))}</MetadataListItem>
              <MetadataListItem label="Paid by">{nameOf(job.paidByClerkUserId)}</MetadataListItem>
            </MetadataList>

            <MetadataList columns="multi" title="Run">
              <MetadataListItem label="Trigger">
                {AGENT_JOB_TRIGGER_LABELS[job.trigger]}
                {job.startedByClerkUserId ? ` by ${nameOf(job.startedByClerkUserId)}` : ""}
              </MetadataListItem>
              <MetadataListItem label="Started">
                <Timestamp value={(job.startedAt ?? job.createdAt).toISOString()} format="date_time" />
              </MetadataListItem>
              <MetadataListItem label="Finished">
                {job.finishedAt ? <Timestamp value={job.finishedAt.toISOString()} format="date_time" /> : "Still running"}
              </MetadataListItem>
              {job.kind === "CODE" ? (
                <>
                  <MetadataListItem label="Repository">{job.repoFullName ?? "—"}</MetadataListItem>
                  <MetadataListItem label="Branch">{job.branch ?? "—"}</MetadataListItem>
                  <MetadataListItem label="Step budget">{job.maxSteps}</MetadataListItem>
                  <MetadataListItem label="Exit code">{job.exitCode ?? "—"}</MetadataListItem>
                  <MetadataListItem label="Head commit">{job.headSha ? job.headSha.slice(0, 10) : "—"}</MetadataListItem>
                  <MetadataListItem label="Muse session">{job.museSessionId ?? "—"}</MetadataListItem>
                </>
              ) : null}
            </MetadataList>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
