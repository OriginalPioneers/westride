import "server-only";

import { cache } from "react";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * The role that opens the portal. Lives in the member's Clerk public
 * metadata as `{"role": "admin"}` or `{"roles": ["admin"]}`, set from the
 * Clerk Dashboard or from this portal's Users page.
 */
export const ADMIN_ROLE = process.env.ADMIN_ROLE?.trim() || "admin";

export function metadataGrantsAdmin(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }
  const { role, roles } = metadata as { role?: unknown; roles?: unknown };
  if (typeof role === "string" && role === ADMIN_ROLE) {
    return true;
  }
  return Array.isArray(roles) && roles.some((entry) => entry === ADMIN_ROLE);
}

export type AdminViewer = {
  userId: string | null;
  isAdmin: boolean;
};

/**
 * Who is asking, and whether they may be here. The session token carries
 * the public metadata when the Clerk application is set up to include it
 * (see .env.example); otherwise the user record is fetched once per request.
 */
export const getAdminViewer = cache(async (): Promise<AdminViewer> => {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return { userId: null, isAdmin: false };
  }
  const claims = sessionClaims as { metadata?: unknown; publicMetadata?: unknown } | null;
  if (metadataGrantsAdmin(claims?.metadata) || metadataGrantsAdmin(claims?.publicMetadata)) {
    return { userId, isAdmin: true };
  }
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return { userId, isAdmin: metadataGrantsAdmin(user.publicMetadata) };
  } catch (error) {
    console.error("Admin role lookup failed", error);
    return { userId, isAdmin: false };
  }
});

export type ActionFailure = { status: "error"; message: string };

export function failure(message: string): ActionFailure {
  return { status: "error", message };
}

/**
 * For server actions: the admin's Clerk user id, or a failure to hand back
 * to the client. Every action checks this itself; the layout's check only
 * decides what is rendered.
 */
export async function requireAdminForAction(): Promise<string | ActionFailure> {
  const viewer = await getAdminViewer();
  if (!viewer.userId) {
    return failure("Sign in to continue.");
  }
  if (!viewer.isAdmin) {
    return failure("Your account does not have admin access.");
  }
  return viewer.userId;
}
