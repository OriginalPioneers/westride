import { WestrideApiError, type AgentStatus } from "@westride/api-client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { ListRow, ListSection } from "@/components/list";
import { ErrorState, LoadingState } from "@/components/request-state";
import { Tag } from "@/components/tag";
import { Text } from "@/components/text";
import { useApi } from "@/lib/api-context";
import { formatRelativeTime } from "@/lib/format";
import {
  AGENT_JOB_STATUS_LABELS,
  AGENT_STATUS_LABELS,
  AGENT_STATUS_TONE,
  TICKET_STATUS_LABELS,
} from "@/lib/labels";
import { useRequest } from "@/lib/use-request";
import { useColors } from "@/lib/theme-preference";
import { spacing } from "@/theme";

export default function AgentDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const [busy, setBusy] = useState(false);
  const loadAgent = useCallback(
    (signal: AbortSignal) => api.getAgent(id, { signal }),
    [api, id],
  );
  const loadTickets = useCallback(
    (signal: AbortSignal) => api.listAgentTickets(id, undefined, { signal }),
    [api, id],
  );
  const loadJobs = useCallback(
    (signal: AbortSignal) => api.listAgentJobs(id, { limit: 8 }, { signal }),
    [api, id],
  );
  const agentRequest = useRequest(loadAgent);
  const ticketsRequest = useRequest(loadTickets);
  const jobsRequest = useRequest(loadJobs);
  const agent = agentRequest.data;

  if (agentRequest.isLoading && !agent) {
    return <LoadingState />;
  }

  if (!agent) {
    const notFound = agentRequest.error instanceof WestrideApiError && agentRequest.error.status === 404;
    return (
      <ErrorState
        title={notFound ? "Agent not found" : "Couldn't load this agent"}
        message={
          notFound
            ? "It may have been archived or made private."
            : (agentRequest.error?.message ?? "Something went wrong.")
        }
        actionLabel={notFound ? "Back to agents" : "Try again"}
        onAction={notFound ? () => router.dismissTo("/agents") : agentRequest.refresh}
      />
    );
  }

  const current = agent;
  const canManage = current.viewerRole === "OWNER";

  async function setStatus(status: AgentStatus) {
    setBusy(true);
    try {
      await api.updateAgent(current.id, { status });
      agentRequest.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={
            agentRequest.isRefreshing || ticketsRequest.isRefreshing || jobsRequest.isRefreshing
          }
          onRefresh={() => {
            agentRequest.refresh();
            ticketsRequest.refresh();
            jobsRequest.refresh();
          }}
          tintColor={colors.accent}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.tags}>
          <Tag tone={AGENT_STATUS_TONE[agent.status]} label={AGENT_STATUS_LABELS[agent.status]} />
          <Tag label={agent.isPublic ? "Public" : "Private"} />
        </View>
        <Text variant="title">{agent.name}</Text>
        <Text>{agent.description}</Text>
        <Text variant="label">
          {agent.schedule.summary} · {agent.activeJobs} running · Updated{" "}
          {formatRelativeTime(agent.updatedAt)}
        </Text>
      </View>

      {canManage && agent.status !== "ARCHIVED" ? (
        <View style={styles.actions}>
          {agent.status === "ACTIVE" ? (
            <Button
              label="Pause agent"
              loading={busy}
              onPress={() => void setStatus("PAUSED")}
              variant="secondary"
            />
          ) : (
            <Button
              label="Resume agent"
              loading={busy}
              onPress={() => void setStatus("ACTIVE")}
            />
          )}
        </View>
      ) : null}

      {agent.idea ? (
        <ListSection title="Idea">
          <ListRow
            label={agent.idea.name}
            href={{ pathname: "/ideas/[id]", params: { id: agent.idea.id } }}
          />
        </ListSection>
      ) : null}

      {agent.project ? (
        <ListSection title="Build">
          <ListRow
            label={agent.project.name}
            href={{ pathname: "/builds/[id]", params: { id: agent.project.id } }}
          />
        </ListSection>
      ) : null}

      <ListSection title="Tickets">
        {ticketsRequest.data && ticketsRequest.data.length > 0 ? (
          ticketsRequest.data.map((ticket) => (
            <ListRow
              key={ticket.id}
              leading={ticket.key}
              label={ticket.title}
              value={TICKET_STATUS_LABELS[ticket.status]}
            />
          ))
        ) : (
          <ListRow
            label={ticketsRequest.error ? "Couldn't load tickets" : "No tickets yet"}
          />
        )}
      </ListSection>

      <ListSection title="Recent jobs">
        {jobsRequest.data && jobsRequest.data.length > 0 ? (
          jobsRequest.data.map((job) => (
            <ListRow
              key={job.id}
              label={job.ticketTitle}
              value={AGENT_JOB_STATUS_LABELS[job.status]}
            />
          ))
        ) : (
          <ListRow label={jobsRequest.error ? "Couldn't load jobs" : "No jobs yet"} />
        )}
      </ListSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing(5),
    padding: spacing(4),
    paddingBottom: spacing(12),
  },
  hero: {
    gap: spacing(3),
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(2),
  },
  actions: {
    gap: spacing(2),
  },
});
