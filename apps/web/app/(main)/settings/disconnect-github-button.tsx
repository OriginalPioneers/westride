"use client";

import { Button } from "@astryxdesign/core/Button";
import { disconnectGithub } from "./actions";

export function DisconnectGithubButton() {
  return <Button label="Disconnect" clickAction={() => disconnectGithub()} />;
}
