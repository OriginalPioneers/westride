import { Stack } from "expo-router";
import { colors } from "@/theme";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.backgroundBody },
        headerTintColor: colors.accent,
        headerTitleStyle: { fontFamily: "Figtree_600SemiBold" },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="ideas/[id]" options={{ title: "Idea", headerBackTitle: "Ideas" }} />
      <Stack.Screen name="ideas/new" options={{ title: "New idea", presentation: "modal" }} />
      <Stack.Screen name="builds/[id]" options={{ title: "Build", headerBackTitle: "Builds" }} />
      <Stack.Screen name="builds/new" options={{ title: "New build", presentation: "modal" }} />
      <Stack.Screen name="agents/[id]" options={{ title: "Agent", headerBackTitle: "Agents" }} />
      <Stack.Screen name="agents/new" options={{ title: "New agent", presentation: "modal" }} />
      <Stack.Screen name="tracks/[slug]" options={{ title: "Track", headerBackTitle: "Learn" }} />
    </Stack>
  );
}
