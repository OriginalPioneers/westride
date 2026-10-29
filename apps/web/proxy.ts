import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { signInPath, signUpPath } from "@/lib/auth-paths";

const ROBOTS_TAG =
  "noindex, nofollow, nocache, noarchive, nosnippet, noimageindex, notranslate, noai, noimageai";

// Names that do not already end in bot/crawler/spider/scraper/archiver.
const NAMED_AGENTS = [
  "chatgpt-user",
  "claude-user",
  "perplexity-user",
  "anthropic-ai",
  "google-extended",
  "googleother",
  "google-inspectiontool",
  "mediapartners-google",
  "meta-externalagent",
  "meta-externalfetcher",
  "facebookexternalhit",
  "cohere-ai",
  "mistralai",
  "omgili",
  "img2dataset",
  "kangaroo",
  "pangu",
  "turnitin",
  "velenpublic",
  "iaskspider",
  "friendlycrawler",
  "megaindex",
  "qwantify",
  "mojeek",
  "sogou",
  "slurp",
  "yandex",
  "yeti/",
  "bingpreview",
  "python-requests",
  "python-urllib",
  "aiohttp",
  "httpx/",
  "go-http-client",
  "java/",
  "libwww",
  "httpclient",
  "curl/",
  "wget",
  "node-fetch",
  "undici",
  "axios/",
  "scrapy",
  "headless",
  "phantomjs",
  "selenium",
  "puppeteer",
  "playwright",
  "lighthouse",
  "pingdom",
  "statuscake",
  "site24x7",
  "skypeuripreview",
  "embedly",
  "quora link preview",
  "node/",
  "bun/",
];

const GENERIC_AGENT =
  /(?:bot|crawler|spider|scraper|archiver)(?:\/|\s|;|$)/i;

function isBlockedClient(userAgent: string | null): boolean {
  if (!userAgent?.trim()) return true;

  const ua = userAgent.toLowerCase();
  if (ua === "node") return true;
  if (NAMED_AGENTS.some((agent) => ua.includes(agent))) return true;
  // Cubot is a phone brand. Its UA ends in "bot" without being a crawler.
  if (ua.includes("cubot")) return false;
  return GENERIC_AGENT.test(userAgent);
}

const clerk = clerkMiddleware({
  signInUrl: signInPath,
  signUpUrl: signUpPath,
});

const STATIC_FILE =
  /\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)$/i;

// Chat platforms call these from servers with bot user agents (Slack sends
// "Slackbot"). Each handler checks the platform's request signature instead.
const SIGNED_WEBHOOKS = new Set([
  "/integrations/slack/commands",
  "/integrations/discord/interactions",
  "/integrations/whatsapp/webhook",
]);

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // Crawlers need to read the disallow policy. Everything else is refused.
  if (pathname === "/robots.txt" || SIGNED_WEBHOOKS.has(pathname)) {
    return NextResponse.next();
  }

  if (isBlockedClient(request.headers.get("user-agent"))) {
    return new NextResponse("This site is not open to crawlers.", {
      status: 403,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": ROBOTS_TAG,
      },
    });
  }

  if (pathname.startsWith("/_next") || STATIC_FILE.test(pathname)) {
    return NextResponse.next();
  }

  return clerk(request, event);
}
