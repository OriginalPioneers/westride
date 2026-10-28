import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/theme";

export const unstable_settings = {
  anchor: "index",
};

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.backgroundBody },
          headerTintColor: colors.accent,
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: "WeStride", headerLargeTitle: true }}
        />
        <Stack.Screen
          name="tracks/[slug]"
          options={{ title: "Track", headerBackTitle: "Tracks" }}
        />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
