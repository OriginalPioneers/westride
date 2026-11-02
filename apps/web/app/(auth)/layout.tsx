"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { Center } from "@astryxdesign/core/Center";
import { StackItem, VStack } from "@astryxdesign/core/Stack";
import { SiteFooter } from "../site-footer";

const pageStyle: CSSProperties = {
  backgroundColor: "var(--color-background-body)",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <VStack
      gap={0}
      height="100dvh"
      style={{ ...pageStyle, overflow: "hidden" }}
    >
      <StackItem size="fill" isScrollable>
        <Center axis="both" padding={6} minHeight="100%">
          <VStack gap={4} hAlign="center">
            <Image
              src="/logos/westride/WeStride_landscape_navy.png"
              alt="WeStride"
              width={2492}
              height={762}
              preload
              // The optimizer fetches this file without a browser user agent,
              // and the proxy refuses that request.
              unoptimized
              style={{
                height: "var(--spacing-12)",
                width: "auto",
                maxWidth: "100%",
              }}
            />
            {children}
          </VStack>
        </Center>
      </StackItem>
      <SiteFooter />
    </VStack>
  );
}
