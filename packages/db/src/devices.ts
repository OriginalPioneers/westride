// ---------------------------------------------------------------------------
// Supporter devices: pairing, heartbeats, and leasing volunteer jobs.
// ---------------------------------------------------------------------------
import { and, asc, desc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { agentJobs, agents, type Agent, type AgentJob } from "./agent-schema";
import {
  agentRuns,
  projectRepos,
  projects,
  tickets,
  type AgentRun,
  type Project,
  type ProjectRepo,
  type Ticket,
} from "./build-schema";
import { getDb } from "./client";
import { devicePairingCodes, devices, pledges, type Device, type DevicePairingCode } from "./support-schema";

/** A device that has not checked in for this long is shown offline and gets no work. */
export const DEVICE_ONLINE_WINDOW_MS = 3 * 60 * 1000;

/** How long a leased job may go without a heartbeat before it is taken back. */
export const JOB_LEASE_MS = 10 * 60 * 1000;

/** A volunteer job nobody picks up in this long is closed as failed. */
export const VOLUNTEER_QUEUE_TIMEOUT_MS = 6 * 60 * 60 * 1000;

const PAIRING_CODE_TTL_MS = 15 * 60 * 1000;
const PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function isDeviceOnline(device: Pick<Device, "lastSeenAt" | "status">, now = new Date()): boolean {
  return (
    device.status === "ACTIVE" &&
    device.lastSeenAt !== null &&
    now.getTime() - device.lastSeenAt.getTime() < DEVICE_ONLINE_WINDOW_MS
  );
}

// ---------------------------------------------------------------------------
// Pairing
// ---------------------------------------------------------------------------

function randomCode(length: number): string {
  let code = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) {
    code += PAIRING_ALPHABET[byte % PAIRING_ALPHABET.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** A fresh code for the member to type into the runner. Older unused codes are dropped. */
export async function createPairingCode(clerkUserId: string): Promise<DevicePairingCode> {
  const db = getDb();
  await db
    .delete(devicePairingCodes)
    .where(and(eq(devicePairingCodes.clerkUserId, clerkUserId), isNull(devicePairingCodes.usedAt)));
  for (let attempt = 0; attempt < 5; attempt++) {
    const [row] = await db
      .insert(devicePairingCodes)
      .values({
        code: randomCode(8),
        clerkUserId,
        expiresAt: new Date(Date.now() + PAIRING_CODE_TTL_MS),
      })
      .onConflictDoNothing()
      .returning();
    if (row) {
      return row;
    }
  }
  throw new Error("A pairing code could not be made.");
}

export async function getPendingPairingCode(clerkUserId: string): Promise<DevicePairingCode | null> {
  const row = await getDb().query.devicePairingCodes.findFirst({
    where: and(
      eq(devicePairingCodes.clerkUserId, clerkUserId),
      isNull(devicePairingCodes.usedAt),
      gt(devicePairingCodes.expiresAt, new Date()),
    ),
    orderBy: [desc(devicePairingCodes.createdAt)],
  });
  return row ?? null;
}

export type PairDeviceInput = {
  code: string;
  name: string;
  tokenHash: string;
  os: string;
  arch: string;
  cpus: number;
  memoryMb: number;
  runnerVersion: string;
};

/**
 * Trades a pairing code for a device row. The code is spent atomically, so
 * two runners racing with the same code cannot both succeed.
 */
export async function pairDevice(input: PairDeviceInput): Promise<Device | null> {
  const db = getDb();
  const now = new Date();
  const [spent] = await db
    .update(devicePairingCodes)
    .set({ usedAt: now })
    .where(
      and(
        eq(devicePairingCodes.code, input.code.trim().toUpperCase()),
        isNull(devicePairingCodes.usedAt),
        gt(devicePairingCodes.expiresAt, now),
      ),
    )
    .returning({ clerkUserId: devicePairingCodes.clerkUserId });
  if (!spent) {
    return null;
  }
  const [device] = await db
    .insert(devices)
    .values({
      clerkUserId: spent.clerkUserId,
      name: input.name,
      tokenHash: input.tokenHash,
      os: input.os,
      arch: input.arch,
      cpus: input.cpus,
      memoryMb: input.memoryMb,
      runnerVersion: input.runnerVersion,
      lastSeenAt: now,
    })
    .returning();
  return device ?? null;
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export async function getDeviceByTokenHash(tokenHash: string): Promise<Device | null> {
  const row = await getDb().query.devices.findFirst({ where: eq(devices.tokenHash, tokenHash) });
  return row ?? null;
}

export async function getDevice(id: string): Promise<Device | null> {
  const row = await getDb().query.devices.findFirst({ where: eq(devices.id, id) });
  return row ?? null;
}

export async function listDevicesForSupporter(clerkUserId: string): Promise<Device[]> {
  return getDb().query.devices.findMany({
    where: and(eq(devices.clerkUserId, clerkUserId), eq(devices.status, "ACTIVE")),
    orderBy: [asc(devices.createdAt)],
  });
}

export async function renameDevice(id: string, clerkUserId: string, name: string): Promise<boolean> {
  const rows = await getDb()
    .update(devices)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(devices.id, id), eq(devices.clerkUserId, clerkUserId)))
    .returning({ id: devices.id });
  return rows.length > 0;
}

/** Ends the device's token. Its runner is refused on its next request. */
export async function revokeDevice(id: string, clerkUserId: string): Promise<boolean> {
  const rows = await getDb()
    .update(devices)
    .set({ status: "REVOKED", updatedAt: new Date() })
    .where(and(eq(devices.id, id), eq(devices.clerkUserId, clerkUserId)))
    .returning({ id: devices.id });
  return rows.length > 0;
}

export type HeartbeatInput = {
  os: string;
  arch: string;
  cpus: number;
  memoryMb: number;
  runnerVersion: string;
  models: string[];
  hasMetaKey: boolean;
};

export async function recordHeartbeat(deviceId: string, input: HeartbeatInput): Promise<void> {
  const now = new Date();
  await getDb()
    .update(devices)
    .set({ ...input, lastSeenAt: now, updatedAt: now })
    .where(eq(devices.id, deviceId));
}

// ---------------------------------------------------------------------------
// Leasing
// ---------------------------------------------------------------------------

export type LeasedJob = { job: AgentJob; agent: Agent };

function deviceCanServe(device: Device, agent: Agent): boolean {
  if (device.hasMetaKey) {
    return true;
  }
  return Boolean(agent.volunteerLocalModel && device.models.includes(agent.volunteerLocalModel));
}

/**
 * Hands the device one queued volunteer job it is allowed to run: the agent
 * opted in, its repository is public, the device's owner has an active
 * COMPUTE pledge on the agent's idea, and the device can serve the model.
 * Claiming is a conditional update, so two devices never take the same job.
 */
export async function leaseJobForDevice(device: Device): Promise<LeasedJob | null> {
  if (device.status !== "ACTIVE") {
    return null;
  }
  const db = getDb();
  const now = new Date();
  const ideaIds = db
    .select({ ideaId: pledges.ideaId })
    .from(pledges)
    .where(
      and(
        eq(pledges.clerkUserId, device.clerkUserId),
        eq(pledges.kind, "COMPUTE"),
        eq(pledges.status, "ACTIVE"),
      ),
    );
  const candidates = await db
    .select({ job: agentJobs, agent: agents })
    .from(agentJobs)
    .innerJoin(agents, eq(agents.id, agentJobs.agentId))
    .where(
      and(
        eq(agentJobs.runnerKind, "VOLUNTEER_DEVICE"),
        eq(agentJobs.status, "QUEUED"),
        isNull(agentJobs.deviceId),
        eq(agents.allowVolunteerCompute, true),
        eq(agents.status, "ACTIVE"),
        eq(agents.repoIsPrivate, false),
        inArray(agents.ideaId, ideaIds),
      ),
    )
    .orderBy(asc(agentJobs.createdAt))
    .limit(10);

  for (const candidate of candidates) {
    if (!deviceCanServe(device, candidate.agent)) {
      continue;
    }
    const [claimed] = await db
      .update(agentJobs)
      .set({
        deviceId: device.id,
        status: "RUNNING",
        startedAt: now,
        leaseExpiresAt: new Date(now.getTime() + JOB_LEASE_MS),
      })
      .where(
        and(
          eq(agentJobs.id, candidate.job.id),
          eq(agentJobs.status, "QUEUED"),
          isNull(agentJobs.deviceId),
        ),
      )
      .returning();
    if (claimed) {
      await db
        .update(devices)
        .set({ currentJobId: claimed.id, lastSeenAt: now, updatedAt: now })
        .where(eq(devices.id, device.id));
      return { job: claimed, agent: candidate.agent };
    }
  }
  return null;
}

/** A heartbeat from the device running the job keeps its lease alive. */
export async function extendJobLease(jobId: string, deviceId: string): Promise<boolean> {
  const rows = await getDb()
    .update(agentJobs)
    .set({ leaseExpiresAt: new Date(Date.now() + JOB_LEASE_MS) })
    .where(
      and(eq(agentJobs.id, jobId), eq(agentJobs.deviceId, deviceId), eq(agentJobs.status, "RUNNING")),
    )
    .returning({ id: agentJobs.id });
  return rows.length > 0;
}

export async function clearDeviceJob(deviceId: string, jobId: string, completed: boolean): Promise<void> {
  await getDb()
    .update(devices)
    .set({
      currentJobId: null,
      jobsCompleted: completed ? sql`${devices.jobsCompleted} + 1` : devices.jobsCompleted,
      updatedAt: new Date(),
    })
    .where(and(eq(devices.id, deviceId), eq(devices.currentJobId, jobId)));
}

/** Volunteer jobs whose device went quiet, or that no device ever took. */
export async function listExpiredVolunteerJobs(now = new Date()): Promise<AgentJob[]> {
  const db = getDb();
  const [leased, unclaimed] = await Promise.all([
    db.query.agentJobs.findMany({
      where: and(
        eq(agentJobs.runnerKind, "VOLUNTEER_DEVICE"),
        eq(agentJobs.status, "RUNNING"),
        lt(agentJobs.leaseExpiresAt, now),
      ),
      limit: 20,
    }),
    db.query.agentJobs.findMany({
      where: and(
        eq(agentJobs.runnerKind, "VOLUNTEER_DEVICE"),
        eq(agentJobs.status, "QUEUED"),
        isNull(agentJobs.deviceId),
        lt(agentJobs.createdAt, new Date(now.getTime() - VOLUNTEER_QUEUE_TIMEOUT_MS)),
      ),
      limit: 20,
    }),
  ]);
  return [...leased, ...unclaimed];
}

/**
 * Whether any online device could take a job for this agent right now. Used
 * before queueing, so a job is not parked where nobody will pick it up.
 */
export async function hasEligibleDevice(agent: Agent): Promise<boolean> {
  if (!agent.ideaId || !agent.allowVolunteerCompute || agent.repoIsPrivate !== false) {
    return false;
  }
  const db = getDb();
  const supporterIds = db
    .select({ clerkUserId: pledges.clerkUserId })
    .from(pledges)
    .where(
      and(eq(pledges.ideaId, agent.ideaId), eq(pledges.kind, "COMPUTE"), eq(pledges.status, "ACTIVE")),
    );
  const online = await db.query.devices.findMany({
    where: and(
      eq(devices.status, "ACTIVE"),
      inArray(devices.clerkUserId, supporterIds),
      gt(devices.lastSeenAt, new Date(Date.now() - DEVICE_ONLINE_WINDOW_MS)),
    ),
    limit: 50,
  });
  return online.some((device) => deviceCanServe(device, agent));
}

// ---------------------------------------------------------------------------
// Project Factory runs on linked computers
//
// A ticket run whose compute target is LOCAL waits for one of the starter's
// own computers; SPONSORS waits for a computer whose owner has an active
// COMPUTE pledge on the project's idea. Both use the same runner and the
// same lease protocol as Agent Studio's volunteer jobs.
// ---------------------------------------------------------------------------

export type LeasedRun = {
  run: AgentRun;
  project: Project;
  ticket: Ticket | null;
  /** The linked repository row, when it is still linked. */
  repo: ProjectRepo | null;
};

/** Whether the device has what the run asked for: the local model, or a Meta key. */
export function deviceCanServeRun(
  device: Pick<Device, "hasMetaKey" | "models">,
  run: Pick<AgentRun, "localModel">,
): boolean {
  if (run.localModel) {
    return device.models.includes(run.localModel);
  }
  return device.hasMetaKey;
}

/** The queued device runs this computer may take, oldest first. */
async function queuedRunsForDevice(device: Device): Promise<LeasedRun[]> {
  const db = getDb();
  const sponsoredIdeaIds = db
    .select({ ideaId: pledges.ideaId })
    .from(pledges)
    .where(
      and(
        eq(pledges.clerkUserId, device.clerkUserId),
        eq(pledges.kind, "COMPUTE"),
        eq(pledges.status, "ACTIVE"),
      ),
    );
  const rows = await db
    .select({ run: agentRuns, project: projects, ticket: tickets, repo: projectRepos })
    .from(agentRuns)
    .innerJoin(projects, eq(projects.id, agentRuns.projectId))
    .leftJoin(tickets, eq(tickets.id, agentRuns.ticketId))
    .leftJoin(projectRepos, eq(projectRepos.id, agentRuns.repoId))
    .where(
      and(
        eq(agentRuns.runnerKind, "VOLUNTEER_DEVICE"),
        eq(agentRuns.status, "QUEUED"),
        isNull(agentRuns.deviceId),
        or(
          and(eq(agentRuns.computeTarget, "LOCAL"), eq(agentRuns.startedByClerkUserId, device.clerkUserId)),
          and(eq(agentRuns.computeTarget, "SPONSORS"), inArray(projects.ideaId, sponsoredIdeaIds)),
        ),
      ),
    )
    .orderBy(asc(agentRuns.createdAt))
    .limit(10);
  return rows;
}

/**
 * Hands the device one queued Project Factory run it may take. Claiming is a
 * conditional update, so two computers never take the same run.
 */
export async function leaseRunForDevice(device: Device): Promise<LeasedRun | null> {
  if (device.status !== "ACTIVE") {
    return null;
  }
  const db = getDb();
  const now = new Date();
  for (const candidate of await queuedRunsForDevice(device)) {
    if (!deviceCanServeRun(device, candidate.run)) {
      continue;
    }
    const [claimed] = await db
      .update(agentRuns)
      .set({
        deviceId: device.id,
        status: "RUNNING",
        startedAt: now,
        leaseExpiresAt: new Date(now.getTime() + JOB_LEASE_MS),
      })
      .where(
        and(eq(agentRuns.id, candidate.run.id), eq(agentRuns.status, "QUEUED"), isNull(agentRuns.deviceId)),
      )
      .returning();
    if (claimed) {
      await db
        .update(devices)
        .set({ currentJobId: claimed.id, lastSeenAt: now, updatedAt: now })
        .where(eq(devices.id, device.id));
      return { run: claimed, project: candidate.project, ticket: candidate.ticket, repo: candidate.repo };
    }
  }
  return null;
}

/** A heartbeat from the device running the run keeps its lease alive. */
export async function extendRunLease(runId: string, deviceId: string): Promise<boolean> {
  const rows = await getDb()
    .update(agentRuns)
    .set({ leaseExpiresAt: new Date(Date.now() + JOB_LEASE_MS) })
    .where(and(eq(agentRuns.id, runId), eq(agentRuns.deviceId, deviceId), eq(agentRuns.status, "RUNNING")))
    .returning({ id: agentRuns.id });
  return rows.length > 0;
}

/** The member's own linked computers that have checked in recently. */
export async function listOnlineDevicesForUser(clerkUserId: string): Promise<Device[]> {
  return getDb().query.devices.findMany({
    where: and(
      eq(devices.clerkUserId, clerkUserId),
      eq(devices.status, "ACTIVE"),
      gt(devices.lastSeenAt, new Date(Date.now() - DEVICE_ONLINE_WINDOW_MS)),
    ),
    orderBy: [asc(devices.createdAt)],
    limit: 50,
  });
}

/** Online computers whose owners pledged compute to an idea. */
export async function listOnlineSponsorDevicesForIdea(ideaId: string): Promise<Device[]> {
  const db = getDb();
  const supporterIds = db
    .select({ clerkUserId: pledges.clerkUserId })
    .from(pledges)
    .where(and(eq(pledges.ideaId, ideaId), eq(pledges.kind, "COMPUTE"), eq(pledges.status, "ACTIVE")));
  return db.query.devices.findMany({
    where: and(
      eq(devices.status, "ACTIVE"),
      inArray(devices.clerkUserId, supporterIds),
      gt(devices.lastSeenAt, new Date(Date.now() - DEVICE_ONLINE_WINDOW_MS)),
    ),
    orderBy: [asc(devices.createdAt)],
    limit: 50,
  });
}

/** Online devices pledged to an idea, for the idea page. */
export async function countOnlineDevicesForIdea(ideaId: string): Promise<number> {
  const db = getDb();
  const supporterIds = db
    .select({ clerkUserId: pledges.clerkUserId })
    .from(pledges)
    .where(and(eq(pledges.ideaId, ideaId), eq(pledges.kind, "COMPUTE"), eq(pledges.status, "ACTIVE")));
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(devices)
    .where(
      and(
        eq(devices.status, "ACTIVE"),
        inArray(devices.clerkUserId, supporterIds),
        gt(devices.lastSeenAt, new Date(Date.now() - DEVICE_ONLINE_WINDOW_MS)),
      ),
    );
  return Number(row?.count ?? 0);
}
