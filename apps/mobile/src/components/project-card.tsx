import type { Project } from "@westride/api-client";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { excerpt, formatRelativeTime } from "@/lib/format";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE } from "@/lib/labels";
import { useColors } from "@/lib/theme-preference";
import { radius, spacing } from "@/theme";
import { Tag } from "./tag";
import { Text } from "./text";

export function ProjectCard({ project }: { project: Project }) {
  const colors = useColors();
  const router = useRouter();
  const openTickets =
    project.ticketCounts.BACKLOG +
    project.ticketCounts.IN_PROGRESS +
    project.ticketCounts.IN_REVIEW +
    project.ticketCounts.BLOCKED;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${project.name}. ${PROJECT_STATUS_LABELS[project.status]}.`}
      onPress={() =>
        router.push({
          pathname: "/builds/[id]",
          params: { id: project.id },
        })
      }
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? colors.backgroundMuted : colors.backgroundCard,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.tags}>
        <Tag
          tone={PROJECT_STATUS_TONE[project.status]}
          label={PROJECT_STATUS_LABELS[project.status]}
        />
        {project.viewerRole ? <Tag tone="green" label="On the team" /> : null}
      </View>
      <Text variant="heading">{project.name}</Text>
      <Text variant="supporting" numberOfLines={3}>
        {excerpt(project.description)}
      </Text>
      <Text variant="label">
        {project.idea ? `${project.idea.name} · ` : ""}
        {openTickets} open · {formatRelativeTime(project.updatedAt)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.container,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing(2),
    padding: spacing(4),
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(2),
  },
});
