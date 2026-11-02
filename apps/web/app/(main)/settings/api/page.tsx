import type { Metadata } from "next";
import { ApiOverview } from "./api-overview";

export const metadata: Metadata = {
  title: "API",
  description:
    "What the WeStride API is, how it's built, and how to start calling it.",
};

export default function ApiPage() {
  return <ApiOverview />;
}
