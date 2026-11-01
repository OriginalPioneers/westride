import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { describeSchedule, totalTickets, type AgentWithDetails } from "@westride/db/agents";
import { agentPath } from "@/lib/agents/labels";
import { formatMicrosAsUsd, formatTokens } from "@/lib/idea-factory/pricing";
import { markdownExcerpt } from "@/lib/ideas/excerpt";
import { EntityImage } from "../entity-image";
import { AgentStatusBadge, ScheduleBadge } from "./agent-badges";

export function AgentCard({ agent }: { agent: AgentWithDetails }) {
  const excerpt = markdownExcerpt(agent.description);
  const open = totalTickets(agent.ticketCounts) - agent.ticketCounts.DONE;
  const links = [agent.project?.name, agent.idea?.name].filter((name): name is string => Boolean(name));
  const repo = agent.repoOwner && agent.repoName ? `${agent.repoOwner}/${agent.repoName}` : null;

  return (
    <Card>
      <VStack gap={3}>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <AgentStatusBadge status={agent.status} />
          <ScheduleBadge schedule={agent.schedule} />
          {agent.activeJobs > 0 ? <Text type="supporting">Working now</Text> : null}
          {!agent.isPublic ? <Text type="supporting">Private</Text> : null}
        </HStack>
        <HStack gap={3} vAlign="center">
          <EntityImage name={agent.name} imageUrl={agent.imageUrl} size={48} />
          <StackItem size="fill">
            <VStack gap={1}>
              <Heading level={3} maxLines={2}>
                <Link href={agentPath(agent.id)}>{agent.name}</Link>
              </Heading>
              {repo || links.length > 0 ? (
                <Text type="supporting" maxLines={1}>
                  {[repo, ...links].filter(Boolean).join(" · ")}
                </Text>
              ) : null}
            </VStack>
          </StackItem>
        </HStack>
        {excerpt ? <Text maxLines={3}>{excerpt}</Text> : null}
        <VStack gap={0}>
          <Text type="supporting">
            {open === 0 ? "No open tickets" : open === 1 ? "1 open ticket" : `${open} open tickets`}
            {" · "}
            {agent.usage.jobs === 0
              ? "No jobs yet"
              : `${agent.usage.jobs} ${agent.usage.jobs === 1 ? "job" : "jobs"} · ${formatTokens(agent.usage.totalTokens)} tokens · ${formatMicrosAsUsd(agent.usage.estimatedCostMicros)}`}
          </Text>
          {agent.status === "ACTIVE" && agent.nextRunAt ? (
            <Text type="supporting">
              {describeSchedule(agent)} · next <Timestamp value={agent.nextRunAt.toISOString()} format="relative" />
            </Text>
          ) : null}
        </VStack>
      </VStack>
    </Card>
  );
}
