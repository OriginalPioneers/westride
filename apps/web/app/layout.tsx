import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { brandTagline } from "@westride/theme";
import { afterAuthPath, signInPath, signUpPath } from "@/lib/auth-paths";
import "./globals.css";
import { Providers } from "./providers";
import { COLOR_MODE_COOKIE, parseThemeMode } from "./theme-mode";

export const metadata: Metadata = {
  title: {
    default: "WeStride",
    template: "%s · WeStride",
  },
  description: `${brandTagline} Shape an idea, build it for real, and give it AI agents, powered by Meta's models.`,
  // Pre-launch: do not index, follow, or offer pages to AI training crawlers.
  robots:
    "noindex, nofollow, nocache, noarchive, nosnippet, noimageindex, notranslate, noai, noimageai",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const mode = parseThemeMode(cookieStore.get(COLOR_MODE_COOKIE)?.value);

  return (
    <html lang="en" data-theme={mode === "system" ? undefined : mode}>
      <body>
        <ClerkProvider
          signInUrl={signInPath}
          signUpUrl={signUpPath}
          signInFallbackRedirectUrl={afterAuthPath}
          signUpFallbackRedirectUrl={afterAuthPath}
        >
          <Providers initialMode={mode}>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
