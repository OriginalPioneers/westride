import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { brand } from "@/theme";

export default function AuthLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: brand.navy },
          headerShown: false,
        }}
      />
      <StatusBar style="light" />
    </>
  );
}
