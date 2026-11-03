import type { Metadata } from "next";
import { MobileAppsView } from "../mobile-apps-view";

export const metadata: Metadata = {
  title: "Android app",
  description:
    "Join the WeStride Android open test on Google Play. The public store listing is not live yet, and we are looking for testers.",
};

export default function AndroidBetaPage() {
  return <MobileAppsView platform="android" />;
}
