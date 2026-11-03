import type { IdeaView } from "@westride/api-client";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { IdeaCard } from "@/components/idea-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/request-state";
import { ListScreen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { useApi } from "@/lib/api-context";
import { useRequest } from "@/lib/use-request";
import { IDEA_VIEW_LABELS } from "@/lib/labels";
import { spacing } from "@/theme";

type IdeasFilter = IdeaView | "all";

const FILTERS: { value: IdeasFilter; label: string }[] = [
  { value: "mine", label: IDEA_VIEW_LABELS.mine },
  { value: "following", label: IDEA_VIEW_LABELS.following },
  { value: "featured", label: IDEA_VIEW_LABELS.featured },
  { value: "all", label: IDEA_VIEW_LABELS.all },
];

export default function IdeasScreen() {
  const api = useApi();
  const router = useRouter();
  const [view, setView] = useState<IdeasFilter>("mine");
  const load = useCallback(
    (signal: AbortSignal) =>
      api.listIdeas(view === "all" ? undefined : { view }, { signal }),
    [api, view],
  );
  const { data, error, isLoading, isRefreshing, refresh } = useRequest(load);

  if (isLoading && !data) {
    return <LoadingState />;
  }

  if (!data) {
    return (
      <ErrorState
        title="Couldn't load ideas"
        message={error?.message ?? "Something went wrong."}
        actionLabel="Try again"
        onAction={refresh}
      />
    );
  }

  return (
    <ListScreen
      data={data}
      keyExtractor={(idea) => idea.id}
      renderItem={(idea) => <IdeaCard idea={idea} />}
      refreshing={isRefreshing}
      onRefresh={refresh}
      header={
        <View style={styles.header}>
          <Text variant="title">Idea Workshop</Text>
          <Text variant="supporting">
            Capture a spark, follow the ones that matter, and take them into a build.
          </Text>
          <Segmented options={FILTERS} value={view} onChange={setView} />
          <Button label="New idea" onPress={() => router.push("/ideas/new")} />
        </View>
      }
      empty={
        <EmptyState
          title={emptyTitle(view)}
          message={emptyMessage(view)}
          actionLabel="Start an idea"
          onAction={() => router.push("/ideas/new")}
        />
      }
    />
  );
}

function emptyTitle(view: IdeasFilter): string {
  switch (view) {
    case "mine":
      return "No ideas of yours yet";
    case "following":
      return "You are not following any ideas";
    case "featured":
      return "Nothing featured yet";
    case "all":
      return "No ideas yet";
  }
}

function emptyMessage(view: IdeasFilter): string {
  switch (view) {
    case "mine":
      return "Start one from a sentence. You can invite a team once it exists.";
    case "following":
      return "Open Discover or Best of and follow an idea to keep it here.";
    case "featured":
      return "The WeStride team has not picked any ideas to watch yet.";
    case "all":
      return "Be the first to put an idea in the workshop.";
  }
}

const styles = StyleSheet.create({
  header: {
    gap: spacing(3),
  },
});
