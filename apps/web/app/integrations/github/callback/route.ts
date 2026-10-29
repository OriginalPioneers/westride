import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { getGithubConnection } from "@westride/db/github";
import { isGithubAppConfigured } from "@/lib/github/config";
import {
  DEFAULT_RETURN_TO,
  endFlow,
  newFlow,
  readFlow,
  returnUrl,
  saveFlow,
  stateMatches,
  type GithubFlowOutcome,
} from "@/lib/github/flow";
import { hasGithubInstallations } from "@/lib/github/repos";
import {
  exchangeGithubCode,
  githubAuthorizeUrl,
  githubCallbackUrl,
  githubInstallUrl,
  saveGithubAccount,
} from "@/lib/github/user";

/**
 * GitHub sends members here after they authorize the app (`code`) and after
 * they install it or change its repositories (`installation_id`). Register
 * this URL as both the app's callback URL and its setup URL.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const origin = request.nextUrl.origin;
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: `${origin}${DEFAULT_RETURN_TO}` });
  }

  const flow = readFlow(request);
  const ownFlow = flow?.clerkUserId === userId ? flow : null;
  const returnTo = ownFlow?.returnTo ?? DEFAULT_RETURN_TO;
  const finish = (outcome: GithubFlowOutcome) =>
    endFlow(NextResponse.redirect(returnUrl(request, returnTo, outcome)));
  const reauthorize = () => {
    const next = newFlow(returnTo, userId);
    return saveFlow(
      NextResponse.redirect(githubAuthorizeUrl(next.state, githubCallbackUrl(origin))),
      next,
    );
  };

  if (!isGithubAppConfigured()) {
    return finish("unavailable");
  }
  if (params.get("error")) {
    return finish("denied");
  }
  // An organization member asked an owner to approve the install.
  if (params.get("setup_action") === "request") {
    return finish("requested");
  }

  const code = params.get("code");
  const installationId = params.get("installation_id");

  if (code && ownFlow && stateMatches(ownFlow, params.get("state"))) {
    try {
      const tokens = await exchangeGithubCode(code, githubCallbackUrl(origin));
      await saveGithubAccount(userId, tokens);
      if (!installationId && !(await hasGithubInstallations(tokens.accessToken))) {
        // First connection: go straight on to choosing repositories.
        const next = newFlow(returnTo, userId);
        return saveFlow(NextResponse.redirect(githubInstallUrl(next.state)), next);
      }
      return finish("connected");
    } catch (error) {
      console.error("GitHub connect failed", error);
      return finish("failed");
    }
  }

  if (installationId) {
    // Repository choices changed on GitHub. A known member is done; anyone
    // else signs in to GitHub so their installation is tied to them.
    if (code === null && (await getGithubConnection(userId))) {
      return finish("connected");
    }
    return reauthorize();
  }

  return finish("expired");
}
