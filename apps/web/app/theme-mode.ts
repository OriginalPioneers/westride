/** Cookie that stores an explicit light or dark choice. Absent means follow the OS. */
export const COLOR_MODE_COOKIE = "westride-color-mode";

/** One year, so the choice outlasts a browser session. */
export const COLOR_MODE_MAX_AGE = 60 * 60 * 24 * 365;

export type ColorMode = "light" | "dark";

/** `system` follows the operating system. An explicit choice is stored in the cookie. */
export type ThemeMode = ColorMode | "system";

export function parseThemeMode(value: string | undefined | null): ThemeMode {
  return value === "light" || value === "dark" ? value : "system";
}
