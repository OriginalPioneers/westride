/**
 * WeStride product colors, mirrored from the `light-dark()` pairs in
 * `packages/theme/themes/westride/westride.css`. Astryx itself is DOM-only,
 * so keep these in sync by hand when the web theme changes.
 */
export type Palette = {
  backgroundBody: string;
  backgroundCard: string;
  backgroundMuted: string;
  backgroundInverted: string;
  textPrimary: string;
  textSecondary: string;
  textOnInverted: string;
  accent: string;
  border: string;
  danger: string;
  green: { background: string; border: string; text: string };
  blue: { background: string; border: string; text: string };
  purple: { background: string; border: string; text: string };
  gray: { background: string; border: string; text: string };
};

export const lightColors: Palette = {
  backgroundBody: "#f0f0f7",
  backgroundCard: "#ffffff",
  backgroundMuted: "#e2e2e8",
  backgroundInverted: "#25252a",
  textPrimary: "#25252a",
  textSecondary: "#5f5f64",
  textOnInverted: "#f0f0f9",
  accent: "#25252a",
  border: "#e2e2e8",
  danger: "#9b2c2c",
  green: { background: "#d2eccf", border: "#bfdfbb", text: "#354f31" },
  blue: { background: "#d3e4fc", border: "#c2d6f1", text: "#344861" },
  purple: { background: "#e7def5", border: "#d9cfea", text: "#4c405b" },
  gray: { background: "#e2e2e8", border: "#d4d3dd", text: "#46464e" },
};

export const darkColors: Palette = {
  backgroundBody: "#101018",
  backgroundCard: "#25252a",
  backgroundMuted: "#3a3a42",
  backgroundInverted: "#f0f0f9",
  textPrimary: "#f0f0f9",
  textSecondary: "#ababb3",
  textOnInverted: "#25252a",
  accent: "#f0f0f9",
  border: "#3a3a42",
  danger: "#e07a72",
  green: { background: "#3e5d38", border: "#2f412c", text: "#d5e9d2" },
  blue: { background: "#445469", border: "#2c3c52", text: "#d5e4f8" },
  purple: { background: "#574e64", border: "#3f374c", text: "#e6def3" },
  gray: { background: "#525159", border: "#3a3a42", text: "#e2e2e8" },
};

/** Light palette. Screens should read `useColors()` so the profile theme applies. */
export const colors = lightColors;

/**
 * The brand identity palette, mirrored from `brandColors` in
 * `packages/theme/themes/westride/brand.ts`. For the mark, splashes, and brand
 * moments; product controls use `colors`.
 */
export const brand = {
  navy: "#0D1A2D",
  white: "#FFFFFF",
  blue: "#0AA2E8",
  indigo: "#5B5BD6",
  purple: "#885FF5",
  teal: "#10B3A5",
  orange: "#FF694B",
} as const;

/** Ink that sits on `brand.navy` — dark header, tab bar, and auth. */
export const onNavy = {
  muted: "#8B97A8",
  hairline: "#24344C",
} as const;

export const brandPastel = {
  blue: "#D3ECFD",
  indigo: "#E2E6FF",
  purple: "#E7E4FE",
  teal: "#CFF0EB",
  orange: "#FEE0D9",
} as const;

export const fonts = {
  regular: "Figtree_400Regular",
  medium: "Figtree_500Medium",
  semibold: "Figtree_600SemiBold",
  bold: "Figtree_700Bold",
} as const;

export type Tone = "green" | "blue" | "purple" | "gray";

/** Astryx spacing scale: `--spacing-n` is n × 4. */
export function spacing(step: number): number {
  return step * 4;
}

export const radius = {
  inner: 4,
  element: 8,
  container: 12,
  full: 9999,
} as const;

/** Astryx type scale: round(14 × 1.2^step). */
export const fontSize = {
  small: 12,
  base: 14,
  medium: 17,
  large: 20,
  xlarge: 24,
  display: 32,
} as const;
