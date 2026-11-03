import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors, spacing } from "@/theme";
import { Button } from "./button";
import { Text } from "./text";

export function LoadingState() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

export function ErrorState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.container}>
      <Text variant="heading">{title}</Text>
      <Text variant="supporting" style={styles.message}>
        {message}
      </Text>
      <Button label={actionLabel} onPress={onAction} />
    </View>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text variant="heading">{title}</Text>
      <Text variant="supporting" style={styles.message}>
        {message}
      </Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    gap: spacing(3),
    justifyContent: "center",
    padding: spacing(6),
  },
  empty: {
    alignItems: "center",
    gap: spacing(2),
    paddingVertical: spacing(10),
  },
  message: {
    textAlign: "center",
  },
});
