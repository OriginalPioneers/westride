import { StyleSheet, View } from "react-native";
import { colors, fontSize, radius, spacing, type Tone } from "@/theme";
import { Text } from "./text";

export function Tag({ tone = "gray", label }: { tone?: Tone; label: string }) {
  const palette = colors[tone];

  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: palette.background, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.5),
  },
  label: {
    fontSize: fontSize.small,
    fontWeight: "600",
    lineHeight: 16,
  },
});
