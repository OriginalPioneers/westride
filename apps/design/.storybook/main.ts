import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const storybookDir = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  staticDirs: [
    {
      from: path.resolve(storybookDir, "../../web/public"),
      to: "/",
    },
  ],
  core: {
    disableTelemetry: true,
  },
  async viteFinal(viteConfig) {
    viteConfig.server ??= {};
    viteConfig.server.fs ??= {};
    viteConfig.server.fs.allow = [
      path.resolve(storybookDir, ".."),
      path.resolve(storybookDir, "../../.."),
    ];
    return viteConfig;
  },
};

export default config;
