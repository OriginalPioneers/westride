import type { Metadata } from "next";
import { after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import {
  EMPTY_USAGE_TOTALS,
  listAgentLinkOptions,
  listAgents,
  sumUsageForPayer,
} from "@westride/db/agents";
import { tickSchedulesIfDue } from "@/lib/agents/schedule";
import { isAgentRunnerConfigured } from "@/lib/build/agent/config";
import { formatMicrosAsUsd, formatTokens } from "@/lib/idea-factory/pricing";
import { AgentCard } from "./agent-card";
import { CreateAgentButton, CreateAgentProvider } from "./create-agent-button";

export const metadata: Metadata = {
  title: "Agent Studio",
};

export const dynamic = "force-dynamic";

export default async function AgentStudioPage() {
  const { userId } = await auth();
  const [agents, links, spend] = await Promise.all([
    listAgents({ clerkUserId: userId }),
    userId ? listAgentLinkOptions(userId) : Promise.resolve(null),
    userId ? sumUsageForPayer(userId) : Promise.resolve(EMPTY_USAGE_TOTALS),
  ]);
  after(tickSchedulesIfDue);

  const mine = userId ? agents.filter((agent) => agent.ownerClerkUserId === userId) : [];
  const others = agents.filter((agent) => !mine.includes(agent));
  const active = agents.filter((agent) => agent.status === "ACTIVE").length;
  const scheduled = agents.filter((agent) => agent.status === "ACTIVE" && agent.schedule !== "NONE").length;

  return (
    <CreateAgentProvider
      options={
        links
          ? { ideas: links.ideas, projects: links.projects, canRunCode: isAgentRunnerConfigured() }
          : null
      }
    >
      <Layout
        contentWidth={1120}
        header={
          <LayoutHeader hasDivider>
            <HStack gap={4} vAlign="center" wrap="wrap">
              <StackItem size="fill">
                <VStack gap={1}>
                  <Heading level={1}>Agent Studio</Heading>
                  <Text type="supporting">
                    Standing Muse agents with their own backlog, schedule, and spend. Point one
                    at a repository and it ships pull requests; without one, it writes reports.
                  </Text>
                </VStack>
              </StackItem>
              <HStack gap={3} vAlign="center" wrap="wrap">
                {agents.length > 0 ? (
                  <Text type="supporting" hasTabularNumbers>
                    {`${agents.length} ${agents.length === 1 ? "agent" : "agents"} · ${active} active · ${scheduled} scheduled`}
                  </Text>
                ) : null}
                {userId && spend.jobs > 0 ? (
                  <Text type="supporting" hasTabularNumbers>
                    {`You have paid for ${spend.jobs} ${spend.jobs === 1 ? "job" : "jobs"} · ${formatTokens(spend.totalTokens)} tokens · ${formatMicrosAsUsd(spend.estimatedCostMicros)}`}
                  </Text>
                ) : null}
                <CreateAgentButton />
              </HStack>
            </HStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            {agents.length === 0 ? (
              <EmptyState
                title="No agents yet"
                description="Create one for the work you keep coming back to: release notes, dependency checks, weekly research, triage. Tie it to a project or idea if it belongs to one."
                actions={<CreateAgentButton variant="secondary" />}
              />
            ) : (
              <VStack gap={8}>
                {mine.length > 0 ? (
                  <VStack gap={4}>
                    <Heading level={2}>Your agents</Heading>
                    <Grid columns={{ minWidth: 300, max: 3 }} gap={4}>
                      {mine.map((agent) => (
                        <AgentCard key={agent.id} agent={agent} />
                      ))}
                    </Grid>
                  </VStack>
                ) : null}

                {mine.length > 0 && others.length > 0 ? <Divider /> : null}

                {others.length > 0 ? (
                  <VStack gap={4}>
                    <Heading level={2}>{mine.length > 0 ? "Other agents" : "All agents"}</Heading>
                    <Grid columns={{ minWidth: 300, max: 3 }} gap={4}>
                      {others.map((agent) => (
                        <AgentCard key={agent.id} agent={agent} />
                      ))}
                    </Grid>
                  </VStack>
                ) : null}
              </VStack>
            )}
          </LayoutContent>
        }
      />
    </CreateAgentProvider>
  );
}
