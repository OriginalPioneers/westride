import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { Wordmark } from "@/components/wordmark";
import { useNavigationTheme } from "@/lib/chrome";
import { brand, fonts, spacing } from "@/theme";

function tabIconColor(color: string | number | { toString(): string } | null | undefined): string {
  return typeof color === "string" ? color : brand.navy;
}

export default function TabsLayout() {
  const chrome = useNavigationTheme();

  return (
    <Tabs
      screenOptions={{
        headerLeft: () => <Wordmark />,
        headerLeftContainerStyle: { paddingLeft: spacing(2) },
        headerShadowVisible: chrome.headerShadowVisible,
        headerStyle: chrome.headerStyle,
        headerTintColor: chrome.headerTintColor,
        headerTitleAlign: "center",
        headerTitleStyle: chrome.headerTitleStyle,
        sceneStyle: chrome.sceneStyle,
        tabBarActiveTintColor: chrome.tabBarActiveTintColor,
        tabBarInactiveTintColor: chrome.tabBarInactiveTintColor,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarStyle: chrome.tabBarStyle,
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
