import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { brand, colors, fonts } from "@/theme";

function tabIconColor(color: string | number | { toString(): string } | null | undefined): string {
  return typeof color === "string" ? color : brand.navy;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTintColor: colors.accent,
        headerTitleStyle: { fontFamily: fonts.semibold },
        sceneStyle: { backgroundColor: colors.backgroundBody },
        tabBarActiveTintColor: brand.navy,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.backgroundCard },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ideas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={tabIconColor(color)} name="bulb-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="builds"
        options={{
          title: "Builds",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={tabIconColor(color)} name="construct-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="agents"
        options={{
          title: "Agents",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={tabIconColor(color)} name="sparkles-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={tabIconColor(color)} name="school-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: "You",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={tabIconColor(color)} name="person-circle-outline" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
