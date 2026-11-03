import { StyleSheet, View } from "react-native";
import Svg, { G, Line, Path } from "react-native-svg";
import { brand } from "@/theme";

/**
 * The WeStride stamp: four strides and a spark. Same geometry as
 * `apps/mcp/src/home/westride-mark.tsx`, painted with the brand palette.
 */
export function BrandMark({ size = 72 }: { size?: number }) {
  const height = size * (700 / 1024);

  return (
    <View accessibilityLabel="WeStride" style={{ width: size, height }}>
      <Svg viewBox="0 0 1024 700" width={size} height={height}>
        <G strokeLinecap="round" strokeWidth={96} fill="none">
          <Line x1={52} y1={642} x2={202} y2={390} stroke={brand.indigo} />
          <Line x1={228} y1={642} x2={430} y2={296} stroke={brand.purple} />
          <Line x1={406} y1={642} x2={662} y2={206} stroke={brand.blue} />
          <Line x1={584} y1={642} x2={872} y2={144} stroke={brand.teal} />
        </G>
        <Path
          d="M955 0 C965 45 980 58 1022 66 C980 74 965 88 955 132 C945 88 930 74 888 66 C930 58 945 45 955 0 Z"
          fill={brand.orange}
        />
      </Svg>
    </View>
  );
}

export function BrandStampRow() {
  return (
    <View style={styles.row}>
      <View style={[styles.stroke, { backgroundColor: brand.indigo }]} />
      <View style={[styles.stroke, { backgroundColor: brand.purple }]} />
      <View style={[styles.stroke, { backgroundColor: brand.blue }]} />
      <View style={[styles.stroke, { backgroundColor: brand.teal }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
  },
  stroke: {
    borderRadius: 999,
    height: 6,
    width: 22,
  },
});
