import type { AcademyTrack } from "@westride/api-client";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import {
  DIFFICULTY_LABEL,
  DIFFICULTY_TONE,
  formatDuration,
  formatLessonCount,
} from "@/lib/format";
import { colors, radius, spacing } from "@/theme";
import { Tag } from "./tag";
import { Text } from "./text";

export function TrackCard({ track }: { track: AcademyTrack }) {
  const router = useRouter();
  const difficulty = DIFFICULTY_LABEL[track.difficulty];
  const meta = `${formatDuration(track.estimatedDurationMinutes)} · ${formatLessonCount(track.lessonCount)}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${track.name}. ${difficulty}, ${track.category}, ${meta}.`}
      accessibilityHint="Opens track details"
      onPress={() =>
        router.push({
          pathname: "/tracks/[slug]",
          params: { slug: track.slug },
        })
      }
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.tags}>
        <Tag tone={DIFFICULTY_TONE[track.difficulty]} label={difficulty} />
        <Tag label={track.category} />
      </View>
      <Text variant="heading">{track.name}</Text>
      <Text variant="supporting" numberOfLines={3}>
        {track.description}
      </Text>
      <View style={styles.footer}>
        <Text variant="label">{meta}</Text>
        <Text variant="label">Earn: {track.achievementTitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundCard,
    borderColor: colors.border,
    borderRadius: radius.container,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing(2),
    padding: spacing(4),
  },
  pressed: {
    backgroundColor: colors.backgroundMuted,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(2),
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(2),
    justifyContent: "space-between",
    marginTop: spacing(1),
  },
});
