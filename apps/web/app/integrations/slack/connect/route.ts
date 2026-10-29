import { connectHandler } from "@/lib/chat/oauth-routes";
import { slackProvider } from "@/lib/chat/providers";

export const GET = connectHandler(slackProvider);
