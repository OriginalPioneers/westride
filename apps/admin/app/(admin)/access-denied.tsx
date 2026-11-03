"use client";

import type { CSSProperties } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { VStack } from "@astryxdesign/core/Stack";
import { signInPath } from "@/lib/paths";

const pageStyle: CSSProperties = {
  backgroundColor: "var(--color-background-body)",
};

/** Signed in, but not on the team. */
export function AccessDenied() {
  return (
    <VStack gap={0} height="100dvh" style={pageStyle}>
      <Center axis="both" padding={6} minHeight="100%">
        <EmptyState
          title="This portal is for the WeStride team"
          description="Your account is signed in, but it does not carry the admin role. If you should have it, ask another admin to grant it from the Users page, then sign in again."
          actions={
            <SignOutButton redirectUrl={signInPath}>
              <Button label="Sign out and switch account" variant="secondary" />
            </SignOutButton>
          }
        />
      </Center>
    </VStack>
  );
}
