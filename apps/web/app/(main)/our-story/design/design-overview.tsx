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
import {
  brandColorRoleLabels,
  brandColors,
  brandDescriptor,
  brandFontWeights,
  brandTagline,
  brandTaglineSupport,
} from "@westride/theme";
import { DocPage, DocSection } from "../../doc-page";
import { OurStoryTabs } from "../../section-tabs";

const DESIGN_URL = "https://design.westride.org";

const LEAVE_OUT = [
  "No robot, brain, gear, factory, or lightbulb in the mark.",
  "No drop shadow, bevel, or 3D treatment of the strokes.",
  "No extra words in the lockup. The name is westride, lowercase.",
  "No recoloring the spark. Spark Orange belongs only there.",
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
    face: "Figtree",
    token: "--font-family-heading",
    sample: (
      <Text
        type="large"
        weight="bold"
        style={{ fontFamily: "var(--font-family-heading)" }}
      >
        {brandTagline}
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
      "The theme publishes the palette as --color-brand-* tokens for the mark, the wordmark, and brand moments. Product controls use the semantic tokens.",
  },
];

const DESIGN_SITE = [
  {
    label: "Brand",
    detail:
      "The logo system, brand icon, color palette, Figtree typography, and the tagline.",
    href: `${DESIGN_URL}/?path=/story/brand-introduction--guide`,
  },
  {
    label: "Foundations",
    detail: "The theme's color and type tokens, with live swatches.",
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
      tabs={<OurStoryTabs />}
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
              Figtree Bold with tight tracking. It is Midnight Navy on light
              backgrounds and white on navy.
            </Text>
          </VStack>
        </Grid>
        <Card padding={6} style={{ backgroundColor: "var(--color-brand-navy)" }}>
          <VStack gap={2}>
            <Text
              type="label"
              size="sm"
              style={{
                color: "var(--color-brand-white)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              {brandDescriptor}
            </Text>
            <Heading
              level={3}
              type="display-3"
              weight="bold"
              style={{
                color: "var(--color-brand-white)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {brandTagline}
            </Heading>
            <Text
              weight="normal"
              style={{
                color: "var(--color-brand-white)",
                letterSpacing: "0.08em",
              }}
            >
              {brandTaglineSupport}
            </Text>
          </VStack>
        </Card>
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
          Our colors reflect growth, community, innovation, and opportunity.
          Midnight Navy and Bright Blue lead, White is the field, three
          supporting hues build the stamp, and Spark Orange is saved for the
          spark. They paint the mark, the wordmark, and brand moments, not
          the product controls. Screens use the theme colors further down.
        </Text>
        <Grid columns={{ minWidth: 120, max: 7 }} gap={3}>
          {brandColors.map((color) => (
            <Swatch key={color.token} name={color.name} token={color.token} />
          ))}
        </Grid>
        <Table
          data={[...brandColors]}
          idKey="token"
          columns={[
            { key: "name", header: "Color" },
            {
              key: "hex",
              header: "Hex",
              renderCell: (row) => <Code>{row.hex}</Code>,
            },
            {
              key: "role",
              header: "Role",
              renderCell: (row) => brandColorRoleLabels[row.role],
            },
            { key: "use", header: "Use" },
          ]}
        />
        <Text type="supporting">
          For favicons, avatars, and anything else that cannot hold the
          gradient, use the stamp in solid Midnight Navy on light, or solid
          white on navy.
        </Text>
      </DocSection>

      <DocSection id="design-system" title="Design system">
        <Text>
          Every WeStride screen on the web is built from{" "}
          <Text type="inherit" weight="semibold">
            Astryx
          </Text>
          , a React design system, themed with the{" "}
          <Text type="inherit" weight="semibold">
            WeStride theme
          </Text>
          . Astryx supplies layout, navigation, forms, tables, and dialogs as
          components, so pages are composed rather than hand-styled. The theme
          extends Astryx&apos;s Stone theme: it keeps Stone&apos;s surfaces,
          spacing, and corner radius, sets every face in Figtree, and
          publishes the brand palette as tokens. It switches between light and
          dark on its own.
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
import { westrideTheme } from "@westride/theme/themes/westride";
import "@westride/theme/themes/westride.css";
import "@westride/theme/themes/westride.fonts.css";

export function Providers({ children }) {
  return <Theme theme={westrideTheme}>{children}</Theme>;
}`}
          language="tsx"
          width="100%"
        />
      </DocSection>

      <DocSection id="color" title="Product color">
        <Text>
          The theme&apos;s colors are tokens that already flip between light
          and dark. Surfaces layer from the page canvas up to cards:
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
          Figtree is used for all brand communications, so headings and body
          share it; code is the one exception. Use Heading, Text, and Code so
          size, weight, and line height stay on the theme&apos;s scale.
        </Text>
        <Grid columns={{ minWidth: 96, max: 5 }} gap={3}>
          {brandFontWeights.map((weight) => (
            <Card key={weight.weight} padding={4}>
              <VStack gap={1}>
                <Text
                  type="large"
                  style={{
                    fontFamily: "var(--font-family-body)",
                    fontWeight: weight.weight,
                  }}
                >
                  Aa
                </Text>
                <Text type="label">{weight.name}</Text>
                <Text type="supporting" size="sm">
                  {weight.weight}
                </Text>
              </VStack>
            </Card>
          ))}
        </Grid>
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
          The wordmark is the same Figtree, in Bold. There is no separate
          display or wordmark face.
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
