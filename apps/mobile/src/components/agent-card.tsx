import type { Agent } from "@westride/api-client";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { excerpt, formatRelativeTime } from "@/lib/format";
import { AGENT_STATUS_LABELS, AGENT_STATUS_TONE } from "@/lib/labels";
import { useColors } from "@/lib/theme-preference";
import { radius, spacing } from "@/theme";
import { Tag } from "./tag";
import { Text } from "./text";

export function AgentCard({ agent }: { agent: Agent }) {
  const colors = useColors();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${agent.name}. ${AGENT_STATUS_LABELS[agent.status]}.`}
      onPress={() =>
        router.push({
          pathname: "/agents/[id]",
          params: { id: agent.id },
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
        <Tag tone={AGENT_STATUS_TONE[agent.status]} label={AGENT_STATUS_LABELS[agent.status]} />
        {agent.viewerRole ? <Tag tone="green" label={agent.viewerRole === "OWNER" ? "Yours" : "Collaborator"} /> : null}
      </View>
      <Text variant="heading">{agent.name}</Text>
      <Text variant="supporting" numberOfLines={3}>
        {excerpt(agent.description)}
      </Text>
      <Text variant="label">
        {agent.schedule.summary} · {agent.activeJobs} running · {formatRelativeTime(agent.updatedAt)}
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
