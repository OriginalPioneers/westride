import { callbackHandler } from "@/lib/chat/oauth-routes";
import { slackProvider } from "@/lib/chat/providers";

/** Register this URL as a redirect URL under the Slack app's OAuth & Permissions. */
export const GET = callbackHandler(slackProvider);
