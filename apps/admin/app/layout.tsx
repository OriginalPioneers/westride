import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { afterAuthPath, signInPath } from "@/lib/paths";
import "./globals.css";
import { Providers } from "./providers";
import { COLOR_MODE_COOKIE, parseThemeMode } from "./theme-mode";

export const metadata: Metadata = {
  title: {
    default: "WeStride Admin",
    template: "%s · WeStride Admin",
  },
  description: "The WeStride team's view of members, ideas, builds, agents, supporters, and WeStride Cloud.",
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
          signInFallbackRedirectUrl={afterAuthPath}
          signUpFallbackRedirectUrl={afterAuthPath}
          afterSignOutUrl={signInPath}
        >
          <Providers initialMode={mode}>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
