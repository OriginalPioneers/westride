import type { NextConfig } from "next";

const ROBOTS_TAG =
  "noindex, nofollow, nocache, noarchive, nosnippet, noimageindex, notranslate, noai, noimageai";

const nextConfig: NextConfig = {
  transpilePackages: ["@westride/db"],
  serverExternalPackages: ["@neondatabase/serverless"],
  // The dev server allows localhost by default. 127.0.0.1 is a different
  // origin, and Next blocks its HMR socket, which prevents the page from hydrating.
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: ROBOTS_TAG }],
      },
    ];
  },
};

export default nextConfig;
