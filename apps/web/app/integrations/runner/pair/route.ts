import type { NextRequest } from "next/server";
import { z } from "zod";
import { pairDevice } from "@westride/db/devices";
import type { PairResponse } from "@westride/runner-protocol";
import { isVolunteerRunnerConfigured } from "@/lib/build/agent/config";
import { createRunToken } from "@/lib/build/agent/token";
import { json } from "@/lib/runner/auth";

/**
 * A freshly installed runner trades the pairing code from Settings for a
 * device token. The token is shown to the runner once; WeStride stores its
 * hash. proxy.ts lets this path through its user-agent filter.
 */

const bodySchema = z.object({
  code: z.string().trim().min(6).max(12),
  name: z.string().trim().min(1).max(80),
  os: z.string().trim().max(40).default(""),
  arch: z.string().trim().max(40).default(""),
  cpus: z.number().int().min(0).max(1024).default(0),
  memoryMb: z.number().int().min(0).max(16_000_000).default(0),
  runnerVersion: z.string().trim().max(40).default(""),
});

export async function POST(request: NextRequest) {
  if (!isVolunteerRunnerConfigured()) {
    return json(503, { error: "Supporter devices are not set up on this server." });
  }
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return json(400, { error: "Bad pairing request." });
  }
  const { token, hash } = createRunToken();
  const device = await pairDevice({ ...parsed, tokenHash: hash });
  if (!device) {
    return json(404, { error: "That pairing code is not valid. Make a new one in Settings." });
  }
  const body: PairResponse = { deviceId: device.id, deviceToken: token };
  return json(200, body);
}
