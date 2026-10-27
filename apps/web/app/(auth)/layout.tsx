"use client";

import type { CSSProperties } from "react";
import { Center } from "@astryxdesign/core/Center";
import { Icon } from "@astryxdesign/core/Icon";
import { StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { RocketLaunchIcon } from "@heroicons/react/24/outline";
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
            <VStack gap={2} hAlign="center">
              <Icon icon={RocketLaunchIcon} size="lg" />
              <Text type="body" weight="bold">
                WeStride
              </Text>
            </VStack>
            {children}
          </VStack>
        </Center>
      </StackItem>
      <SiteFooter />
    </VStack>
  );
}
