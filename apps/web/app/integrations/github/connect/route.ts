import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { isGithubAppConfigured } from "@/lib/github/config";
import { newFlow, returnUrl, safeReturnTo, saveFlow } from "@/lib/github/flow";
import {
  githubAuthorizeUrl,
  githubCallbackUrl,
  githubInstallUrl,
} from "@/lib/github/user";

/**
 * Starts a round trip to GitHub.
 * `?intent=install` opens GitHub's page for choosing accounts and
 * repositories. Anything else signs the member in to GitHub.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const returnTo = safeReturnTo(params.get("returnTo"));
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: request.nextUrl.toString() });
  }
  if (!isGithubAppConfigured()) {
    return NextResponse.redirect(returnUrl(request, returnTo, "unavailable"));
  }

  const flow = newFlow(returnTo, userId);
  const destination =
    params.get("intent") === "install"
      ? githubInstallUrl(flow.state)
      : githubAuthorizeUrl(flow.state, githubCallbackUrl(request.nextUrl.origin));
  return saveFlow(NextResponse.redirect(destination), flow);
}
