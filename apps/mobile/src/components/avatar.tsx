import { Image, StyleSheet, View } from "react-native";
import { initials } from "@/lib/format";
import { useColors } from "@/lib/theme-preference";
import { brand, fonts, fontSize } from "@/theme";
import { Text } from "./text";

export function Avatar({
  name,
  imageUrl,
  size = 40,
}: {
  name: string;
  imageUrl?: string | null;
  size?: number;
}) {
  const colors = useColors();

  if (imageUrl) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri: imageUrl }}
        style={{
          backgroundColor: colors.backgroundMuted,
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size < 36 ? fontSize.small : fontSize.base }]}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    backgroundColor: brand.navy,
    justifyContent: "center",
  },
  initials: {
    color: brand.white,
    fontFamily: fonts.semibold,
  },
});
