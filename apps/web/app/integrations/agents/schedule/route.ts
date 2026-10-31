import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getCronSecret } from "@/lib/agents/config";
import { runDueAgents } from "@/lib/agents/schedule";

/**
 * Runs every agent whose scheduled slot has come. Vercel Cron calls this
 * on the schedule in vercel.json with `Authorization: Bearer $CRON_SECRET`;
 * any other scheduler can do the same. Without CRON_SECRET the route is
 * closed, and only the opportunistic ticks on Agent Studio pages run work.
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function authorised(request: NextRequest): boolean {
  const secret = getCronSecret();
  if (!secret) {
    return false;
  }
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token || token.length !== secret.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const result = await runDueAgents();
  return Response.json(result);
}
