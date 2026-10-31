import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { AgentJobTrigger } from "@westride/db";
import {
  sumAgentUsageByDay,
  sumAgentUsageByModel,
  sumAgentUsageByTrigger,
  type UsageBreakdownRow,
} from "@westride/db/agents";
import { AGENT_JOB_TRIGGER_LABELS } from "@/lib/agents/labels";
import { formatMicrosAsUsd, formatTokens, getMuseModel } from "@/lib/idea-factory/pricing";
import { AgentHeader } from "../agent-header";
import { loadAgentPage } from "../load-agent";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const context = await loadAgentPage((await params).id);
  return { title: context ? `Usage · ${context.agent.name}` : "Usage" };
}

function UsageRows({ rows, labelFor }: { rows: UsageBreakdownRow[]; labelFor: (key: string) => string }) {
  return (
    <List density="compact">
      {rows.map((row) => (
        <ListItem
          key={row.key}
          label={labelFor(row.key)}
          description={`${row.jobs} ${row.jobs === 1 ? "job" : "jobs"} · ${formatTokens(row.modelCalls)} calls · ${formatTokens(row.inputTokens)} in (${formatTokens(row.cachedTokens)} cached) · ${formatTokens(row.outputTokens)} out`}
          endContent={
            <HStack gap={3} vAlign="center">
              <Text type="supporting" hasTabularNumbers>
                {`${formatTokens(row.totalTokens)} tokens`}
              </Text>
              <Text hasTabularNumbers>{formatMicrosAsUsd(row.estimatedCostMicros)}</Text>
            </HStack>
          }
        />
      ))}
    </List>
  );
}

export default async function AgentUsagePage({ params }: { params: Params }) {
  const { id } = await params;
  const context = await loadAgentPage(id);
  if (!context) {
    notFound();
  }
  const { agent } = context;
  const [byModel, byTrigger, byDay] = await Promise.all([
    sumAgentUsageByModel(agent.id),
    sumAgentUsageByTrigger(agent.id),
    sumAgentUsageByDay(agent.id, 30),
  ]);
  const { usage } = agent;

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <AgentHeader context={context} section="usage" />
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          {usage.jobs === 0 ? (
            <EmptyState
              title="No usage yet"
              description="Tokens and estimated spend are recorded per job, from Muse Code's own usage report or the Model API response. Costs use WeStride's price list and are estimates."
            />
          ) : (
            <VStack gap={8}>
              <MetadataList columns="multi" title="All time">
                <MetadataListItem label="Jobs">{usage.jobs}</MetadataListItem>
                <MetadataListItem label="Model calls">{formatTokens(usage.modelCalls)}</MetadataListItem>
                <MetadataListItem label="Input tokens">{formatTokens(usage.inputTokens)}</MetadataListItem>
                <MetadataListItem label="Cached input">{formatTokens(usage.cachedTokens)}</MetadataListItem>
                <MetadataListItem label="Output tokens">{formatTokens(usage.outputTokens)}</MetadataListItem>
                <MetadataListItem label="Reasoning tokens">{formatTokens(usage.reasoningTokens)}</MetadataListItem>
                <MetadataListItem label="Total tokens">{formatTokens(usage.totalTokens)}</MetadataListItem>
                <MetadataListItem label="Estimated spend">{formatMicrosAsUsd(usage.estimatedCostMicros)}</MetadataListItem>
              </MetadataList>
              <Text type="supporting">
                Estimates use WeStride&apos;s price list per model; cached input is priced at the cached rate. The
                member whose Meta key ran each job is billed by Meta, not by WeStride.
              </Text>

              <Divider />

              <VStack gap={3}>
                <Heading level={2}>By model</Heading>
                <UsageRows rows={byModel} labelFor={(key) => getMuseModel(key)?.label ?? key} />
              </VStack>

              <VStack gap={3}>
                <Heading level={2}>By trigger</Heading>
                <UsageRows
                  rows={byTrigger}
                  labelFor={(key) => AGENT_JOB_TRIGGER_LABELS[key as AgentJobTrigger] ?? key}
                />
              </VStack>

              <VStack gap={3}>
                <Heading level={2}>Last 30 days</Heading>
                {byDay.length === 0 ? (
                  <Text type="supporting">No jobs in the last 30 days.</Text>
                ) : (
                  <UsageRows rows={byDay} labelFor={(key) => key} />
                )}
              </VStack>
            </VStack>
          )}
        </LayoutContent>
      }
    />
  );
}
