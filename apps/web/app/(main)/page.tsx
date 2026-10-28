import { currentUser } from "@clerk/nextjs/server";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { STORE_LINKS } from "../store-links";

function PlaceholderSection({
  title,
  height,
}: {
  title: string;
  height: number;
}) {
  return (
    <VStack gap={3}>
      <Heading level={2}>{title}</Heading>
      <Card variant="muted" padding={0} height={height} />
    </VStack>
  );
}

export default async function Home() {
  const user = await currentUser();
  const greeting = user?.firstName
    ? `Welcome, ${user.firstName}`
    : "Welcome to WeStride";

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={1}>
            <Heading level={1}>{greeting}</Heading>
            <Text type="supporting">
              Learn AI, find mentors, and turn your ideas into something real.
            </Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={8}>
            <VStack gap={3}>
              <Heading level={2}>Mobile app</Heading>
              <Text type="supporting">
                WeStride is available for iPhone and Android.
              </Text>
              <HStack gap={2} wrap="wrap">
                {STORE_LINKS.map((link) => (
                  <Button
                    key={link.href}
                    label={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${link.label} (opens in a new tab)`}
                  />
                ))}
              </HStack>
            </VStack>

            <PlaceholderSection title="Continue learning" height={160} />

            <VStack gap={3}>
              <Heading level={2}>Your progress</Heading>
              <Grid columns={{ minWidth: 200, max: 3 }} gap={4}>
                <Card variant="muted" padding={0} height={112} />
                <Card variant="muted" padding={0} height={112} />
                <Card variant="muted" padding={0} height={112} />
              </Grid>
            </VStack>

            <Grid columns={{ minWidth: 320, max: 2 }} gap={6}>
              <PlaceholderSection title="Mentorship" height={200} />
              <PlaceholderSection title="Your ideas" height={200} />
            </Grid>

            <PlaceholderSection title="Community activity" height={240} />
          </VStack>
        </LayoutContent>
      }
    />
  );
}
