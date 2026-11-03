import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import { colors, fonts, fontSize, radius, spacing } from "@/theme";
import { Text } from "./text";

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, error ? styles.inputError : null, props.multiline && styles.multiline]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing(1),
  },
  input: {
    backgroundColor: colors.backgroundCard,
    borderColor: colors.border,
    borderRadius: radius.element,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.textPrimary,
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
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.medium,
    fontSize: fontSize.small,
  },
});
