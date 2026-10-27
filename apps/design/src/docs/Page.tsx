import type { ReactNode } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

export function Page({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <Layout
      contentWidth={880}
      padding={6}
      content={
        <LayoutContent>
          <VStack gap={8}>
            <VStack gap={2}>
              <Heading level={1}>{title}</Heading>
              <Text type="large" color="secondary">
                {lede}
              </Text>
            </VStack>
            {children}
          </VStack>
        </LayoutContent>
      }
    />
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <VStack gap={3}>
      <Heading level={2}>{title}</Heading>
      {children}
    </VStack>
  );
}
