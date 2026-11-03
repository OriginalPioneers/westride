import type { NextConfig } from "next";

const ROBOTS_TAG =
  "noindex, nofollow, nocache, noarchive, nosnippet, noimageindex, notranslate, noai, noimageai";

const nextConfig: NextConfig = {
  transpilePackages: ["@westride/db", "@westride/runner-protocol"],
  serverExternalPackages: ["@neondatabase/serverless"],
  // The dev server allows localhost by default. 127.0.0.1 is a different
  // origin, and Next blocks its HMR socket, which prevents the page from hydrating.
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    return [
      { source: "/achievements", destination: "/profile/achievements", permanent: true },
      { source: "/tech-stack", destination: "/our-story/tech-stack", permanent: true },
      { source: "/design", destination: "/our-story/design", permanent: true },
      { source: "/api", destination: "/settings/api", permanent: true },
      { source: "/mcp", destination: "/settings/mcp", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: ROBOTS_TAG }],
      },
      // Fetched with `irm` / `curl`. Without a charset, static hosting serves
      // these as application/octet-stream and PowerShell may mis-decode them.
      {
        source: "/:script(install\\.sh|install\\.ps1)",
        headers: [{ key: "Content-Type", value: "text/plain; charset=utf-8" }],
      },
    ];
  },
};

export default nextConfig;
