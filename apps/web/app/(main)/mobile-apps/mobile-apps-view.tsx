"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AspectRatio } from "@astryxdesign/core/AspectRatio";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { Divider } from "@astryxdesign/core/Divider";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { Theme } from "@astryxdesign/core/theme";
import { defaultThemeSlug, themes } from "@/astryx-themes";
import {
  ANDROID_GUIDE,
  FEEDBACK_URL,
  IOS_GUIDE,
  MOBILE_TABS,
  PLATFORM_GUIDES,
  SCREENSHOT_HEIGHT,
  SCREENSHOT_WIDTH,
  SCREENSHOTS,
  TRY_ITEMS,
  otherPlatform,
  type GuideItem,
  type PlatformGuide,
  type PlatformId,
} from "./content";

const PAGE_LEDE = {
  overview:
    "The iOS and Android apps are in an open beta, and we are looking for testers. The public App Store and Google Play listings are not live yet. Install a tester build, use the same account as the website, and tell us what you find.",
  ios: "The iPhone and iPad app is in an open beta on TestFlight, and we are looking for testers. The public App Store listing is not live yet.",
  android:
    "The Android app is in an open test on Google Play, and we are looking for testers. The public store listing is not live yet.",
} as const;

const PAGE_TITLE = {
  overview: "WeStride on your phone",
  ios: "WeStride for iPhone and iPad",
  android: "WeStride for Android",
} as const;

function MobileAppsTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const selected =
    MOBILE_TABS.find((tab) => tab.href === pathname)?.href ?? MOBILE_TABS[0].href;
  return (
    <TabList value={selected} onChange={(href) => router.push(href)}>
      {MOBILE_TABS.map((tab) => (
        <Tab key={tab.href} value={tab.href} label={tab.label} href={tab.href} />
      ))}
    </TabList>
  );
}

function StoreLogo({ src }: { src: string }) {
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="light">
      <Card padding={2} width="var(--spacing-12)" height="var(--spacing-12)">
        <Center>
          <Image
            src={src}
            alt=""
            width={32}
            height={32}
            // The optimizer fetches this file without a browser user agent,
            // and the proxy refuses that request.
            unoptimized
          />
        </Center>
      </Card>
    </Theme>
  );
}

function JoinButton({ label, href }: { label: string; href: string }) {
  return (
    <Button
      label={label}
      variant="primary"
      size="lg"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    />
  );
}

function GuideList({ items }: { items: readonly GuideItem[] }) {
  return (
    <Card padding={0}>
      <List edge="flush" hasDividers>
        {items.map((item) => (
          <ListItem
            key={item.title}
            label={item.title}
            description={<Text type="supporting">{item.detail}</Text>}
          />
        ))}
      </List>
    </Card>
  );
}

function PlatformCard({ platform }: { platform: PlatformGuide }) {
  return (
    <Card padding={6}>
      <VStack gap={4}>
        <HStack gap={3} vAlign="center">
          <StoreLogo src={platform.logo} />
          <VStack gap={0.5}>
            <Heading level={3}>{platform.name}</Heading>
            <Text type="supporting">{platform.channel}</Text>
          </VStack>
        </HStack>
        <Text textWrap="pretty">{platform.summary}</Text>
        <HStack gap={3} vAlign="center" wrap="wrap">
          <JoinButton label={platform.joinLabel} href={platform.joinHref} />
          <Link href={platform.path} isStandalone>
            How to join
          </Link>
        </HStack>
      </VStack>
    </Card>
  );
}

function Block({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <VStack gap={4}>
      <VStack gap={2}>
        <Heading level={2} textWrap="balance">
          {title}
        </Heading>
        {lede != null ? (
          <Text type="large" color="secondary" textWrap="pretty">
            {lede}
          </Text>
        ) : null}
      </VStack>
      {children}
    </VStack>
  );
}

function ScreenshotGallery() {
  return (
    <Grid columns={{ minWidth: 180, max: 5 }} gap={4}>
      {SCREENSHOTS.map((shot) => (
        <Center key={shot.src}>
          <VStack
            gap={2}
            hAlign="center"
            width="100%"
            maxWidth="calc(var(--spacing-12) * 5)"
          >
            <Card padding={2} elevation="low" width="100%">
              <AspectRatio
                ratio={SCREENSHOT_WIDTH / SCREENSHOT_HEIGHT}
                fit="contain"
              >
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  width={SCREENSHOT_WIDTH}
                  height={SCREENSHOT_HEIGHT}
                  // The optimizer fetches this file without a browser user agent,
                  // and the proxy refuses that request.
                  unoptimized
                />
              </AspectRatio>
            </Card>
            <Text weight="semibold" justify="center">
              {shot.title}
            </Text>
            <Text type="supporting" size="sm" justify="center">
              {shot.caption}
            </Text>
          </VStack>
        </Center>
      ))}
    </Grid>
  );
}

function Install({ platform }: { platform: PlatformGuide }) {
  return (
    <Block title={platform.installTitle} lede={platform.installLede}>
      <GuideList items={platform.steps} />
    </Block>
  );
}

export function MobileAppsView({
  platform,
}: {
  platform: "overview" | PlatformId;
}) {
  const guide = platform === "overview" ? null : platform === "ios" ? IOS_GUIDE : ANDROID_GUIDE;
  const other = guide == null ? null : otherPlatform(guide.id);

  return (
    <Layout
      contentWidth={1120}
      content={
        <LayoutContent padding={8}>
          <VStack gap={8}>
            <VStack gap={4}>
              <MobileAppsTabs />
              <VStack gap={2}>
                <Heading level={1} type="display-1" textWrap="balance">
                  {PAGE_TITLE[platform]}
                </Heading>
                <Text type="large" color="secondary" textWrap="pretty">
                  {PAGE_LEDE[platform]}
                </Text>
              </VStack>
              {guide != null && other != null ? (
                <HStack gap={3} vAlign="center" wrap="wrap">
                  <JoinButton label={guide.joinLabel} href={guide.joinHref} />
                  <Link href={other.path} isStandalone>
                    {other.name} open beta
                  </Link>
                </HStack>
              ) : null}
            </VStack>

            {guide == null ? (
              <Grid columns={{ minWidth: 320, max: 2 }} gap={4}>
                {PLATFORM_GUIDES.map((item) => (
                  <PlatformCard key={item.id} platform={item} />
                ))}
              </Grid>
            ) : (
              <Install platform={guide} />
            )}

            <Divider />

            <Block
              title="A look at the app"
              lede="Sign in, then move between ideas, builds, agents, and the Academy. These screens are from the tester build, so they will change as we fix what you find."
            >
              <ScreenshotGallery />
            </Block>

            <Divider />

            <Block
              title="What to try"
              lede="You do not need a test script. Use the app the way you would use the website, and notice what gets in the way."
            >
              <GuideList items={TRY_ITEMS} />
            </Block>

            <Divider />

            <Block
              title="We are looking for testers"
              lede="The public listings are not ready. Until they are, these tester builds are how the app ships. Tell us what crashed, what was hard to use on a phone, and what you expected to do but could not."
            >
              <Text textWrap="pretty">
                Open a GitHub issue and include the phone you used, iPhone or Android, and what you tapped before it went wrong. Leave out passwords and private idea details.
              </Text>
              <HStack>
                <Button
                  label="Report what you find"
                  size="lg"
                  href={FEEDBACK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              </HStack>
            </Block>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
