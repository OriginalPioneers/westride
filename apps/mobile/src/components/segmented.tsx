import { Pressable, ScrollView, StyleSheet } from "react-native";
import { useColors } from "@/lib/theme-preference";
import { fonts, radius, spacing } from "@/theme";
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
  const colors = useColors();

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
            style={[
              styles.chip,
              {
                backgroundColor: selected ? colors.backgroundInverted : colors.backgroundCard,
                borderColor: selected ? colors.backgroundInverted : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? colors.textOnInverted : colors.textPrimary },
              ]}
            >
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
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  label: {
    fontFamily: fonts.medium,
  },
});
