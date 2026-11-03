"use client";

import Link from "next/link";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { themes, defaultThemeSlug } from "../astryx-themes";
import type { ThemeMode } from "./theme-mode";
import { ColorModeProvider } from "./theme-toggle";

export function Providers({
  children,
  initialMode,
}: {
  children: React.ReactNode;
  initialMode: ThemeMode;
}) {
  return (
    <ColorModeProvider initialMode={initialMode}>
      {(mode) => (
        <Theme theme={themes[defaultThemeSlug]} mode={mode}>
          <LinkProvider component={Link}>{children}</LinkProvider>
        </Theme>
      )}
    </ColorModeProvider>
  );
}
