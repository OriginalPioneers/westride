import type { ReactNode } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

export const LEGAL_UPDATED = "October 26, 2026";

export const PROJECT_REPOSITORY = "https://github.com/OriginalPioneers/westride";

export function LegalDocument({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Layout
      contentWidth={720}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={1}>
            <Heading level={1}>{title}</Heading>
            <Text type="supporting">Updated {LEGAL_UPDATED}</Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={8}>{children}</VStack>
        </LayoutContent>
      }
    />
  );
}

export function LegalSection({
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

export function LegalParagraph({ children }: { children: ReactNode }) {
  return (
    <Text as="p" display="block">
      {children}
    </Text>
  );
}
