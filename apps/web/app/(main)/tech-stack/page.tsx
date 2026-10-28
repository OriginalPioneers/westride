import type { Metadata } from "next";
import { TechStackOverview } from "./tech-stack-overview";

export const metadata: Metadata = {
  title: "Tech Stack",
  description:
    "What WeStride runs on, why, and how the pieces fit together.",
};

export default function TechStackPage() {
  return <TechStackOverview />;
}
