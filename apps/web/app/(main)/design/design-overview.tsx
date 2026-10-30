"use client";

import Image from "next/image";
import { Button } from "@astryxdesign/core/Button";
import { Card, type CardProps } from "@astryxdesign/core/Card";
import { Code } from "@astryxdesign/core/Code";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/Stack";
import { Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { DocPage, DocSection } from "../doc-page";

const DESIGN_URL = "https://design.westride.org";

const BRAND_COLORS = [
  {
    name: "Deep Stride Navy",
    hex: "#0F1B2D",
    use: "The wordmark, and the single-color mark on light backgrounds.",
  },
  {
    name: "Electric Indigo",
    hex: "#5B5BD6",
    use: "First stroke of the stamp. The first step of the stride.",
  },
  {
    name: "Vivid Violet",
    hex: "#8B5CF6",
    use: "Second stroke of the stamp.",
  },
  {
    name: "Bright Azure",
    hex: "#0EA5E9",
    use: "Third stroke of the stamp.",
  },
  {
    name: "Stride Teal",
    hex: "#14B8A6",
    use: "Tallest stroke of the stamp. The stride at full height.",
  },
  {
    name: "Sunrise Coral",
    hex: "#FF6B4A",
    use: "The spark only. Human warmth at the end of the gradient.",
  },
];

const LEAVE_OUT = [
  "No robot, brain, gear, factory, or lightbulb in the mark.",
  "No drop shadow, bevel, or 3D treatment of the strokes.",
  "No extra words in the lockup. The name is westride, lowercase.",
  "No recoloring the spark. Coral belongs only there.",
];

const SURFACES = [
  { name: "Body", token: "--color-background-body" },
  { name: "Surface", token: "--color-background-surface" },
  { name: "Card", token: "--color-background-card" },
  { name: "Muted", token: "--color-background-muted" },
];

const STATUS = [
  { name: "Accent", token: "--color-accent" },
  { name: "Success", token: "--color-success" },
  { name: "Warning", token: "--color-warning" },
  { name: "Error", token: "--color-error" },
];

const TINTS: NonNullable<CardProps["variant"]>[] = [
  "blue",
  "cyan",
  "teal",
  "green",
  "yellow",
  "orange",
  "red",
  "pink",
  "purple",
  "gray",
];

const TYPE_FAMILIES = [
  {
    role: "Headings",
    face: "Montserrat",
    token: "--font-family-heading",
    sample: (
      <Text
        type="large"
        weight="bold"
        style={{ fontFamily: "var(--font-family-heading)" }}
      >
        Learn together
      </Text>
    ),
  },
  {
    role: "Body",
    face: "Figtree",
    token: "--font-family-body",
    sample: <Text>Spark an idea, then take the next step with a mentor.</Text>,
  },
  {
    role: "Code",
    face: "JetBrains Mono",
    token: "--font-family-code",
    sample: <Code>bun run dev:web</Code>,
  },
];

const PRINCIPLES = [
  {
    label: "Start from a component",
    detail:
      "Reach for an Astryx component before writing custom markup. Layout, Stack, and Grid handle structure, and their gap, padding, and contentWidth props handle spacing.",
  },
  {
    label: "Rows for dense data",
    detail:
      "Many of the same thing belong in a Table or List. A Card holds one subject you could move or remove on its own, like an idea or a mentor.",
  },
  {
    label: "Color from the theme",
    detail:
      "Use component variants first, then tokens such as var(--color-text-secondary). Never a hex value, so light and dark mode both keep working.",
  },
  {
    label: "Badges count",
    detail:
      "Badge shows a number. Labels and categories use Text or a Card tint instead.",
  },
  {
    label: "Brand colors stay on the brand",
    detail:
      "The stamp palette paints the mark and wordmark only. Product screens use Stone.",
  },
];

const DESIGN_SITE = [
  {
    label: "Brand",
    detail: "The name, the logo, brand color, and the wordmark's type.",
    href: `${DESIGN_URL}/?path=/story/brand-introduction--guide`,
  },
  {
    label: "Foundations",
    detail: "Stone's color and type tokens, with live swatches.",
    href: `${DESIGN_URL}/?path=/story/foundations-color--guide`,
  },
  {
    label: "Components",
    detail:
      "The Astryx components we build with, with live examples you can adjust.",
    href: DESIGN_URL,
  },
];

function Swatch({ name, token }: { name: string; token: string }) {
  return (
    <VStack gap={2}>
      <Card height={64} padding={0} style={{ background: `var(${token})` }} />
      <VStack gap={0.5}>
        <Text type="label">{name}</Text>
        <Text type="supporting" size="sm">
          {token}
        </Text>
      </VStack>
    </VStack>
  );
}

export function DesignOverview() {
  return (
    <DocPage
      title="WeStride Design"
      lede="How WeStride looks and why: the brand, the design system every screen is built from, and the few rules that keep it consistent."
      actions={
        <Button
          label="Open the design site"
          variant="primary"
          href={DESIGN_URL}
          target="_blank"
        />
      }
    >
      <DocSection id="brand" title="The brand">
        <Grid columns={{ minWidth: 280, max: 2 }} gap={6}>
          <Card padding={8}>
            <VStack gap={4} hAlign="center" vAlign="center" height="100%">
              <Image
                src="/westride-stamp.png"
                alt="The WeStride stamp: four rising strokes in an indigo-to-teal gradient, topped with a coral spark."
                width={1156}
                height={778}
                // The optimizer fetches this file without a browser user agent,
                // and the proxy refuses that request.
                unoptimized
                style={{ width: "100%", height: "auto" }}
              />
            </VStack>
          </Card>
          <VStack gap={3}>
            <Text>
              <Text type="inherit" weight="semibold">
                We
              </Text>{" "}
              is the community: mentors, collaborators, and everyone who
              belongs in the work.{" "}
              <Text type="inherit" weight="semibold">
                Stride
              </Text>{" "}
              is the motion from a first step to something launched.
            </Text>
            <Text>
              The stamp is four thick, rounded strokes that lean forward and
              rise from left to right, like people walking together up a set of
              steps. A coral spark sits on the tallest stroke: an idea, carried
              forward by the community.
            </Text>
            <Text>
              The wordmark is <Code>westride</Code>, always lowercase, set in
              Manrope ExtraBold with tight tracking. It is Deep Stride Navy on
              light backgrounds and white on navy.
            </Text>
          </VStack>
        </Grid>
        <VStack gap={2}>
          <Heading level={3}>Leave out</Heading>
          <List density="compact" listStyle="disc">
            {LEAVE_OUT.map((rule) => (
              <ListItem key={rule} label={<Text>{rule}</Text>} />
            ))}
          </List>
        </VStack>
      </DocSection>

      <DocSection id="brand-colors" title="Brand colors">
        <Text>
          Six colors belong to the identity. The stamp runs from indigo to
          teal, and coral is saved for the spark. They paint the mark and the
          wordmark, not the product. Screens use the theme colors further down.
        </Text>
        <Table
          data={BRAND_COLORS}
          idKey="name"
          columns={[
            { key: "name", header: "Color" },
            {
              key: "hex",
              header: "Hex",
              renderCell: (row) => <Code>{row.hex}</Code>,
            },
            { key: "use", header: "Use" },
          ]}
        />
        <Text type="supporting">
          For favicons, avatars, and anything else that cannot hold the
          gradient, use the stamp in solid Deep Stride Navy on light, or solid
          white on navy.
        </Text>
      </DocSection>

      <DocSection id="design-system" title="Design system">
        <Text>
          Every WeStride screen on the web is built from{" "}
          <Text type="inherit" weight="semibold">
            Astryx
          </Text>
          , a React design system, themed with{" "}
          <Text type="inherit" weight="semibold">
            Stone
          </Text>
          . Astryx supplies layout, navigation, forms, tables, and dialogs as
          components, so pages are composed rather than hand-styled. Stone sets
          the color, type, spacing, and corner radius, and switches between
          light and dark.
        </Text>
        <Text>
          This website, the API explorer, the MCP setup guide, and the design
          site all share it, so moving between them feels like one product.
          Setting it up takes two style imports and a theme wrapper:
        </Text>
        <CodeBlock
          code={`import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import { Theme } from "@astryxdesign/core/theme";
import { stoneTheme } from "@astryxdesign/theme-stone/built";

export function Providers({ children }) {
  return <Theme theme={stoneTheme}>{children}</Theme>;
}`}
          language="tsx"
          width="100%"
        />
      </DocSection>

      <DocSection id="color" title="Product color">
        <Text>
          Stone&apos;s colors are tokens that already flip between light and
          dark. Surfaces layer from the page canvas up to cards:
        </Text>
        <Grid columns={{ minWidth: 120, max: 4 }} gap={4}>
          {SURFACES.map((swatch) => (
            <Swatch key={swatch.token} {...swatch} />
          ))}
        </Grid>
        <Text>
          Status colors carry meaning. Use them through component variants,
          like a Banner&apos;s status, rather than painting with them directly:
        </Text>
        <Grid columns={{ minWidth: 120, max: 4 }} gap={4}>
          {STATUS.map((swatch) => (
            <Swatch key={swatch.token} {...swatch} />
          ))}
        </Grid>
        <Text>
          For a soft categorical fill, use a Card variant. Each one maps to a{" "}
          <Code>--color-background-*</Code> token:
        </Text>
        <Grid columns={{ minWidth: 120, max: 5 }} gap={3}>
          {TINTS.map((variant) => (
            <Card key={variant} variant={variant} padding={4}>
              <Text type="label">{variant}</Text>
            </Card>
          ))}
        </Grid>
      </DocSection>

      <DocSection id="typography" title="Typography">
        <Text>
          Stone loads three families. Use Heading, Text, and Code so size,
          weight, and line height stay on the theme&apos;s scale.
        </Text>
        <Table
          data={TYPE_FAMILIES}
          idKey="role"
          columns={[
            { key: "role", header: "Role" },
            { key: "face", header: "Face" },
            {
              key: "sample",
              header: "Sample",
              renderCell: (row) => row.sample,
            },
            {
              key: "token",
              header: "Token",
              renderCell: (row) => <Code>{row.token}</Code>,
            },
          ]}
        />
        <Text type="supporting">
          Manrope is only for the wordmark. Product screens never use it.
        </Text>
      </DocSection>

      <DocSection id="building-screens" title="Building a screen">
        <List edge="flush" hasDividers>
          {PRINCIPLES.map((item) => (
            <ListItem
              key={item.label}
              label={item.label}
              description={<Text type="supporting">{item.detail}</Text>}
            />
          ))}
        </List>
      </DocSection>

      <DocSection id="design-site" title="The design site">
        <Text>
          <Link href={DESIGN_URL} isExternalLink>
            design.westride.org
          </Link>{" "}
          is the living reference, built with Storybook. Every page renders the
          real components with the real theme.
        </Text>
        <List edge="flush" hasDividers>
          {DESIGN_SITE.map((item) => (
            <ListItem
              key={item.label}
              label={item.label}
              description={<Text type="supporting">{item.detail}</Text>}
              href={item.href}
            />
          ))}
        </List>
        <Text>To work on it locally, run this from the repository root:</Text>
        <CodeBlock
          code="bunx turbo run dev --filter=design   # http://localhost:6006"
          language="bash"
          width="100%"
        />
      </DocSection>
    </DocPage>
  );
}
