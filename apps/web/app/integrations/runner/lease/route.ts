import type { NextRequest } from "next/server";
import { recordHeartbeat } from "@westride/db/devices";
import type { LeaseResponse } from "@westride/runner-protocol";
import { leaseForDevice } from "@/lib/runner/lease";
import { authenticateDevice, json } from "@/lib/runner/auth";

/**
 * Long poll: the device asks for work and the server holds the request for
 * a while, checking for a job it may run, so an idle runner is not hammering
 * the server. Returns `{ job: null }` when nothing came up in time.
 */

export const maxDuration = 30;

const HOLD_MS = 20_000;
const CHECK_EVERY_MS = 4_000;

export async function POST(request: NextRequest) {
  const device = await authenticateDevice(request);
  if (!device) {
    return json(401, { error: "This device is not linked. Run the installer again to pair it." });
  }
  if (device.currentJobId) {
    // One job at a time. The heartbeat clears this when the job ends.
    const body: LeaseResponse = { job: null };
    return json(200, body);
  }
  // Polling counts as being alive, even between heartbeats.
  await recordHeartbeat(device.id, {
    os: device.os,
    arch: device.arch,
    cpus: device.cpus,
    memoryMb: device.memoryMb,
    runnerVersion: device.runnerVersion,
    models: device.models,
    hasMetaKey: device.hasMetaKey,
  });

  const deadline = Date.now() + HOLD_MS;
  for (;;) {
    const job = await leaseForDevice(device);
    if (job) {
      const body: LeaseResponse = { job };
      return json(200, body);
    }
    if (Date.now() + CHECK_EVERY_MS > deadline || request.signal.aborted) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, CHECK_EVERY_MS));
  }
  const body: LeaseResponse = { job: null };
  return json(200, body);
}
