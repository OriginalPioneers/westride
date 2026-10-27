import type { Metadata } from "next";
import { PlaceholderPage } from "../placeholder-page";

export const metadata: Metadata = {
  title: "API",
};

export default function ApiPage() {
  return <PlaceholderPage title="API" />;
}
