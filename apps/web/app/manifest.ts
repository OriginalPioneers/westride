import type { MetadataRoute } from "next";
import { brandColors, brandTagline } from "@westride/theme";

// The manifest takes literal colors, so read them off the brand palette.
function brandHex(token: string) {
  const color = brandColors.find((entry) => entry.token === token);
  if (!color) throw new Error(`Unknown brand token ${token}`);
  return color.hex;
}

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WeStride",
    short_name: "WeStride",
    description: `${brandTagline} Shape an idea, build it for real, and give it AI agents, powered by Meta's models.`,
    start_url: "/",
    display: "standalone",
    background_color: brandHex("--color-brand-white"),
    theme_color: brandHex("--color-brand-navy"),
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
