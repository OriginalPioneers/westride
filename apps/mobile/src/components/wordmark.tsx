import { Image, type ImageStyle, type StyleProp } from "react-native";
import { useTheme } from "@/lib/theme-preference";

const NAVY = require("../../assets/wordmark-navy.png");
const WHITE = require("../../assets/wordmark-white.png");

/** Landscape lockup, `WeStride_landscape_*.png`, is 2608×468. */
const ASPECT = 2608 / 468;

export function Wordmark({
  tone,
  height = 22,
  style,
}: {
  /** Navy on light surfaces, white on dark. Defaults to the profile theme. */
  tone?: "navy" | "white";
  height?: number;
  style?: StyleProp<ImageStyle>;
}) {
  const { scheme } = useTheme();
  const resolved = tone ?? (scheme === "dark" ? "white" : "navy");

  return (
    <Image
      accessibilityLabel="WeStride"
      accessibilityRole="image"
      fadeDuration={0}
      resizeMode="contain"
      source={resolved === "white" ? WHITE : NAVY}
      style={[{ height, width: Math.round(height * ASPECT) }, style]}
    />
  );
}
