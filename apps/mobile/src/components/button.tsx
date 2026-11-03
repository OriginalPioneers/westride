import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { colors, fonts, radius, spacing } from "@/theme";
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
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" || variant === "danger" ? colors.textOnInverted : colors.textPrimary}
        />
      ) : (
        <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
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
  primary: {
    backgroundColor: colors.backgroundInverted,
  },
  secondary: {
    backgroundColor: colors.backgroundCard,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: colors.danger,
  },
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

const labelStyles = StyleSheet.create({
  primary: { color: colors.textOnInverted },
  secondary: { color: colors.textPrimary },
  ghost: { color: colors.textPrimary },
  danger: { color: colors.textOnInverted },
});
