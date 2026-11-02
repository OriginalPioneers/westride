/**
 * Light-mode values of the WeStride theme (packages/theme), which extends
 * Astryx Stone and which the web app uses. Astryx itself is DOM-only, so keep
 * these in sync by hand when the web theme changes.
 */
export const colors = {
  backgroundBody: "#f0f0f7",
  backgroundCard: "#ffffff",
  backgroundMuted: "#e2e2e8",
  backgroundInverted: "#25252a",
  textPrimary: "#25252a",
  textSecondary: "#5f5f64",
  textOnInverted: "#f0f0f9",
  accent: "#25252a",
  border: "#e2e2e8",
  green: { background: "#d2eccf", border: "#bfdfbb", text: "#354f31" },
  blue: { background: "#d3e4fc", border: "#c2d6f1", text: "#344861" },
  purple: { background: "#e7def5", border: "#d9cfea", text: "#4c405b" },
  gray: { background: "#e2e2e8", border: "#d4d3dd", text: "#46464e" },
} as const;

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
} as const;
