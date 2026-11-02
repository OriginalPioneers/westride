import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";
import { brandColors } from "@westride/theme";

// Storybook's chrome takes literal colors, so read them off the brand palette.
function brandHex(token: string) {
  const color = brandColors.find((entry) => entry.token === token);
  if (!color) throw new Error(`Unknown brand token ${token}`);
  return color.hex;
}

addons.setConfig({
  theme: create({
    base: "light",
    brandTitle: "WeStride",
    brandUrl: "https://design.westride.org",
    brandTarget: "_self",
    colorPrimary: brandHex("--color-brand-navy"),
    colorSecondary: brandHex("--color-brand-blue"),
    fontBase: '"Figtree", "Segoe UI", sans-serif',
    fontCode: '"JetBrains Mono", monospace',
  }),
});
