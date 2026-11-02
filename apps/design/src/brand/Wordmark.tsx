import { Heading, type HeadingLevel } from "@astryxdesign/core/Heading";

export type BrandField = "light" | "navy";

/**
 * The live wordmark: `westride`, lowercase, Figtree Bold, tightly tracked.
 * Midnight Navy on light fields, white on navy.
 */
export function Wordmark({
  on = "light",
  level = 2,
}: {
  on?: BrandField;
  level?: HeadingLevel;
}) {
  return (
    <Heading
      level={level}
      weight="bold"
      style={{
        fontFamily: "var(--font-family-heading)",
        letterSpacing: "-0.03em",
        lineHeight: 1,
        color:
          on === "navy" ? "var(--color-brand-white)" : "var(--color-brand-navy)",
      }}
    >
      westride
    </Heading>
  );
}

/** Background for a brand field. */
export function fieldBackground(on: BrandField) {
  return on === "navy" ? "var(--color-brand-navy)" : "var(--color-brand-white)";
}
