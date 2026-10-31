import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@astryxdesign/core/Badge";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { listAgentLog, listAgentTickets } from "@westride/db/agents";
import { AGENT_LOG_KIND_LABELS, agentJobPath, agentTicketPath } from "@/lib/agents/labels";
import { resolveMemberProfiles } from "@/lib/ideas/members";
import { AgentHeader } from "../agent-header";
import { loadAgentPage } from "../load-agent";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

const KIND_VARIANT: Record<string, "neutral" | "blue" | "purple" | "green" | "orange"> = {
  agent: "neutral",
  ticket: "green",
  job: "purple",
  schedule: "blue",
  settings: "orange",
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const context = await loadAgentPage((await params).id);
  return { title: context ? `Log · ${context.agent.name}` : "Log" };
}

export default async function AgentLogPage({ params }: { params: Params }) {
  const { id } = await params;
  const context = await loadAgentPage(id);
  if (!context) {
    notFound();
  }
  const { agent } = context;
  const [entries, tickets] = await Promise.all([listAgentLog(agent.id, 300), listAgentTickets(agent.id)]);
  const profiles = await resolveMemberProfiles(
    entries.flatMap((entry) => (entry.actorClerkUserId ? [entry.actorClerkUserId] : [])),
  );
  const ticketsById = new Map(tickets.map((ticket) => [ticket.id, ticket]));

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <AgentHeader context={context} section="log" />
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          {entries.length === 0 ? (
            <EmptyState
              title="Nothing logged yet"
              description="Everything the agent and its team do shows up here: tickets queued, jobs started and finished, schedule changes, settings edits."
            />
          ) : (
            <VStack gap={3}>
              {entries.map((entry) => {
                const ticket = entry.ticketId ? ticketsById.get(entry.ticketId) : undefined;
                const actor = entry.actorClerkUserId
                  ? (profiles.get(entry.actorClerkUserId)?.name ?? "WeStride member")
                  : null;
                return (
                  <HStack key={entry.id} gap={3} vAlign="start">
                    <Badge variant={KIND_VARIANT[entry.kind] ?? "neutral"} label={AGENT_LOG_KIND_LABELS[entry.kind] ?? entry.kind} />
                    <StackItem size="fill">
                      <VStack gap={0}>
                        <Text>{entry.message}</Text>
                        <Text type="supporting">
                          {actor ?? (entry.kind === "schedule" ? "The schedule" : agent.name)}
                          {ticket ? (
                            <>
                              {" · "}
                              <Link href={agentTicketPath(agent.id, ticket.number)}>{`#${ticket.number}`}</Link>
                            </>
                          ) : null}
                          {entry.jobId ? (
                            <>
                              {" · "}
                              <Link href={agentJobPath(agent.id, entry.jobId)}>job</Link>
                            </>
                          ) : null}
                        </Text>
                      </VStack>
                    </StackItem>
                    <Text type="supporting" hasTabularNumbers>
                      <Timestamp value={entry.createdAt.toISOString()} format="date_time" />
                    </Text>
                  </HStack>
                );
              })}
            </VStack>
          )}
        </LayoutContent>
      }
    />
  );
}
