import { Image, StyleSheet, View } from "react-native";
import { initials } from "@/lib/format";
import { brand, colors, fonts, fontSize } from "@/theme";
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
  if (imageUrl) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri: imageUrl }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
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
  image: {
    backgroundColor: colors.backgroundMuted,
  },
  fallback: {
    alignItems: "center",
    backgroundColor: brand.navy,
    justifyContent: "center",
  },
  initials: {
    color: colors.textOnInverted,
    fontFamily: fonts.semibold,
  },
});
