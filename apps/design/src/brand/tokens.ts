export type BrandColor = {
  name: string;
  token: string;
  hex: string;
  role: string;
};

/** Identity colors for the mark and wordmark. Product UI uses the Stone theme. */
export const brandColors: readonly BrandColor[] = [
  {
    name: "Deep Stride Navy",
    token: "--color-stride-navy",
    hex: "#0F1B2D",
    role: "Wordmark, and the single-color mark on light backgrounds.",
  },
  {
    name: "Electric Indigo",
    token: "--color-electric-indigo",
    hex: "#5B5BD6",
    role: "Left edge of the stamp. The first step of the stride.",
  },
  {
    name: "Vivid Violet",
    token: "--color-vivid-violet",
    hex: "#8B5CF6",
    role: "Second stroke of the stamp.",
  },
  {
    name: "Bright Azure",
    token: "--color-bright-azure",
    hex: "#0EA5E9",
    role: "Third stroke of the stamp.",
  },
  {
    name: "Stride Teal",
    token: "--color-stride-teal",
    hex: "#14B8A6",
    role: "Tallest stroke of the stamp. The stride at full height.",
  },
  {
    name: "Sunrise Coral",
    token: "--color-sunrise-coral",
    hex: "#FF6B4A",
    role: "The spark only. Human warmth at the end of the gradient.",
  },
];

export const wordmarkFontFamily =
  'Manrope, Montserrat, "Segoe UI", sans-serif';

export const stampGradient = `linear-gradient(90deg, var(--color-electric-indigo), var(--color-vivid-violet), var(--color-bright-azure), var(--color-stride-teal))`;

/** Publish identity tokens for swatches. Names do not overlap Stone theme tokens. */
export function applyBrandTokens(root: HTMLElement) {
  for (const color of brandColors) {
    root.style.setProperty(color.token, color.hex);
  }
  root.style.setProperty("--font-family-wordmark", wordmarkFontFamily);
}
