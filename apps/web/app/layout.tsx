import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { brandTagline } from "@westride/theme";
import { afterAuthPath, signInPath, signUpPath } from "@/lib/auth-paths";
import { NO_INDEX, PRODUCTION_ORIGIN, isProductionHost } from "@/lib/crawl-policy";
import "./globals.css";
import { Providers } from "./providers";
import { COLOR_MODE_COOKIE, parseThemeMode } from "./theme-mode";

const description = `${brandTagline} Shape an idea, build it for real, and give it AI agents, powered by Meta's models.`;

const shareImage = {
  url: "/westride-og.png",
  width: 1200,
  height: 630,
  alt: "WeStride. Every Idea. Every Ambition. Every Stride.",
  type: "image/png",
};

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host");
  return {
    // Canonical and social-sharing links are absolute, on the production host.
    metadataBase: new URL(PRODUCTION_ORIGIN),
    title: {
      default: "WeStride",
      template: "%s · WeStride",
    },
    description,
    robots: isProductionHost(host) ? undefined : NO_INDEX,
    openGraph: {
      type: "website",
      siteName: "WeStride",
      locale: "en_US",
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      images: [shareImage],
    },
  };
}

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
