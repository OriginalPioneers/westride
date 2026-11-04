/**
 * Hackathon judge access: a temporary route that signs a visitor in to a
 * shared, pre-funded WeStride account without a password, so judges can use
 * the live site without signing up. Switched on by
 * NEXT_PUBLIC_HACKATHON_JUDGE_ACCESS="1" (public, so the nav can read it) and
 * pointed at a Clerk user by HACKATHON_JUDGE_CLERK_USER_ID (server only).
 * The main layout passes that id into the nav, which compares it with the
 * signed-in Clerk user. The id is not a credential; sign-in tokens are
 * minted only on the server.
 */

export const judgeAccessPath = "/judge";

/** Where a judge lands once signed in. */
export const judgeHomePath = "/build";

/** Readable on the client: whether hackathon judge access is switched on. */
export function isJudgeAccessShown(): boolean {
  return process.env.NEXT_PUBLIC_HACKATHON_JUDGE_ACCESS === "1";
}

/**
 * The nav entry is for visitors who are not signed in, and for the shared
 * judge account. Any other signed-in member does not see it. It stays hidden
 * until Clerk has resolved auth, so a signed-in member never flashes the button.
 */
export function isJudgeNavVisible({
  authLoaded,
  userId,
  judgeUserId,
}: {
  authLoaded: boolean;
  userId: string | null | undefined;
  judgeUserId: string | null;
}): boolean {
  if (!isJudgeAccessShown() || !authLoaded) return false;
  if (userId == null) return true;
  return judgeUserId != null && userId === judgeUserId;
}

/** Server only: the Clerk user judges sign in as, when the feature is live. */
export function judgeClerkUserId(): string | null {
  if (!isJudgeAccessShown()) return null;
  const id = process.env.HACKATHON_JUDGE_CLERK_USER_ID?.trim();
  return id ? id : null;
}
