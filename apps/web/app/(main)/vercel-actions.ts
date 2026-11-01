"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  DEFAULT_SANDBOX_PROJECT_NAME,
  VercelApiError,
  createVercelProject,
  isVercelAuthError,
  listVercelProjects,
  listVercelTeams,
  pollVercelDeviceAuthorization,
  startVercelDeviceAuthorization,
  vercelDeviceClientId,
  type VercelProject,
  type VercelTeam,
} from "@/lib/vercel/api";
import {
  disconnectVercelAccount,
  getVercelAccessToken,
  isVercelConnectionConfigured,
  saveVercelAccessToken,
  saveVercelAccount,
  setVercelScope,
  type VercelConnectionSummary,
} from "@/lib/vercel/connection";

type Failure = { status: "error"; message: string };

function failure(message: string): Failure {
  return { status: "error", message };
}

const NOT_CONFIGURED = "Connecting Vercel is not set up on this WeStride server yet.";
const RECONNECT = "Vercel no longer accepts this connection. Connect again.";
const tokenSchema = z.string().trim().min(8).max(512);
const idSchema = z.string().trim().min(1).max(200);
/** Vercel project names: lowercase, digits, ".", "_", "-"; up to 100 characters. */
const projectNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9._-]+$/, "Use lowercase letters, digits, dots, underscores, and hyphens.");

function describe(error: unknown, fallback: string): string {
  if (error instanceof VercelApiError) {
    return isVercelAuthError(error) ? "Vercel rejected that token." : error.message;
  }
  return fallback;
}

export type VercelConnectStart = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  intervalSeconds: number;
  expiresInSeconds: number;
};

export async function startVercelConnect(): Promise<
  { status: "ok"; start: VercelConnectStart } | Failure
> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in first.");
  }
  if (!isVercelConnectionConfigured()) {
    return failure(NOT_CONFIGURED);
  }
  const clientId = vercelDeviceClientId();
  if (!clientId) {
    return failure("Signing in with Vercel is not configured. Paste an access token instead.");
  }
  try {
    const start = await startVercelDeviceAuthorization(clientId);
    return { status: "ok", start };
  } catch (error) {
    console.error("Vercel device authorization failed", error);
    return failure(describe(error, "Vercel sign-in could not be started."));
  }
}

export type VercelConnectPoll =
  | { status: "pending" }
  | { status: "slow_down"; intervalSeconds: number }
  | { status: "connected"; connection: VercelConnectionSummary }
  | { status: "denied" }
  | { status: "expired" }
  | Failure;

/** Once the member approves on Vercel's site, keeps the token on their account. */
export async function pollVercelConnect(deviceCode: string): Promise<VercelConnectPoll> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in first.");
  }
  const clientId = vercelDeviceClientId();
  if (!clientId || !isVercelConnectionConfigured() || typeof deviceCode !== "string" || !deviceCode) {
    return failure("Vercel sign-in is not available.");
  }
  try {
    const poll = await pollVercelDeviceAuthorization(clientId, deviceCode);
    if (poll.status !== "authorized") {
      return poll;
    }
    const connection = await saveVercelAccount(userId, poll.tokens);
    revalidatePath("/settings");
    return { status: "connected", connection };
  } catch (error) {
    console.error("Vercel device poll failed", error);
    return failure(describe(error, "Vercel sign-in failed."));
  }
}

/** Confirms a pasted access token works, then keeps it on the member's account. */
export async function connectVercelToken(
  token: string,
): Promise<{ status: "connected"; connection: VercelConnectionSummary } | Failure> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in first.");
  }
  if (!isVercelConnectionConfigured()) {
    return failure(NOT_CONFIGURED);
  }
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) {
    return failure("That does not look like a Vercel access token.");
  }
  try {
    const connection = await saveVercelAccessToken(userId, parsed.data);
    revalidatePath("/settings");
    return { status: "connected", connection };
  } catch (error) {
    console.error("Vercel token check failed", error);
    return failure(describe(error, "Vercel could not be reached. Try again in a moment."));
  }
}

export type VercelScopeOptions = {
  teams: VercelTeam[];
  /** Projects of `teamId`, when one was asked for. */
  projects: VercelProject[];
  teamId: string | null;
};

/**
 * The teams the connection can act for and, for one team, its projects, so
 * the member can pick where sandboxes run.
 */
export async function loadVercelScopeOptions(
  teamId?: string | null,
): Promise<{ status: "ok"; options: VercelScopeOptions } | Failure> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in first.");
  }
  try {
    const token = await getVercelAccessToken(userId);
    if (!token) {
      return failure(RECONNECT);
    }
    const teams = await listVercelTeams(token);
    const parsedTeam = teamId ? idSchema.safeParse(teamId) : null;
    const chosen =
      (parsedTeam?.success ? teams.find((team) => team.id === parsedTeam.data) : null) ??
      (teams.length === 1 ? teams[0] : null) ??
      null;
    const projects = chosen ? await listVercelProjects(token, chosen.id) : [];
    return { status: "ok", options: { teams, projects, teamId: chosen?.id ?? null } };
  } catch (error) {
    console.error("Vercel scope lookup failed", error);
    return failure(describe(error, "Vercel could not be reached. Try again in a moment."));
  }
}

export type VercelScopeChoice = {
  teamId: string;
  /** An existing project's id, or omit it to create `newProjectName`. */
  projectId?: string | null;
  newProjectName?: string | null;
};

/** Records the team and project; creates the project when asked. */
export async function chooseVercelScope(
  choice: VercelScopeChoice,
): Promise<{ status: "ok"; connection: VercelConnectionSummary } | Failure> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in first.");
  }
  const teamId = idSchema.safeParse(choice?.teamId);
  if (!teamId.success) {
    return failure("Choose a team.");
  }
  try {
    const token = await getVercelAccessToken(userId);
    if (!token) {
      return failure(RECONNECT);
    }
    const team = (await listVercelTeams(token)).find((candidate) => candidate.id === teamId.data);
    if (!team) {
      return failure("That team is not available to this Vercel account.");
    }

    let project: VercelProject | null = null;
    if (choice.projectId) {
      const projectId = idSchema.safeParse(choice.projectId);
      if (!projectId.success) {
        return failure("Choose a project.");
      }
      project =
        (await listVercelProjects(token, team.id)).find((candidate) => candidate.id === projectId.data) ??
        null;
      if (!project) {
        return failure("That project is not in the chosen team.");
      }
    } else {
      const name = projectNameSchema.safeParse(choice.newProjectName ?? DEFAULT_SANDBOX_PROJECT_NAME);
      if (!name.success) {
        return failure(name.error.issues[0]?.message ?? "Choose a project name.");
      }
      const existing = (await listVercelProjects(token, team.id)).find(
        (candidate) => candidate.name === name.data,
      );
      project = existing ?? (await createVercelProject(token, team.id, name.data));
    }

    const connection = await setVercelScope(userId, {
      teamId: team.id,
      teamSlug: team.slug,
      teamName: team.name,
      projectId: project.id,
      projectName: project.name,
    });
    if (!connection) {
      return failure(RECONNECT);
    }
    revalidatePath("/settings");
    return { status: "ok", connection };
  } catch (error) {
    console.error("Vercel scope save failed", error);
    return failure(describe(error, "Vercel could not be reached. Try again in a moment."));
  }
}

export async function disconnectVercel(): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    return;
  }
  await disconnectVercelAccount(userId);
  revalidatePath("/settings");
}
