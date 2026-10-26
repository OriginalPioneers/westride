import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "WeStride",
    template: "%s · WeStride",
  },
  description:
    "A platform for learning AI, mentorship and entrepreneurship.",
  // Pre-launch: do not index, follow, or offer pages to AI training crawlers.
  robots:
    "noindex, nofollow, nocache, noarchive, nosnippet, noimageindex, notranslate, noai, noimageai",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
