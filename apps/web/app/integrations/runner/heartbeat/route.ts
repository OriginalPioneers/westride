import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAgentJob } from "@westride/db/agents";
import { extendJobLease, recordHeartbeat } from "@westride/db/devices";
import type { HeartbeatResponse } from "@westride/runner-protocol";
import { authenticateDevice, json } from "@/lib/runner/auth";

/**
 * Runners check in every minute with what they can offer. A heartbeat from
 * a device mid-job also renews the job's lease; when the job has been
 * cancelled or handed elsewhere, the reply tells the device to stop.
 */

const bodySchema = z.object({
  os: z.string().trim().max(40).default(""),
  arch: z.string().trim().max(40).default(""),
  cpus: z.number().int().min(0).max(1024).default(0),
  memoryMb: z.number().int().min(0).max(16_000_000).default(0),
  runnerVersion: z.string().trim().max(40).default(""),
  models: z.array(z.string().trim().min(1).max(120)).max(200).default([]),
  hasMetaKey: z.boolean().default(false),
  currentJobId: z.string().uuid().nullable().default(null),
});

export async function POST(request: NextRequest) {
  const device = await authenticateDevice(request);
  if (!device) {
    return json(401, { error: "This device is not linked. Run the installer again to pair it." });
  }
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return json(400, { error: "Bad heartbeat." });
  }
  const { currentJobId, ...facts } = parsed;
  await recordHeartbeat(device.id, facts);

  let dropJob = false;
  if (currentJobId) {
    const job = await getAgentJob(currentJobId);
    const stillOurs = job && job.deviceId === device.id && job.status === "RUNNING";
    dropJob = !stillOurs || !(await extendJobLease(currentJobId, device.id));
  }
  const body: HeartbeatResponse = { ok: true, dropJob };
  return json(200, body);
}
