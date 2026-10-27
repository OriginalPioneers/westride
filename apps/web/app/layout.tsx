import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { afterAuthPath, signInPath, signUpPath } from "@/lib/auth-paths";
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
        <ClerkProvider
          signInUrl={signInPath}
          signUpUrl={signUpPath}
          signInFallbackRedirectUrl={afterAuthPath}
          signUpFallbackRedirectUrl={afterAuthPath}
        >
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
