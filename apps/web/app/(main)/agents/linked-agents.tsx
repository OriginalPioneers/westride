import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { describeSchedule, totalTickets, type AgentWithDetails } from "@westride/db/agents";
import { AGENT_STATUS_LABELS, agentPath, agentsPath } from "@/lib/agents/labels";
import { formatMicrosAsUsd } from "@/lib/idea-factory/pricing";

/** The agents tied to a project or idea, as a short section on its page. */
export function LinkedAgents({ agents }: { agents: AgentWithDetails[] }) {
  if (agents.length === 0) {
    return null;
  }
  return (
    <VStack gap={3}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <Heading level={2}>Agents</Heading>
        </StackItem>
        <AgentStudioLink />
      </HStack>
      <LinkedAgentList agents={agents} />
    </VStack>
  );
}

export function AgentStudioLink() {
  return (
    <Link href={agentsPath()} isStandalone>
      Agent Studio
    </Link>
  );
}

/** One row per agent: its name, status, schedule, open tickets, and spend. */
export function LinkedAgentList({ agents }: { agents: AgentWithDetails[] }) {
  return (
    <VStack gap={2}>
      {agents.map((agent) => {
        const open = totalTickets(agent.ticketCounts) - agent.ticketCounts.DONE;
        return (
          <HStack key={agent.id} gap={2} vAlign="center" wrap="wrap">
            <Link href={agentPath(agent.id)} isStandalone>
              {agent.name}
            </Link>
            <Text type="supporting">
              {AGENT_STATUS_LABELS[agent.status]}
              {agent.schedule !== "NONE" ? ` · ${describeSchedule(agent)}` : ""}
              {agent.status === "ACTIVE" && agent.nextRunAt ? (
                <>
                  {" · next "}
                  <Timestamp value={agent.nextRunAt.toISOString()} format="relative" />
                </>
              ) : null}
              {` · ${open} open ${open === 1 ? "ticket" : "tickets"}`}
              {agent.usage.jobs > 0 ? ` · ${formatMicrosAsUsd(agent.usage.estimatedCostMicros)} spent` : ""}
            </Text>
          </HStack>
        );
      })}
    </VStack>
  );
}
