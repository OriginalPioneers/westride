import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** The secret that goes in the review links. Only the email ever holds it. */
export function newReviewToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashReviewToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function reviewTokenMatches(token: string, hash: string): boolean {
  const expected = Buffer.from(hash, "hex");
  const actual = Buffer.from(hashReviewToken(token), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function claimReviewPath(requestId: string): string {
  return `/claims/${requestId}`;
}

export function claimReviewUrl(origin: string, requestId: string, token: string): string {
  const url = new URL(claimReviewPath(requestId), origin);
  url.searchParams.set("token", token);
  return url.toString();
}
