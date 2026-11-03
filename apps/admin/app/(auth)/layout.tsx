"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { Center } from "@astryxdesign/core/Center";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

const pageStyle: CSSProperties = {
  backgroundColor: "var(--color-background-body)",
};

const WORDMARK_NAVY = "/logos/westride/WeStride_landscape_navy.png";
const WORDMARK_WHITE = "/logos/westride/WeStride_landscape_white.png";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <VStack gap={0} height="100dvh" style={pageStyle}>
      <Center axis="both" padding={6} minHeight="100%">
        <VStack gap={6} hAlign="center">
          <VStack gap={2} hAlign="center">
            <Image
              className="westride-wordmark westride-wordmark-light"
              src={WORDMARK_NAVY}
              alt="WeStride"
              width={2492}
              height={762}
              preload
              unoptimized
            />
            <Image
              className="westride-wordmark westride-wordmark-dark"
              src={WORDMARK_WHITE}
              alt="WeStride"
              width={2492}
              height={762}
              preload
              unoptimized
            />
            <Text type="supporting">Admin portal. Sign in with your WeStride account.</Text>
          </VStack>
          {children}
        </VStack>
      </Center>
    </VStack>
  );
}
