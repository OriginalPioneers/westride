"use client";

import type { ReactNode } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { defaultThemeSlug, themes } from "@/astryx-themes";

/**
 * A dark-mode island inside the page. Theme is a client component and takes
 * a theme object, so the server page cannot render it directly; this
 * wrapper keeps the theme on the client and passes server content through.
 */
export function DarkBand({ children }: { children: ReactNode }) {
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="dark">
      {children}
    </Theme>
  );
}
