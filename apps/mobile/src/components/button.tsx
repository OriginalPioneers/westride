import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useColors } from "@/lib/theme-preference";
import { fonts, radius, spacing } from "@/theme";
import { Text } from "./text";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}) {
  const colors = useColors();
  const isDisabled = disabled || loading;
  const onDark = variant === "primary" || variant === "danger";
  const labelColor = onDark ? colors.textOnInverted : colors.textPrimary;
  const variantStyle =
    variant === "primary"
      ? { backgroundColor: colors.backgroundInverted }
      : variant === "secondary"
        ? { backgroundColor: colors.backgroundCard, borderColor: colors.border }
        : variant === "danger"
          ? { backgroundColor: colors.danger }
          : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        variantStyle,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radius.element,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
  },
  primary: {},
  secondary: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {},
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: fonts.semibold,
  },
});
