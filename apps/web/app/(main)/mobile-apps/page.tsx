import type { Metadata } from "next";
import { MobileAppsView } from "./mobile-apps-view";

export const metadata: Metadata = {
  title: "Mobile apps",
  description:
    "The WeStride iOS and Android apps are in open beta. Join the TestFlight or Google Play test, use the same account as the website, and tell us what you find.",
};

export default function MobileAppsPage() {
  return <MobileAppsView platform="overview" />;
}
