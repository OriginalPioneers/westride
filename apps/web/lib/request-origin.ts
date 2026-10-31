import "server-only";
import { headers } from "next/headers";

/**
 * The public origin of the current request, e.g. `https://westride.app`, for
 * building absolute links in emails sent from server actions. Honors the
 * forwarding headers Vercel and most proxies set.
 */
export async function requestOrigin(): Promise<string> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const protocol =
    incoming.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${protocol}://${host}`;
}
