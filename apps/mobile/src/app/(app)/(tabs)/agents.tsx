import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AgentCard } from "@/components/agent-card";
import { Button } from "@/components/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/request-state";
import { ListScreen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { useApi } from "@/lib/api-context";
import { useRequest } from "@/lib/use-request";
import { spacing } from "@/theme";

type AgentsFilter = "mine" | "all";

const FILTERS: { value: AgentsFilter; label: string }[] = [
  { value: "mine", label: "Yours" },
  { value: "all", label: "Discover" },
];

export default function AgentsScreen() {
  const api = useApi();
  const router = useRouter();
  const [view, setView] = useState<AgentsFilter>("mine");
  const load = useCallback(
    (signal: AbortSignal) =>
      api.listAgents(view === "mine" ? { mine: true } : undefined, { signal }),
    [api, view],
  );
  const { data, error, isLoading, isRefreshing, refresh } = useRequest(load);

  if (isLoading && !data) {
    return <LoadingState />;
  }

  if (!data) {
    return (
      <ErrorState
        title="Couldn't load agents"
        message={error?.message ?? "Something went wrong."}
        actionLabel="Try again"
        onAction={refresh}
      />
    );
  }

  return (
    <ListScreen
      data={data}
      keyExtractor={(agent) => agent.id}
      renderItem={(agent) => <AgentCard agent={agent} />}
      refreshing={isRefreshing}
      onRefresh={refresh}
      header={
        <View style={styles.header}>
          <Text variant="title">Agent Studio</Text>
          <Text variant="supporting">
            Standing Muse agents with a backlog, a schedule, and a spend you can see.
          </Text>
          <Segmented options={FILTERS} value={view} onChange={setView} />
          <Button label="New agent" onPress={() => router.push("/agents/new")} />
        </View>
      }
      empty={
        <EmptyState
          title={view === "mine" ? "No agents of yours yet" : "No agents yet"}
          message={
            view === "mine"
              ? "Create one, point it at a repository or a standing brief, and give it a first ticket."
              : "Public agents will show up here as the community launches them."
          }
          actionLabel="Create an agent"
          onAction={() => router.push("/agents/new")}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing(3),
  },
});
