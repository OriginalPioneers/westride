import type { Preview } from "@storybook/react-vite";
import { Theme } from "@astryxdesign/core/theme";
import "../src/styles.css";
import { themes, defaultThemeSlug } from "../src/astryx-themes";

const preview: Preview = {
  decorators: [
    (Story) => (
      <Theme theme={themes[defaultThemeSlug]}>
        <Story />
      </Theme>
    ),
  ],
  parameters: {
    layout: "padded",
    options: {
      storySort: {
        order: [
          "Brand",
          ["Introduction", "Logo", "Color", "Typography"],
          "Foundations",
          ["Color", "Typography"],
          "Components",
        ],
      },
    },
  },
};

export default preview;
