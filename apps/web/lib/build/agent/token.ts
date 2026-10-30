import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Each run gets its own bearer token. The sandbox holds the token; WeStride
 * stores only its hash, so a database read never yields a usable credential.
 */
export function createRunToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashRunToken(token) };
}

export function hashRunToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function runTokenMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashRunToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
