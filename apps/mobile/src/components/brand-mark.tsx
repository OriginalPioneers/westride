import { Image } from "react-native";

const STAMP = require("../../assets/stamp.png");

/** The stamp artwork is 1156×778. */
const ASPECT = 778 / 1156;

/**
 * The WeStride stamp: four strides and a spark. Same artwork as
 * `apps/web/public/westride-stamp.png`.
 */
export function BrandMark({ size = 72 }: { size?: number }) {
  return (
    <Image
      accessibilityLabel="WeStride"
      accessibilityRole="image"
      fadeDuration={0}
      resizeMode="contain"
      source={STAMP}
      style={{ width: size, height: Math.round(size * ASPECT) }}
    />
  );
}
