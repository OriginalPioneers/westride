"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Card } from "@astryxdesign/core/Card";
import { Collapsible, CollapsibleGroup } from "@astryxdesign/core/Collapsible";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { Theme } from "@astryxdesign/core/theme";
import { defaultThemeSlug, themes } from "@/astryx-themes";

export type ConnectionStatus = {
  variant: "success" | "warning" | "accent" | "neutral";
  label: string;
};

/** Brand marks are drawn for light backgrounds, so the tile stays light in dark mode. */
function LogoTile({ src }: { src: string }) {
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="light">
      <Card padding={1.5} width="var(--spacing-10)" height="var(--spacing-10)">
        <Image
          src={src}
          alt=""
          width={40}
          height={40}
          // The optimizer fetches this file without a browser user agent,
          // and the proxy refuses that request.
          unoptimized
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </Card>
    </Theme>
  );
}

/** A titled set of connections that serve one purpose. */
export function ConnectionGroup({
  title,
  description,
  defaultOpen,
  children,
}: {
  title: string;
  description: ReactNode;
  /** Rows to start expanded: ones that need the member, or that a sign-in just returned to. */
  defaultOpen: string[];
  children: ReactNode;
}) {
  return (
    <VStack gap={3}>
      <VStack gap={1}>
        <Heading level={2}>{title}</Heading>
        <Text type="supporting">{description}</Text>
      </VStack>
      <CollapsibleGroup type="multiple" hasDividers defaultValue={defaultOpen}>
        {children}
      </CollapsibleGroup>
    </VStack>
  );
}

/** One service: what it is for and whether it is connected, with its controls behind the row. */
export function ConnectionRow({
  value,
  name,
  purpose,
  logo,
  status,
  children,
}: {
  value: string;
  name: string;
  purpose: string;
  logo: string;
  status: ConnectionStatus;
  children: ReactNode;
}) {
  return (
    <Collapsible
      value={value}
      trigger={
        <HStack gap={3} vAlign="center" width="100%">
          <StackItem>
            <LogoTile src={logo} />
          </StackItem>
          <StackItem size="fill">
            <VStack gap={0}>
              <Text weight="semibold">{name}</Text>
              <Text type="supporting">{purpose}</Text>
            </VStack>
          </StackItem>
          <StackItem>
            <HStack gap={2} vAlign="center">
              <StatusDot variant={status.variant} label={status.label} />
              <Text size="sm">{status.label}</Text>
            </HStack>
          </StackItem>
        </HStack>
      }
    >
      {children}
    </Collapsible>
  );
}
