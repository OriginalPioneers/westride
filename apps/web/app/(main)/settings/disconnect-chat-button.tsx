"use client";

import { Button } from "@astryxdesign/core/Button";
import type { ChatPlatform } from "@westride/db";
import { disconnectChat } from "./actions";

export function DisconnectChatButton({ platform }: { platform: ChatPlatform }) {
  return <Button label="Disconnect" clickAction={() => disconnectChat(platform)} />;
}
