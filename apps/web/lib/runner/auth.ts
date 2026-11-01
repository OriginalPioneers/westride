import "server-only";

import type { Device } from "@westride/db";
import { getDeviceByTokenHash } from "@westride/db/devices";
import { hashRunToken } from "@/lib/build/agent/token";

/**
 * A device authenticates with the token it was handed at pairing. Only the
 * hash is stored, so the lookup hashes what the request carries. Revoked
 * devices are refused the same way as unknown ones.
 */
export async function authenticateDevice(request: Request): Promise<Device | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token || token.length < 32 || token.length > 128) {
    return null;
  }
  const device = await getDeviceByTokenHash(hashRunToken(token));
  if (!device || device.status !== "ACTIVE") {
    return null;
  }
  return device;
}

export function json(status: number, body: unknown) {
  return Response.json(body, { status });
}
