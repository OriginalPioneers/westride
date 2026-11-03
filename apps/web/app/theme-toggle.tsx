"use client";

import { createContext, use, useCallback, useState, type ReactNode } from "react";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { useTheme } from "@astryxdesign/core/theme";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import {
  COLOR_MODE_COOKIE,
  COLOR_MODE_MAX_AGE,
  type ColorMode,
  type ThemeMode,
} from "./theme-mode";

type ColorModeContextValue = {
  setMode: (mode: ColorMode) => void;
};

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

function writeColorModeCookie(mode: ColorMode) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COLOR_MODE_COOKIE}=${mode}; Path=/; Max-Age=${COLOR_MODE_MAX_AGE}; SameSite=Lax${secure}`;
}

/**
 * Holds the page color mode. The cookie is the source the server reads on
 * the next request, so a reload paints the same mode.
 */
export function ColorModeProvider({
  initialMode,
  children,
}: {
  initialMode: ThemeMode;
  children: (mode: ThemeMode) => ReactNode;
}) {
  const [mode, setMode] = useState(initialMode);
  const selectMode = useCallback((next: ColorMode) => {
    writeColorModeCookie(next);
    setMode(next);
  }, []);

  return (
    <ColorModeContext.Provider value={{ setMode: selectMode }}>
      {children(mode)}
    </ColorModeContext.Provider>
  );
}

/** Switches the whole app between light and dark. Sits at the right of the top bar. */
export function ThemeToggle() {
  const { mode } = useTheme();
  const colorMode = use(ColorModeContext);
  if (colorMode == null) return null;

  const next: ColorMode = mode === "dark" ? "light" : "dark";
  const label = next === "light" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <IconButton
      label={label}
      tooltip={next === "light" ? "Light mode" : "Dark mode"}
      variant="ghost"
      icon={<Icon icon={next === "light" ? SunIcon : MoonIcon} />}
      onClick={() => colorMode.setMode(next)}
    />
  );
}
