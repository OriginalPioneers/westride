import type { Metadata } from "next";
import { DesignOverview } from "./design-overview";

export const metadata: Metadata = {
  title: "Design",
  description:
    "The WeStride brand, the Astryx design system, and the rules for building a screen.",
};

export default function DesignPage() {
  return <DesignOverview />;
}
