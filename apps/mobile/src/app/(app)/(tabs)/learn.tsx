import { StyleSheet, View } from "react-native";
import { ErrorState, LoadingState } from "@/components/request-state";
import { ListScreen } from "@/components/screen";
import { Text } from "@/components/text";
import { TrackCard } from "@/components/track-card";
import { useApi } from "@/lib/api-context";
import { useRequest } from "@/lib/use-request";
import { useCallback } from "react";
import { spacing } from "@/theme";

export default function LearnScreen() {
  const api = useApi();
  const load = useCallback(
    (signal: AbortSignal) => api.listAcademyTracks({ signal }),
    [api],
  );
  const { data, error, isLoading, isRefreshing, refresh } = useRequest(load);

  if (isLoading && !data) {
    return <LoadingState />;
  }

  if (!data) {
    return (
      <ErrorState
        title="Couldn't load tracks"
        message={error?.message ?? "Something went wrong."}
        actionLabel="Try again"
        onAction={refresh}
      />
    );
  }

  return (
    <ListScreen
      data={data}
      keyExtractor={(track) => track.id}
      renderItem={(track) => <TrackCard track={track} />}
      refreshing={isRefreshing}
      onRefresh={refresh}
      header={
        <View style={styles.header}>
          <Text variant="title">Academy</Text>
          <Text variant="supporting">
            A path from AI fundamentals to launching your own product.
          </Text>
        </View>
      }
      empty={<Text variant="supporting">No tracks yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing(1),
  },
});
