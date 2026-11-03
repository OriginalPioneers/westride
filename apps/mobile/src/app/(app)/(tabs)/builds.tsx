import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { ProjectCard } from "@/components/project-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/request-state";
import { ListScreen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { useApi } from "@/lib/api-context";
import { useRequest } from "@/lib/use-request";
import { spacing } from "@/theme";

type BuildsFilter = "mine" | "all";

const FILTERS: { value: BuildsFilter; label: string }[] = [
  { value: "mine", label: "Yours" },
  { value: "all", label: "Discover" },
];

export default function BuildsScreen() {
  const api = useApi();
  const router = useRouter();
  const [view, setView] = useState<BuildsFilter>("mine");
  const load = useCallback(
    (signal: AbortSignal) =>
      api.listProjects(view === "mine" ? { mine: true } : undefined, { signal }),
    [api, view],
  );
  const { data, error, isLoading, isRefreshing, refresh } = useRequest(load);

  if (isLoading && !data) {
    return <LoadingState />;
  }

  if (!data) {
    return (
      <ErrorState
        title="Couldn't load builds"
        message={error?.message ?? "Something went wrong."}
        actionLabel="Try again"
        onAction={refresh}
      />
    );
  }

  return (
    <ListScreen
      data={data}
      keyExtractor={(project) => project.id}
      renderItem={(project) => <ProjectCard project={project} />}
      refreshing={isRefreshing}
      onRefresh={refresh}
      header={
        <View style={styles.header}>
          <Text variant="title">Build Studio</Text>
          <Text variant="supporting">
            Turn an idea into working software: tickets, milestones, and the repo.
          </Text>
          <Segmented options={FILTERS} value={view} onChange={setView} />
          <Button label="New build" onPress={() => router.push("/builds/new")} />
        </View>
      }
      empty={
        <EmptyState
          title={view === "mine" ? "No builds of yours yet" : "No builds yet"}
          message={
            view === "mine"
              ? "Start a project from an idea, or open one to track tickets and agents."
              : "Public projects will show up here as people start building."
          }
          actionLabel="Start a build"
          onAction={() => router.push("/builds/new")}
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
