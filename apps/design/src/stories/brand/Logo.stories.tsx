import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Page, Section } from "../../docs/Page";

const wordmarkStyle = {
  fontFamily: "var(--font-family-wordmark)",
  fontWeight: 800,
  letterSpacing: "-0.04em",
} as const;

const meta = {
  title: "Brand/Logo",
  parameters: { layout: "fullscreen" },
};

export default meta;

function Stamp({ on }: { on: "light" | "navy" }) {
  const navy = on === "navy";
  return (
    <Card
      padding={6}
      style={{
        backgroundColor: navy
          ? "var(--color-stride-navy)"
          : "var(--color-background-card)",
      }}
    >
      <VStack gap={4} hAlign="center">
        <img
          src="/westride-stamp.png"
          alt="WeStride stamp"
          width={280}
          height={188}
          style={{ width: "100%", height: "auto" }}
        />
        <Heading
          level={2}
          style={{
            ...wordmarkStyle,
            color: navy ? "var(--color-on-dark)" : "var(--color-stride-navy)",
          }}
        >
          westride
        </Heading>
      </VStack>
    </Card>
  );
}

export const Guide = {
  render: () => (
    <Page
      title="Logo"
      lede="The stamp is four strides and a spark. The wordmark sits beneath it. Together they say: learn together, spark ideas, build forward."
    >
      <Section title="Lockup">
        <Grid columns={{ minWidth: 280, max: 2 }} gap={4}>
          <Stamp on="light" />
          <Stamp on="navy" />
        </Grid>
        <Text type="supporting">
          On a navy field, set the wordmark in white. The stamp keeps its
          gradient. Asset file: apps/web/public/westride-stamp.png.
        </Text>
      </Section>

      <Section title="The mark">
        <VStack gap={2}>
          <Text>
            Four thick, rounded strokes lean forward and rise from left to
            right. The negative space between them is the path upward. The
            coral spark sits at the top of the tallest stroke. It stands for
            an idea carried by the community, including Muse.
          </Text>
          <Text>
            Leave clear space around the lockup equal to the height of the
            spark. Do not crowd it with a container, a tagline, or another
            mark.
          </Text>
        </VStack>
      </Section>

      <Section title="Single color">
        <Text>
          Favicons, avatars, and merch that cannot hold the gradient use solid
          Deep Stride Navy on light, or solid white on navy. Do not invent a
          third single-color version, and do not flatten the stamp to one of
          the gradient hues.
        </Text>
      </Section>

      <Section title="Leave out">
        <VStack gap={2}>
          <Text>No robot, brain, gear, factory, or lightbulb.</Text>
          <Text>No drop shadow, bevel, or 3D treatment of the strokes.</Text>
          <Text>No extra words in the lockup. The name is westride, lowercase.</Text>
          <Text>No recoloring the spark. Coral belongs only there.</Text>
        </VStack>
      </Section>
    </Page>
  ),
};
