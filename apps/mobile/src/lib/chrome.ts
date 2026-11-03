import { useColors, useTheme } from "@/lib/theme-preference";
import { brand, fonts, onNavy } from "@/theme";

/**
 * Header and tab bar follow the profile theme: navy chrome with the white
 * wordmark when dark, a light bar with the navy wordmark when light.
 */
export function useNavigationTheme() {
  const { scheme } = useTheme();
  const colors = useColors();
  const dark = scheme === "dark";
  const background = dark ? brand.navy : colors.backgroundCard;
  const foreground = dark ? brand.white : colors.textPrimary;

  return {
    dark,
    contentStyle: { backgroundColor: colors.backgroundBody },
    headerShadowVisible: !dark,
    headerStyle: { backgroundColor: background },
    headerTintColor: foreground,
    headerTitleStyle: {
      color: foreground,
      fontFamily: fonts.semibold,
    },
    sceneStyle: { backgroundColor: colors.backgroundBody },
    statusBarStyle: dark ? ("light" as const) : ("dark" as const),
    tabBarActiveTintColor: dark ? brand.white : brand.navy,
    tabBarInactiveTintColor: dark ? onNavy.muted : colors.textSecondary,
    tabBarStyle: {
      backgroundColor: background,
      borderTopColor: dark ? onNavy.hairline : colors.border,
    },
  };
}
