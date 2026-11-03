import { WestrideApiError, type ProjectStatus } from "@westride/api-client";
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
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONE,
  TICKET_STATUS_LABELS,
} from "@/lib/labels";
import { useRequest } from "@/lib/use-request";
import { useColors } from "@/lib/theme-preference";
import { spacing } from "@/theme";

const NEXT_STATUS: Partial<Record<ProjectStatus, ProjectStatus>> = {
  PLANNING: "BUILDING",
  BUILDING: "LAUNCHED",
  PAUSED: "BUILDING",
};

export default function BuildDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const [busy, setBusy] = useState(false);
  const loadProject = useCallback(
    (signal: AbortSignal) => api.getProject(id, { signal }),
    [api, id],
  );
  const loadTickets = useCallback(
    (signal: AbortSignal) => api.listTickets(id, undefined, { signal }),
    [api, id],
  );
  const projectRequest = useRequest(loadProject);
  const ticketsRequest = useRequest(loadTickets);
  const project = projectRequest.data;
  const tickets = ticketsRequest.data;

  if (projectRequest.isLoading && !project) {
    return <LoadingState />;
  }

  if (!project) {
    const notFound = projectRequest.error instanceof WestrideApiError && projectRequest.error.status === 404;
    return (
      <ErrorState
        title={notFound ? "Build not found" : "Couldn't load this build"}
        message={
          notFound
            ? "It may have been made private or removed."
            : (projectRequest.error?.message ?? "Something went wrong.")
        }
        actionLabel={notFound ? "Back to builds" : "Try again"}
        onAction={notFound ? () => router.dismissTo("/builds") : projectRequest.refresh}
      />
    );
  }

  const current = project;
  const nextStatus = NEXT_STATUS[current.status];
  const canManage = current.viewerRole === "OWNER";

  async function updateStatus(status: ProjectStatus) {
    setBusy(true);
    try {
      await api.updateProject(current.id, { status });
      projectRequest.refresh();
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
          refreshing={projectRequest.isRefreshing || ticketsRequest.isRefreshing}
          onRefresh={() => {
            projectRequest.refresh();
            ticketsRequest.refresh();
          }}
          tintColor={colors.accent}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.tags}>
          <Tag
            tone={PROJECT_STATUS_TONE[project.status]}
            label={PROJECT_STATUS_LABELS[project.status]}
          />
          <Tag label={project.isPublic ? "Public" : "Private"} />
        </View>
        <Text variant="title">{project.name}</Text>
        <Text>{project.description}</Text>
        <Text variant="label">Updated {formatRelativeTime(project.updatedAt)}</Text>
      </View>

      {canManage ? (
        <View style={styles.actions}>
          {nextStatus ? (
            <Button
              label={`Mark as ${PROJECT_STATUS_LABELS[nextStatus].toLowerCase()}`}
              loading={busy}
              onPress={() => void updateStatus(nextStatus)}
            />
          ) : null}
          {project.status !== "PAUSED" && project.status !== "LAUNCHED" ? (
            <Button
              label="Pause"
              loading={busy}
              onPress={() => void updateStatus("PAUSED")}
              variant="secondary"
            />
          ) : null}
        </View>
      ) : null}

      {project.idea ? (
        <ListSection title="Idea">
          <ListRow
            label={project.idea.name}
            href={{ pathname: "/ideas/[id]", params: { id: project.idea.id } }}
          />
        </ListSection>
      ) : null}

      <ListSection title="Team">
        {project.members.map((member) => (
          <ListRow
            key={member.id}
            label={member.name}
            value={member.role === "OWNER" ? "Owner" : "Member"}
          />
        ))}
      </ListSection>

      {project.milestones.length > 0 ? (
        <ListSection title="Milestones">
          {project.milestones.map((milestone) => (
            <ListRow
              key={milestone.id}
              label={milestone.title}
              value={milestone.status}
            />
          ))}
        </ListSection>
      ) : null}

      <ListSection title="Tickets">
        {tickets && tickets.length > 0 ? (
          tickets.map((ticket) => (
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

      {project.agents.length > 0 ? (
        <ListSection title="Agents">
          {project.agents.map((agent) => (
            <ListRow
              key={agent.id}
              label={agent.name}
              value={agent.status}
              href={{ pathname: "/agents/[id]", params: { id: agent.id } }}
            />
          ))}
        </ListSection>
      ) : null}
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
