import type { Metadata } from "next";
import { MobileAppsView } from "../mobile-apps-view";

export const metadata: Metadata = {
  title: "iOS app",
  description:
    "Install the WeStride iOS beta with TestFlight. The public App Store listing is not live yet, and we are looking for testers.",
};

export default function IosBetaPage() {
  return <MobileAppsView platform="ios" />;
}
