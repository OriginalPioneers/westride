/**
 * The WeStride brand identity: palette, type, and tagline.
 *
 * This is the single source for the identity. The `westride` theme publishes
 * the palette as `--color-brand-*` tokens, and the design site and the
 * marketing pages read the names, roles, and hex values from here.
 */

export type BrandColorRole = "primary" | "background" | "supporting" | "accent";

export type BrandColor = {
  name: string;
  token: `--color-brand-${string}`;
  hex: string;
  role: BrandColorRole;
  /** Where the color belongs, in one sentence. */
  use: string;
};

export const brandColors: readonly BrandColor[] = [
  {
    name: "Midnight Navy",
    token: "--color-brand-navy",
    hex: "#0D1A2D",
    role: "primary",
    use: "The wordmark on light backgrounds, dark fields, and the single-color mark.",
  },
  {
    name: "White",
    token: "--color-brand-white",
    hex: "#FFFFFF",
    role: "background",
    use: "The default field behind the lockup, and the wordmark on navy.",
  },
  {
    name: "Bright Blue",
    token: "--color-brand-blue",
    hex: "#0AA2E8",
    role: "primary",
    use: "Third stroke of the stamp, and the brand's lead color beside navy.",
  },
  {
    name: "Indigo",
    token: "--color-brand-indigo",
    hex: "#5B5BD6",
    role: "supporting",
    use: "First stroke of the stamp. The first step of the stride.",
  },
  {
    name: "Electric Purple",
    token: "--color-brand-purple",
    hex: "#885FF5",
    role: "supporting",
    use: "Second stroke of the stamp.",
  },
  {
    name: "Teal",
    token: "--color-brand-teal",
    hex: "#10B3A5",
    role: "supporting",
    use: "Tallest stroke of the stamp. The stride at full height.",
  },
  {
    name: "Spark Orange",
    token: "--color-brand-orange",
    hex: "#FF694B",
    role: "accent",
    use: "The spark only. Never a fifth stop in the gradient.",
  },
];

export const brandColorRoleLabels: Record<BrandColorRole, string> = {
  primary: "Primary",
  background: "Background",
  supporting: "Supporting",
  accent: "Accent",
};

/** The four stamp strokes, left to right, as theme tokens. */
export const stampStrokeTokens = [
  "--color-brand-indigo",
  "--color-brand-purple",
  "--color-brand-blue",
  "--color-brand-teal",
] as const;

/** The stamp's left-to-right gradient. The spark is not part of it. */
export const stampGradient = `linear-gradient(90deg, ${stampStrokeTokens
  .map((token) => `var(${token})`)
  .join(", ")})`;

/** Figtree carries every brand communication, from the wordmark to body copy. */
export const brandFontFamily = "Figtree";

export const brandFontWeights = [
  { name: "Light", weight: 300 },
  { name: "Regular", weight: 400 },
  { name: "Medium", weight: 500 },
  { name: "Semibold", weight: 600 },
  { name: "Bold", weight: 700 },
] as const;

export const brandDescriptor = "AI-powered community platform";
export const brandTagline = "Stride with AI. Build with community.";
export const brandTaglineSupport = "Your future. Our stride.";
