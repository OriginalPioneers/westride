import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

addons.setConfig({
  theme: create({
    base: "light",
    brandTitle: "WeStride",
    brandUrl: "https://design.westride.org",
    brandTarget: "_self",
    colorPrimary: "#5B5BD6",
    colorSecondary: "#0EA5E9",
    fontBase: '"Figtree", "Segoe UI", sans-serif',
    fontCode: '"JetBrains Mono", monospace',
  }),
});
