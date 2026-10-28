import { WestrideApiError } from "@westride/api-client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ListRow, ListSection } from "@/components/list";
import { ErrorState, LoadingState } from "@/components/request-state";
import { Tag } from "@/components/tag";
import { Text } from "@/components/text";
import { api } from "@/lib/api";
import {
  DIFFICULTY_LABEL,
  DIFFICULTY_TONE,
  formatDuration,
  formatLessonCount,
} from "@/lib/format";
import { useRequest } from "@/lib/use-request";
import { colors, spacing } from "@/theme";

export default function TrackDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const loadTrack = useCallback(
    (signal: AbortSignal) => api.getAcademyTrack(slug, { signal }),
    [slug],
  );
  const {
    data: track,
    error,
    isLoading,
    isRefreshing,
    refresh,
  } = useRequest(loadTrack);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!track) {
    const notFound = error instanceof WestrideApiError && error.status === 404;
    return notFound ? (
      <ErrorState
        title="Track not found"
        message="This track may have been renamed or removed."
        actionLabel="Back to tracks"
        onAction={() => router.dismissTo("/")}
      />
    ) : (
      <ErrorState
        title="Couldn't load this track"
        message={error?.message ?? "Something went wrong."}
        actionLabel="Try again"
        onAction={refresh}
      />
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refresh}
          tintColor={colors.accent}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.tags}>
          <Tag
            tone={DIFFICULTY_TONE[track.difficulty]}
            label={DIFFICULTY_LABEL[track.difficulty]}
          />
          <Tag label={track.category} />
        </View>
        <Text variant="title">{track.name}</Text>
        <Text>{track.description}</Text>
      </View>

      <ListSection title="At a glance">
        <ListRow label="Difficulty" value={DIFFICULTY_LABEL[track.difficulty]} />
        <ListRow
          label="Time to complete"
          value={formatDuration(track.estimatedDurationMinutes)}
        />
        <ListRow label="Lessons" value={String(track.lessonCount)} />
        <ListRow label="Completion badge" value={track.achievementTitle} />
      </ListSection>

      {track.prerequisites.length > 0 ? (
        <ListSection title="Before you start">
          {track.prerequisites.map((prerequisite) => (
            <ListRow
              key={prerequisite.slug}
              label={prerequisite.name}
              href={{
                pathname: "/tracks/[slug]",
                params: { slug: prerequisite.slug },
              }}
            />
          ))}
        </ListSection>
      ) : null}

      <ListSection title="What you'll learn">
        {track.learningObjectives.map((objective) => (
          <ListRow key={objective} leading="•" label={objective} />
        ))}
      </ListSection>

      {track.lessons.length > 0 ? (
        <ListSection title="Lessons">
          {track.lessons.map((lesson, index) => (
            <ListRow
              key={lesson.id}
              leading={String(index + 1)}
              label={lesson.name}
            />
          ))}
        </ListSection>
      ) : (
        <View style={styles.section}>
          <Text variant="heading">Lessons</Text>
          <Text variant="supporting">
            Lessons are on the way. This track will have{" "}
            {formatLessonCount(track.lessonCount)}.
          </Text>
        </View>
      )}

      {track.tags.length > 0 ? (
        <View style={styles.section}>
          <Text variant="heading">Topics</Text>
          <View style={styles.tags}>
            {track.tags.map((tag) => (
              <Tag key={tag} label={tag} />
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing(6),
    padding: spacing(4),
    paddingBottom: spacing(10),
  },
  hero: {
    gap: spacing(3),
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(2),
  },
  section: {
    gap: spacing(2),
  },
});
