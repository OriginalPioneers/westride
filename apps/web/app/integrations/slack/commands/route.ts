import type { NextRequest } from "next/server";
import { answerChat } from "@/lib/chat/answer";
import { getSlackConfig } from "@/lib/chat/config";
import { slackExternalId } from "@/lib/chat/providers";
import { toSlackMessage } from "@/lib/chat/render";
import { verifySlackRequest } from "@/lib/chat/verify";

/**
 * The `/westride` slash command. Set this URL as the command's Request URL.
 * Slack waits 3 seconds for the answer, which goes back in this response.
 */
export async function POST(request: NextRequest) {
  const config = getSlackConfig();
  if (!config) {
    return new Response("Slack is not set up on this WeStride server.", { status: 503 });
  }
  const body = await request.text();
  const verified = verifySlackRequest({
    signingSecret: config.signingSecret,
    timestamp: request.headers.get("x-slack-request-timestamp"),
    signature: request.headers.get("x-slack-signature"),
    body,
  });
  if (!verified) {
    return new Response("Invalid request signature.", { status: 401 });
  }

  const form = new URLSearchParams(body);
  if (form.get("ssl_check") === "1") {
    return new Response(null, { status: 200 });
  }
  const teamId = form.get("team_id");
  const userId = form.get("user_id");
  if (!teamId || !userId) {
    return new Response("Missing sender.", { status: 400 });
  }

  const reply = await answerChat(
    {
      platform: "SLACK",
      externalId: slackExternalId(teamId, userId),
      displayName: form.get("user_name") || userId,
      workspaceName: form.get("team_domain"),
    },
    form.get("text") ?? "",
    request.nextUrl.origin,
  );
  return Response.json(toSlackMessage(reply));
}
