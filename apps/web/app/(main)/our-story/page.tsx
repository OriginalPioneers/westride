import type { Metadata } from "next";
import { OurStoryOverview } from "./our-story-overview";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "How three friends at the Meta Global AI Developer Hackathon set out to build WeStride, a non-profit, open-source path from learning AI to shipping with it.",
};

export default function OurStoryPage() {
  return <OurStoryOverview />;
}
