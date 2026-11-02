import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import {
  Wordmark,
  fieldBackground,
  type BrandField,
} from "../../brand/Wordmark";
import { Page, Section } from "../../docs/Page";

const meta = {
  title: "Brand/Logo",
  parameters: { layout: "fullscreen" },
};

export default meta;

const LANDSCAPE = {
  light: "/logos/westride/WeStride_landscape_navy.png",
  navy: "/logos/westride/WeStride_landscape_white.png",
} as const;

function FieldLabel({ title, on }: { title: string; on: BrandField }) {
  const color =
    on === "navy" ? "var(--color-brand-white)" : "var(--color-brand-navy)";
  return (
    <VStack gap={0}>
      <Text type="label" style={{ color }}>
        {title}
      </Text>
      <Text type="supporting" size="sm" style={{ color }}>
        {on === "navy" ? "Dark mode" : "Light mode"}
      </Text>
    </VStack>
  );
}

function HorizontalLogo({ on }: { on: BrandField }) {
  return (
    <Card padding={6} style={{ backgroundColor: fieldBackground(on) }}>
      <VStack gap={6}>
        <FieldLabel title="Horizontal logo" on={on} />
        <img
          src={LANDSCAPE[on]}
          alt="WeStride horizontal logo"
          width={2492}
          height={762}
          style={{ width: "100%", height: "auto" }}
        />
      </VStack>
    </Card>
  );
}

function StackedLogo({ on }: { on: BrandField }) {
  return (
    <Card padding={6} style={{ backgroundColor: fieldBackground(on) }}>
      <VStack gap={6}>
        <FieldLabel title="Stacked logo" on={on} />
        <VStack gap={4} hAlign="center">
          <img
            src="/westride-stamp.png"
            alt="WeStride stamp"
            width={1156}
            height={778}
            style={{ width: "60%", height: "auto" }}
          />
          <Wordmark on={on} level={2} />
        </VStack>
      </VStack>
    </Card>
  );
}

function BrandIcon({ on }: { on: BrandField }) {
  return (
    <VStack gap={3} hAlign="center">
      <Card
        width={160}
        height={160}
        padding={5}
        style={{
          backgroundColor: fieldBackground(on),
          borderRadius: "var(--radius-page)",
        }}
      >
        <VStack height="100%" hAlign="center" vAlign="center">
          <img
            src="/westride-stamp.png"
            alt="WeStride brand icon"
            width={1156}
            height={778}
            style={{ width: "100%", height: "auto" }}
          />
        </VStack>
      </Card>
      <Text type="label">Icon — {on === "navy" ? "Dark" : "Light"} mode</Text>
    </VStack>
  );
}

export const Guide = {
  render: () => (
    <Page
      title="Logo"
      lede="Our official logo variations. Use these to ensure consistent brand representation: the stamp is four strides and a spark, and the wordmark is westride, lowercase."
    >
      <Section title="Logo system">
        <Grid columns={{ minWidth: 280, max: 2 }} gap={4}>
          <HorizontalLogo on="light" />
          <HorizontalLogo on="navy" />
          <StackedLogo on="light" />
          <StackedLogo on="navy" />
        </Grid>
        <Text type="supporting">
          The horizontal logo is the default. Use the stacked logo where the
          space is square. On a navy field the wordmark is white and the stamp
          keeps its gradient. Files: apps/web/public/logos/westride/ and
          apps/web/public/westride-stamp.png.
        </Text>
      </Section>

      <Section title="Brand icon">
        <Grid columns={{ minWidth: 160, max: 4 }} gap={4}>
          <BrandIcon on="light" />
          <BrandIcon on="navy" />
        </Grid>
        <Text type="supporting">
          Use the stamp on its own for app icons, social avatars, and other
          small, square placements. The tile is White in light mode and
          Midnight Navy in dark mode, with the page radius.
        </Text>
      </Section>

      <Section title="The mark">
        <VStack gap={2}>
          <Text>
            Four thick, rounded strokes lean forward and rise from left to
            right, in Indigo, Electric Purple, Bright Blue, and Teal. The
            negative space between them is the path upward. The Spark Orange
            spark sits at the top of the tallest stroke. It stands for an idea
            carried by the community, including Muse.
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
          Midnight Navy on light, or solid white on navy. Do not invent a third
          single-color version, and do not flatten the stamp to one of the
          gradient hues.
        </Text>
      </Section>

      <Section title="Leave out">
        <VStack gap={2}>
          <Text>No robot, brain, gear, factory, or lightbulb.</Text>
          <Text>No drop shadow, bevel, or 3D treatment of the strokes.</Text>
          <Text>No extra words in the lockup. The name is westride, lowercase.</Text>
          <Text>No recoloring the spark. Spark Orange belongs only there.</Text>
        </VStack>
      </Section>
    </Page>
  ),
};
