import type { NextConfig } from "next";
import { NO_INDEX, PRODUCTION_HOST_PATTERN } from "./lib/crawl-policy";

const nextConfig: NextConfig = {
  transpilePackages: ["@westride/db", "@westride/runner-protocol"],
  // react-pdf ships its own layout engine and fonts; bundling them breaks rendering.
  serverExternalPackages: ["@neondatabase/serverless", "@react-pdf/renderer"],
  // The dev server allows localhost by default. 127.0.0.1 is a different
  // origin, and Next blocks its HMR socket, which prevents the page from hydrating.
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    return [
      { source: "/tech-stack", destination: "/our-story/tech-stack", permanent: true },
      { source: "/design", destination: "/our-story/design", permanent: true },
      { source: "/api", destination: "/settings/api", permanent: true },
      { source: "/mcp", destination: "/settings/mcp", permanent: true },
      // The pledge system became WePledge™; query strings (?kind=) carry over.
      { source: "/supporting", destination: "/wepledge", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        missing: [{ type: "host", value: PRODUCTION_HOST_PATTERN }],
        headers: [{ key: "X-Robots-Tag", value: NO_INDEX }],
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
