import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { PRODUCTION_ORIGIN, isProductionHost } from "@/lib/crawl-policy";

// Webhooks and per-account pages have nothing for a crawler to index.
const privatePaths = ["/integrations/", "/settings", "/profile", "/claims/", "/judge"];

// Off production, crawlers that honor robots.txt are turned away, except the
// public legal pages. Agents that ignore the `*` group (Google-Extended,
// Applebot-Extended, and several AI crawlers) are named on their own so they
// still match a group. Allow is longer than `/`, so it wins over Disallow.
const userAgents = [
  "*",
  "Googlebot",
  "Googlebot-Image",
  "Googlebot-News",
  "Googlebot-Video",
  "Google-Extended",
  "GoogleOther",
  "Google-CloudVertexBot",
  "AdsBot-Google",
  "Mediapartners-Google",
  "Bingbot",
  "BingPreview",
  "DuckDuckBot",
  "Baiduspider",
  "YandexBot",
  "Slurp",
  "Applebot",
  "Applebot-Extended",
  "PetalBot",
  "SeznamBot",
  "Qwantify",
  "MojeekBot",
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "BLEXBot",
  "DataForSeoBot",
  "SerpstatBot",
  "MegaIndex",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Bytespider",
  "CCBot",
  "Amazonbot",
  "FacebookBot",
  "meta-externalagent",
  "Meta-ExternalFetcher",
  "cohere-ai",
  "Diffbot",
  "YouBot",
  "MistralAI-User",
  "ImagesiftBot",
  "Timpibot",
  "AI2Bot",
  "omgili",
  "omgilibot",
  "img2dataset",
  "ICC-Crawler",
  "Kangaroo Bot",
  "PanguBot",
  "DuckAssistBot",
  "iaskspider",
  "FriendlyCrawler",
  "TurnitinBot",
  "VelenPublicWebCrawler",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  if (isProductionHost((await headers()).get("host"))) {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
      sitemap: `${PRODUCTION_ORIGIN}/sitemap.xml`,
    };
  }

  return {
    rules: {
      userAgent: userAgents,
      allow: ["/privacy", "/terms"],
      disallow: "/",
    },
  };
}
