import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  useFonts,
} from "@expo-google-fonts/figtree";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { LogBox, StyleSheet, View } from "react-native";

LogBox.ignoreLogs(["Invalid prop `onLayout`"]);
import { BrandMark } from "@/components/brand-mark";
import { Text } from "@/components/text";
import { Wordmark } from "@/components/wordmark";
import { ApiProvider } from "@/lib/api-context";
import { ThemeProvider, useColors } from "@/lib/theme-preference";
import { brand, spacing } from "@/theme";

void SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

export const unstable_settings = {
  anchor: "(app)",
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded && !publishableKey) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  if (!publishableKey) {
    return (
      <ThemeProvider>
        <View style={styles.missing}>
          <BrandMark size={88} />
          <Wordmark height={28} tone="white" />
          <Text variant="title" style={styles.missingTitle}>
            Add a Clerk key
          </Text>
          <Text variant="supporting" style={styles.missingCopy}>
            Copy EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY into apps/mobile/.env. Use the
            same Clerk instance as the website, and turn Native API on in the
            Clerk dashboard.
          </Text>
          <StatusBar style="light" />
        </View>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ApiProvider>
          <RootNavigator />
        </ApiProvider>
      </ClerkProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  if (!isLoaded) {
    return null;
  }

  return (
    <>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.backgroundBody },
          headerTintColor: colors.accent,
          headerTitleStyle: { fontFamily: "Figtree_600SemiBold" },
        }}
      >
        <Stack.Protected guard={!!isSignedIn}>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  missing: {
    alignItems: "center",
    backgroundColor: brand.navy,
    flex: 1,
    gap: spacing(3),
    justifyContent: "center",
    padding: spacing(6),
  },
  missingTitle: {
    color: brand.white,
    textAlign: "center",
  },
  missingCopy: {
    color: brand.white,
    textAlign: "center",
  },
});
