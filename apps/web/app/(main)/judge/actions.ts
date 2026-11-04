"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { judgeClerkUserId } from "@/lib/judge-access";

export type JudgeSessionOutcome =
  | { status: "ok"; token: string }
  | { status: "error"; message: string };

/** A ticket is consumed on first use, so it only needs to outlive one page load. */
const TOKEN_LIFETIME_SECONDS = 5 * 60;

// A small per-instance brake on token minting. Judges click once; a loop
// hitting this action from one address is not a judge.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 20;
const recentRequests = new Map<string, number[]>();

async function isRateLimited(): Promise<boolean> {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const recent = (recentRequests.get(ip) ?? []).filter((at) => now - at < RATE_WINDOW_MS);
  recent.push(now);
  recentRequests.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

/**
 * Mints a short-lived Clerk sign-in token for the shared judge account. The
 * browser exchanges it for a session with the `ticket` sign-in strategy.
 */
export async function startJudgeSession(): Promise<JudgeSessionOutcome> {
  const userId = judgeClerkUserId();
  if (userId === null) {
    return { status: "error", message: "Judge access is not open right now." };
  }
  if (await isRateLimited()) {
    return { status: "error", message: "Too many attempts from this connection. Try again in a few minutes." };
  }
  try {
    const client = await clerkClient();
    const token = await client.signInTokens.createSignInToken({
      userId,
      expiresInSeconds: TOKEN_LIFETIME_SECONDS,
    });
    return { status: "ok", token: token.token };
  } catch (error) {
    console.error("Judge sign-in token failed", error);
    return { status: "error", message: "WeStride could not start the judge session. Try again in a moment." };
  }
}
