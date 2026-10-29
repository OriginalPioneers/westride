import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

/** What the settings page reports after a round trip to GitHub. */
export type GithubFlowOutcome =
  | "connected"
  | "requested"
  | "denied"
  | "expired"
  | "failed"
  | "unavailable";

const COOKIE = "westride_github_flow";
const COOKIE_PATH = "/integrations/github";
const TEN_MINUTES = 10 * 60;

type FlowState = { state: string; returnTo: string; clerkUserId: string };

export const DEFAULT_RETURN_TO = "/settings";

/** Only same-site paths, so the callback cannot be used as an open redirect. */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return DEFAULT_RETURN_TO;
  }
  return value;
}

export function returnUrl(
  request: NextRequest,
  returnTo: string,
  outcome: GithubFlowOutcome,
): URL {
  const url = new URL(returnTo, request.nextUrl.origin);
  url.searchParams.set("github", outcome);
  return url;
}

export function newFlow(returnTo: string, clerkUserId: string): FlowState {
  return { state: randomBytes(24).toString("base64url"), returnTo, clerkUserId };
}

/** Remembers the flow so the callback can prove GitHub is answering our request. */
export function saveFlow(response: NextResponse, flow: FlowState): NextResponse {
  response.cookies.set(COOKIE, JSON.stringify(flow), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: TEN_MINUTES,
  });
  return response;
}

export function readFlow(request: NextRequest): FlowState | null {
  const raw = request.cookies.get(COOKIE)?.value;
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<FlowState>;
    if (
      typeof parsed.state !== "string" ||
      typeof parsed.returnTo !== "string" ||
      typeof parsed.clerkUserId !== "string"
    ) {
      return null;
    }
    return {
      state: parsed.state,
      returnTo: safeReturnTo(parsed.returnTo),
      clerkUserId: parsed.clerkUserId,
    };
  } catch {
    return null;
  }
}

export function stateMatches(flow: FlowState, state: string | null): boolean {
  if (!state) {
    return false;
  }
  const expected = Buffer.from(flow.state);
  const actual = Buffer.from(state);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function endFlow(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE, "", { path: COOKIE_PATH, maxAge: 0 });
  return response;
}
