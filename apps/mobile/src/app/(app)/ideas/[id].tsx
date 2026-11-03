import { WestrideApiError } from "@westride/api-client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { ListRow, ListSection } from "@/components/list";
import { ErrorState, LoadingState } from "@/components/request-state";
import { Tag } from "@/components/tag";
import { Text } from "@/components/text";
import { useApi } from "@/lib/api-context";
import { formatCount, formatRelativeTime } from "@/lib/format";
import { IDEA_TYPE_LABELS, IDEA_TYPE_TONE } from "@/lib/labels";
import { useRequest } from "@/lib/use-request";
import { useColors } from "@/lib/theme-preference";
import { spacing } from "@/theme";

export default function IdeaDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const [busy, setBusy] = useState(false);
  const load = useCallback((signal: AbortSignal) => api.getIdea(id, { signal }), [api, id]);
  const { data: idea, error, isLoading, isRefreshing, refresh } = useRequest(load);

  if (isLoading && !idea) {
    return <LoadingState />;
  }

  if (!idea) {
    const notFound = error instanceof WestrideApiError && error.status === 404;
    return (
      <ErrorState
        title={notFound ? "Idea not found" : "Couldn't load this idea"}
        message={
          notFound
            ? "It may have been made private or removed."
            : (error?.message ?? "Something went wrong.")
        }
        actionLabel={notFound ? "Back to ideas" : "Try again"}
        onAction={notFound ? () => router.dismissTo("/") : refresh}
      />
    );
  }

  const current = idea;

  async function toggleFollow() {
    setBusy(true);
    try {
      if (current.isFollowing) {
        await api.unfollowIdea(current.id);
      } else {
        await api.followIdea(current.id);
      }
      refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.accent} />
      }
    >
      <View style={styles.hero}>
        <View style={styles.tags}>
          <Tag tone={IDEA_TYPE_TONE[idea.type]} label={IDEA_TYPE_LABELS[idea.type]} />
          {idea.isFeatured ? <Tag tone="purple" label="Featured" /> : null}
          {idea.viewerRole ? <Tag tone="green" label={idea.viewerRole === "FOUNDER" ? "Founder" : "Member"} /> : null}
          <Tag label={idea.isPublic ? "Public" : "Private"} />
        </View>
        <Text variant="title">{idea.name}</Text>
        <Text>{idea.description}</Text>
        {idea.categories.length > 0 ? (
          <View style={styles.tags}>
            {idea.categories.map((category) => (
              <Tag key={category.slug} label={category.name} />
            ))}
          </View>
        ) : null}
        <Text variant="label">
          {formatCount(idea.followerCount, "follower")} · Updated {formatRelativeTime(idea.updatedAt)}
        </Text>
      </View>

      {!idea.viewerRole ? (
        <Button
          label={idea.isFollowing ? "Unfollow" : "Follow"}
          loading={busy}
          onPress={() => void toggleFollow()}
          variant={idea.isFollowing ? "secondary" : "primary"}
        />
      ) : null}

      {idea.members.length > 0 ? (
        <ListSection title="Team">
          {idea.members.map((member) => (
            <ListRow
              key={member.id}
              label={member.name}
              value={member.role === "FOUNDER" ? "Founder" : "Member"}
            />
          ))}
        </ListSection>
      ) : null}

      <ListSection title="Builds">
        {idea.projects.length > 0 ? (
          idea.projects.map((project) => (
            <ListRow
              key={project.id}
              label={project.name}
              value={project.status}
              href={{ pathname: "/builds/[id]", params: { id: project.id } }}
            />
          ))
        ) : (
          <ListRow label="No builds linked yet" />
        )}
      </ListSection>

      <ListSection title="Agents">
        {idea.agents.length > 0 ? (
          idea.agents.map((agent) => (
            <ListRow
              key={agent.id}
              label={agent.name}
              value={agent.status}
              href={{ pathname: "/agents/[id]", params: { id: agent.id } }}
            />
          ))
        ) : (
          <ListRow label="No agents linked yet" />
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
});
