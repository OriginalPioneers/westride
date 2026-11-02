import type { Metadata } from "next";
import { after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@astryxdesign/core/Button";
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
  listAgentStatusOptions,
  sumUsageForPayer,
  type AgentWithDetails,
} from "@westride/db/agents";
import {
  AGENT_VIEW_LABELS,
  agentsCollectionPath,
  resolveAgentCollection,
  toAgentFilters,
  type AgentCollection,
} from "@/lib/agents/filters";
import { AGENT_STATUS_HINTS, AGENT_STATUS_LABELS } from "@/lib/agents/labels";
import { tickSchedulesIfDue } from "@/lib/agents/schedule";
import { signInPath } from "@/lib/auth-paths";
import { isAgentRunnerConfigured } from "@/lib/build/agent/config";
import {
  readCollectionFilterValues,
  type CollectionFilterValues,
} from "@/lib/collections/filters";
import { formatMicrosAsUsd, formatTokens } from "@/lib/idea-factory/pricing";
import { AgentCard } from "./agent-card";
import { AgentCollectionTabs, AgentSearchBar } from "./agent-filters";
import { CreateAgentButton, CreateAgentCard, CreateAgentProvider } from "./create-agent-button";

export const metadata: Metadata = {
  title: "AI Agent Fleet",
};

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const VIEW_DESCRIPTIONS = {
  mine: "Standing Muse agents you own, with their own backlog, schedule, and spend.",
  all: "Every agent you can see. Point one at a repository and it ships pull requests; without one, it writes reports.",
} as const;

function collectionHeading(collection: AgentCollection): {
  title: string;
  description: string;
} {
  switch (collection.kind) {
    case "search":
      return {
        title: `Results for “${collection.query}”`,
        description: "Every agent you can see that matches.",
      };
    case "status":
      return {
        title: AGENT_STATUS_LABELS[collection.status],
        description: AGENT_STATUS_HINTS[collection.status],
      };
    case "view":
      return {
        title: AGENT_VIEW_LABELS[collection.view],
        description: VIEW_DESCRIPTIONS[collection.view],
      };
  }
}

function signInHref(values: CollectionFilterValues): string {
  return `${signInPath}?redirect_url=${encodeURIComponent(agentsCollectionPath(values))}`;
}

function CollectionEmptyState({
  collection,
  values,
  isSignedIn,
}: {
  collection: AgentCollection;
  values: CollectionFilterValues;
  isSignedIn: boolean;
}) {
  if (collection.kind === "search") {
    return (
      <EmptyState
        title="No agents match"
        description="Try another word, or browse a collection below the search bar."
        actions={
          <Button label="Clear search" href={agentsCollectionPath({ ...values, q: "" })} />
        }
      />
    );
  }
  if (collection.kind === "status") {
    return (
      <EmptyState
        title={`No ${AGENT_STATUS_LABELS[collection.status].toLowerCase()} agents`}
        description="Pick another status, or create an agent of your own."
        actions={<CreateAgentButton variant="secondary" />}
      />
    );
  }
  if (collection.view === "mine" && !isSignedIn) {
    return (
      <EmptyState
        title="Sign in to see your agents"
        description="Your own agents, including private ones, show up here once you are signed in."
        actions={<Button label="Sign in" href={signInHref(values)} />}
      />
    );
  }
  return (
    <EmptyState
      title="No agents yet"
      description="Create one for the work you keep coming back to: release notes, dependency checks, weekly research, triage. Tie it to a project or idea if it belongs to one."
      actions={<CreateAgentButton variant="secondary" />}
    />
  );
}

function AgentGrid({
  agents,
  hasCreateTile,
}: {
  agents: AgentWithDetails[];
  /** Leads the grid with the "New agent" tile. */
  hasCreateTile: boolean;
}) {
  return (
    <Grid columns={{ minWidth: 320, max: 3 }} gap={4}>
      {hasCreateTile ? <CreateAgentCard /> : null}
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </Grid>
  );
}

export default async function AgentFleetPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [{ userId }, params] = await Promise.all([auth(), searchParams]);
  const viewer = { clerkUserId: userId };
  const isSignedIn = userId !== null;
  const values = readCollectionFilterValues(params);
  const collection = resolveAgentCollection(values, isSignedIn);

  const [agents, statuses, links, spend] = await Promise.all([
    listAgents(viewer, toAgentFilters(values, isSignedIn)),
    listAgentStatusOptions(viewer),
    userId ? listAgentLinkOptions(userId) : Promise.resolve(null),
    userId ? sumUsageForPayer(userId) : Promise.resolve(EMPTY_USAGE_TOTALS),
  ]);
  after(tickSchedulesIfDue);

  const heading = collectionHeading(collection);
  const active = agents.filter((agent) => agent.status === "ACTIVE").length;
  const scheduled = agents.filter(
    (agent) => agent.status === "ACTIVE" && agent.schedule !== "NONE",
  ).length;
  const countLabel = `${agents.length} ${agents.length === 1 ? "agent" : "agents"} · ${active} active · ${scheduled} scheduled`;
  const spendLabel =
    userId && spend.jobs > 0
      ? `You have paid for ${spend.jobs} ${spend.jobs === 1 ? "job" : "jobs"} · ${formatTokens(spend.totalTokens)} tokens · ${formatMicrosAsUsd(spend.estimatedCostMicros)}`
      : null;
  // Your Agents always leads with the "New agent" tile, so a signed-in
  // member with no agents yet sees the tile rather than an empty state.
  const hasCreateTile =
    isSignedIn && collection.kind === "view" && collection.view === "mine";

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
            <VStack gap={4}>
              <AgentSearchBar values={values} />
              <AgentCollectionTabs values={values} isSignedIn={isSignedIn} statuses={statuses} />
            </VStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <HStack gap={3} vAlign="end" wrap="wrap">
                <StackItem size="fill">
                  <VStack gap={1}>
                    {/* The collection is the page's heading; there is no title block. */}
                    <Heading level={2} accessibilityLevel={1}>
                      {heading.title}
                    </Heading>
                    <Text type="supporting">{heading.description}</Text>
                  </VStack>
                </StackItem>
                <VStack gap={0} hAlign="end">
                  {agents.length > 0 ? (
                    <Text type="supporting" hasTabularNumbers>
                      {countLabel}
                    </Text>
                  ) : null}
                  {spendLabel ? (
                    <Text type="supporting" hasTabularNumbers>
                      {spendLabel}
                    </Text>
                  ) : null}
                </VStack>
              </HStack>

              {agents.length === 0 && !hasCreateTile ? (
                <CollectionEmptyState
                  collection={collection}
                  values={values}
                  isSignedIn={isSignedIn}
                />
              ) : (
                <AgentGrid agents={agents} hasCreateTile={hasCreateTile} />
              )}
            </VStack>
          </LayoutContent>
        }
      />
    </CreateAgentProvider>
  );
}
