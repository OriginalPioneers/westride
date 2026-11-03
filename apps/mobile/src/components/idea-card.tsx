import type { Idea } from "@westride/api-client";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { excerpt, formatCount, formatRelativeTime } from "@/lib/format";
import { IDEA_TYPE_LABELS, IDEA_TYPE_TONE } from "@/lib/labels";
import { useColors } from "@/lib/theme-preference";
import { radius, spacing } from "@/theme";
import { Tag } from "./tag";
import { Text } from "./text";

export function IdeaCard({ idea }: { idea: Idea }) {
  const colors = useColors();
  const router = useRouter();
  const categories = idea.categories.slice(0, 3);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${idea.name}. ${IDEA_TYPE_LABELS[idea.type]}.`}
      onPress={() =>
        router.push({
          pathname: "/ideas/[id]",
          params: { id: idea.id },
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
        <Tag tone={IDEA_TYPE_TONE[idea.type]} label={IDEA_TYPE_LABELS[idea.type]} />
        {idea.isFeatured ? <Tag tone="purple" label="Featured" /> : null}
        {idea.viewerRole ? <Tag tone="green" label="On the team" /> : null}
      </View>
      <Text variant="heading">{idea.name}</Text>
      <Text variant="supporting" numberOfLines={3}>
        {excerpt(idea.description)}
      </Text>
      {categories.length > 0 ? (
        <View style={styles.tags}>
          {categories.map((category) => (
            <Tag key={category.slug} label={category.name} />
          ))}
        </View>
      ) : null}
      <Text variant="label">
        {formatCount(idea.followerCount, "follower")} · {formatRelativeTime(idea.updatedAt)}
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
