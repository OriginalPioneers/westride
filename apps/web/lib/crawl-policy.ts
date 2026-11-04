// Crawlers, search engines, and AI agents are welcome on production only.
// dev.westride.org, Vercel preview URLs, and localhost run the same build and
// keep turning them away, so the decision is made per request from its host.
// Imported by next.config.ts, so it cannot use the `@/` alias or server-only.

export const PRODUCTION_HOSTS = ["www.westride.org", "westride.org"];

/** The address search engines are given for every public page. */
export const PRODUCTION_ORIGIN = "https://www.westride.org";

/** `PRODUCTION_HOSTS` as a pattern for `has`/`missing` host matching in next.config. */
export const PRODUCTION_HOST_PATTERN = "(?:www\\.)?westride\\.org";

export const NO_INDEX =
  "noindex, nofollow, nocache, noarchive, nosnippet, noimageindex, notranslate, noai, noimageai";

/** Accepts a Host header, with or without a port. */
export function isProductionHost(host: string | null | undefined): boolean {
  const hostname = host?.split(":", 1)[0].trim().toLowerCase();
  return !!hostname && PRODUCTION_HOSTS.includes(hostname);
}
