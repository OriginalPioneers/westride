import { connectHandler } from "@/lib/chat/oauth-routes";
import { discordProvider } from "@/lib/chat/providers";

export const GET = connectHandler(discordProvider);
