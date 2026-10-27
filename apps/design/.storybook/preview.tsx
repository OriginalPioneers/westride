import type { Preview } from "@storybook/react-vite";
import { Theme } from "@astryxdesign/core/theme";
import "../src/styles.css";
import { themes, defaultThemeSlug } from "../src/astryx-themes";
import { applyBrandTokens } from "../src/brand/tokens";

const preview: Preview = {
  decorators: [
    (Story) => {
      applyBrandTokens(document.documentElement);
      return (
        <Theme theme={themes[defaultThemeSlug]}>
          <Story />
        </Theme>
      );
    },
  ],
  parameters: {
    layout: "padded",
    options: {
      storySort: {
        order: [
          "Brand",
          ["Introduction", "Color", "Typography", "Logo"],
          "Foundations",
          ["Color", "Typography"],
          "Components",
        ],
      },
    },
  },
};

export default preview;
