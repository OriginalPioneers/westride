/**
 * Hackathon judge access: a temporary route that signs a visitor in to a
 * shared, pre-funded WeStride account without a password, so judges can use
 * the live site without signing up. Switched on by
 * NEXT_PUBLIC_HACKATHON_JUDGE_ACCESS="1" (public, so the nav can read it) and
 * pointed at a Clerk user by HACKATHON_JUDGE_CLERK_USER_ID (server only).
 */

export const judgeAccessPath = "/judge";

/** Where a judge lands once signed in. */
export const judgeHomePath = "/build";

/** Readable on the client: whether the nav shows the judge entry at all. */
export function isJudgeAccessShown(): boolean {
  return process.env.NEXT_PUBLIC_HACKATHON_JUDGE_ACCESS === "1";
}

/** Server only: the Clerk user judges sign in as, when the feature is live. */
export function judgeClerkUserId(): string | null {
  if (!isJudgeAccessShown()) return null;
  const id = process.env.HACKATHON_JUDGE_CLERK_USER_ID?.trim();
  return id ? id : null;
}
