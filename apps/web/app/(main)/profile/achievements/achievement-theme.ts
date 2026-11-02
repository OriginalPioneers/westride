import { defineTheme } from "@astryxdesign/core/theme";

export const journeyGradient =
  "linear-gradient(110deg, var(--color-journey-indigo), var(--color-journey-purple) 32%, var(--color-journey-blue) 68%, var(--color-journey-teal))";
export const bonusBadgeStyle = {
  backgroundImage: journeyGradient,
  color: "var(--color-journey-ink)",
  fontWeight: "var(--font-weight-bold)",
};
// Brand colors sampled from public/westride-stamp.png. Only this journey is themed.
export const achievementTheme = defineTheme({
  name: "westride-journey",
  localTokens: {
    "--color-journey-indigo": "#595dd6",
    "--color-journey-purple": "#885ff5",
    "--color-journey-blue": "#0aa2e8",
    "--color-journey-teal": "#10b3a5",
    "--color-journey-red": "#ff6e49",
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
