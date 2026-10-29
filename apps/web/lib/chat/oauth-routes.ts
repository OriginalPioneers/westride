import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { saveChatConnection } from "@westride/db/chat";
import { NextResponse, type NextRequest } from "next/server";
import type { ChatOAuthProvider } from "./providers";

/** What the settings page reports after a round trip to a chat platform. */
export type ChatFlowOutcome = "connected" | "denied" | "expired" | "failed" | "unavailable";

const SETTINGS_PATH = "/settings";
const TEN_MINUTES = 10 * 60;

type FlowState = { state: string; clerkUserId: string };

function cookieName(provider: ChatOAuthProvider) {
  return `westride_${provider.slug}_flow`;
}

function cookiePath(provider: ChatOAuthProvider) {
  return `/integrations/${provider.slug}`;
}

function callbackUrl(request: NextRequest, provider: ChatOAuthProvider) {
  return `${request.nextUrl.origin}${cookiePath(provider)}/callback`;
}

function settingsUrl(
  request: NextRequest,
  provider: ChatOAuthProvider,
  outcome: ChatFlowOutcome,
) {
  const url = new URL(SETTINGS_PATH, request.nextUrl.origin);
  url.searchParams.set(provider.slug, outcome);
  return url;
}

function readFlow(request: NextRequest, provider: ChatOAuthProvider): FlowState | null {
  const raw = request.cookies.get(cookieName(provider))?.value;
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<FlowState>;
    return typeof parsed.state === "string" && typeof parsed.clerkUserId === "string"
      ? { state: parsed.state, clerkUserId: parsed.clerkUserId }
      : null;
  } catch {
    return null;
  }
}

function stateMatches(flow: FlowState, state: string | null): boolean {
  if (!state) {
    return false;
  }
  const expected = Buffer.from(flow.state);
  const actual = Buffer.from(state);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** `GET /integrations/<platform>/connect`: sends the member to sign in on the platform. */
export function connectHandler(provider: ChatOAuthProvider) {
  return async function GET(request: NextRequest) {
    const { userId, redirectToSignIn } = await auth();
    if (!userId) {
      return redirectToSignIn({ returnBackUrl: request.nextUrl.toString() });
    }
    if (!provider.isConfigured()) {
      return NextResponse.redirect(settingsUrl(request, provider, "unavailable"));
    }
    const flow: FlowState = { state: randomBytes(24).toString("base64url"), clerkUserId: userId };
    const response = NextResponse.redirect(
      provider.authorizeUrl(flow.state, callbackUrl(request, provider)),
    );
    response.cookies.set(cookieName(provider), JSON.stringify(flow), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: cookiePath(provider),
      maxAge: TEN_MINUTES,
    });
    return response;
  };
}

/** `GET /integrations/<platform>/callback`: links the account the member signed in with. */
export function callbackHandler(provider: ChatOAuthProvider) {
  return async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const { userId, redirectToSignIn } = await auth();
    if (!userId) {
      return redirectToSignIn({
        returnBackUrl: `${request.nextUrl.origin}${SETTINGS_PATH}`,
      });
    }
    const finish = (outcome: ChatFlowOutcome) => {
      const response = NextResponse.redirect(settingsUrl(request, provider, outcome));
      response.cookies.set(cookieName(provider), "", { path: cookiePath(provider), maxAge: 0 });
      return response;
    };

    if (!provider.isConfigured()) {
      return finish("unavailable");
    }
    if (params.get("error")) {
      return finish("denied");
    }
    const flow = readFlow(request, provider);
    const code = params.get("code");
    if (!code || !flow || flow.clerkUserId !== userId || !stateMatches(flow, params.get("state"))) {
      return finish("expired");
    }

    try {
      const identity = await provider.identify(code, callbackUrl(request, provider));
      await saveChatConnection({ clerkUserId: userId, platform: provider.platform, ...identity });
      return finish("connected");
    } catch (error) {
      console.error(`${provider.label} connect failed`, error);
      return finish("failed");
    }
  };
}
