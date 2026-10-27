import type { Metadata } from "next";
import { PlaceholderPage } from "../placeholder-page";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return <PlaceholderPage title="Profile" />;
}
