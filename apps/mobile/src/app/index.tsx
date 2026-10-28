import { FlatList, StyleSheet, View } from "react-native";
import { ErrorState, LoadingState } from "@/components/request-state";
import { Text } from "@/components/text";
import { TrackCard } from "@/components/track-card";
import { api } from "@/lib/api";
import { useRequest } from "@/lib/use-request";
import { spacing } from "@/theme";

const loadTracks = (signal: AbortSignal) => api.listAcademyTracks({ signal });

export default function HomeScreen() {
  const {
    data: tracks,
    error,
    isLoading,
    isRefreshing,
    refresh,
  } = useRequest(loadTracks);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!tracks) {
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
    <FlatList
      data={tracks}
      keyExtractor={(track) => track.id}
      renderItem={({ item }) => <TrackCard track={item} />}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text variant="title">Academy tracks</Text>
          <Text variant="supporting">
            A path from AI fundamentals to launching your own product.
          </Text>
        </View>
      }
      ListEmptyComponent={<Text variant="supporting">No tracks yet.</Text>}
      refreshing={isRefreshing}
      onRefresh={refresh}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: {
    padding: spacing(4),
    paddingBottom: spacing(10),
  },
  header: {
    gap: spacing(1),
    marginBottom: spacing(4),
  },
  separator: {
    height: spacing(3),
  },
});
