import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { ReactNode } from "react";
import { agentsPath } from "@/lib/agents/labels";
import { AgentStatusBadge, ScheduleBadge } from "../agent-badges";
import { AgentNav, type AgentSection } from "./agent-nav";
import type { AgentPageContext } from "./load-agent";

/** The top of every agent page: crumb, name, status, and the section tabs. */
export function AgentHeader({
  context,
  section,
  actions,
}: {
  context: AgentPageContext;
  section: AgentSection;
  actions?: ReactNode;
}) {
  const { agent } = context;
  return (
    <VStack gap={4}>
      <Link href={agentsPath()} isStandalone>
        All agents
      </Link>
      <HStack gap={4} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <VStack gap={2}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <AgentStatusBadge status={agent.status} />
              <ScheduleBadge schedule={agent.schedule} />
              {!agent.isPublic ? (
                <Text type="supporting">Private · visible to the owner and linked teams</Text>
              ) : null}
            </HStack>
            <Heading level={1}>{agent.name}</Heading>
          </VStack>
        </StackItem>
        {actions ? (
          <HStack gap={2} vAlign="center" wrap="wrap">
            {actions}
          </HStack>
        ) : null}
      </HStack>
      <AgentNav
        agentId={agent.id}
        selected={section}
        openTicketCount={context.openTicketCount}
        canEdit={context.isOwner}
      />
    </VStack>
  );
}
