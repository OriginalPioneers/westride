import { callbackHandler } from "@/lib/chat/oauth-routes";
import { discordProvider } from "@/lib/chat/providers";

/** Register this URL as a redirect under the Discord application's OAuth2 settings. */
export const GET = callbackHandler(discordProvider);
