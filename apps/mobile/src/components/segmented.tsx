import { Pressable, ScrollView, StyleSheet } from "react-native";
import { colors, fonts, radius, spacing } from "@/theme";
import { Text } from "./text";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.chip, selected && styles.selected]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing(2),
  },
  chip: {
    backgroundColor: colors.backgroundCard,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  selected: {
    backgroundColor: colors.backgroundInverted,
    borderColor: colors.backgroundInverted,
  },
  label: {
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  selectedLabel: {
    color: colors.textOnInverted,
  },
});
