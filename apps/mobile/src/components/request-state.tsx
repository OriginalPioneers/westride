import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { colors, radius, spacing } from "@/theme";
import { Text } from "./text";

export function LoadingState() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

type ErrorStateProps = {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
};

export function ErrorState({
  title,
  message,
  actionLabel,
  onAction,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text variant="heading">{title}</Text>
      <Text variant="supporting" style={styles.message}>
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onAction}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>{actionLabel}</Text>
      </Pressable>
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
  message: {
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.backgroundInverted,
    borderRadius: radius.element,
    marginTop: spacing(2),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
  },
  pressed: {
    opacity: 0.8,
  },
  buttonLabel: {
    color: colors.textOnInverted,
    fontWeight: "600",
  },
});
