import { defineTheme } from "@astryxdesign/core/theme";

// The stamp's strokes, published by the WeStride theme as --color-brand-*.
export const journeyGradient =
  "linear-gradient(110deg, var(--color-brand-indigo), var(--color-brand-purple) 32%, var(--color-brand-blue) 68%, var(--color-brand-teal))";
export const bonusBadgeStyle = {
  backgroundImage: journeyGradient,
  color: "var(--color-journey-ink)",
  fontWeight: "var(--font-weight-bold)",
};
// Only this journey is themed; it paints with the brand palette.
export const achievementTheme = defineTheme({
  name: "westride-journey",
  localTokens: {
    "--color-journey-ink": "#18181b",
  },
  components: {
    "progress-bar-fill": {
      "variant:accent": { backgroundImage: journeyGradient },
      "variant:success": { backgroundImage: journeyGradient },
    },
    "progress-bar-track": {
      base: {
        backgroundImage: `linear-gradient(var(--color-background-surface), var(--color-background-surface)), ${journeyGradient}`,
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
        border: "calc(var(--spacing-1) / 2) solid transparent",
        height: "var(--spacing-3)",
      },
    },
    "step-connector": {
      base: {
        "--color-border": "var(--journey-section-color)",
        "--color-accent": "var(--journey-section-color)",
      },
    },
    // Track groups aren't sequential, so every title gets the same weight and
    // sits a size above the achievement rows beneath it.
    "step-label": {
      base: {
        fontSize: "var(--font-size-lg)",
        fontWeight: "var(--font-weight-bold)",
        color: "var(--color-text-primary)",
      },
    },
    "step-indicator": {
      "progress:not-started": {
        "--color-background-muted": "var(--journey-section-color)",
        "--color-text-secondary": "var(--color-journey-ink)",
      },
      "progress:in-progress": { color: "var(--journey-section-color)" },
      "progress:completed": { color: "var(--journey-section-color)" },
    },
  },
});
