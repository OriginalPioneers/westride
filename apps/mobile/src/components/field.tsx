import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import { useColors, useTheme } from "@/lib/theme-preference";
import { fonts, fontSize, radius, spacing } from "@/theme";
import { Text } from "./text";

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const colors = useColors();
  const { scheme } = useTheme();

  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <TextInput
        keyboardAppearance={scheme === "dark" ? "dark" : "light"}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: colors.backgroundCard,
            borderColor: error ? colors.danger : colors.border,
            color: colors.textPrimary,
          },
          props.multiline && styles.multiline,
        ]}
        {...props}
      />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing(1),
  },
  input: {
    borderRadius: radius.element,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: fonts.regular,
    fontSize: fontSize.base,
    minHeight: 44,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: fontSize.small,
  },
});
