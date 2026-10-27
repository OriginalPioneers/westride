import { currentUser } from "@clerk/nextjs/server";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

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
