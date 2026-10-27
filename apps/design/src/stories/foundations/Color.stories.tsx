import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Page, Section } from "../../docs/Page";
import { ColorSwatch } from "../../docs/Swatch";

const surfaces = [
  ["Body", "--color-background-body", "Page canvas."],
  ["Surface", "--color-background-surface", "Raised regions."],
  ["Card", "--color-background-card", "Default card fill."],
  ["Muted", "--color-background-muted", "Quiet blocks and empty states."],
  ["Popover", "--color-background-popover", "Menus and layers."],
  ["Inverted", "--color-background-inverted", "Inverse sections."],
] as const;

const ink = [
  ["Primary", "--color-text-primary"],
  ["Secondary", "--color-text-secondary"],
  ["Disabled", "--color-text-disabled"],
  ["Accent", "--color-text-accent"],
] as const;

const status = [
  ["Accent", "--color-accent"],
  ["Success", "--color-success"],
  ["Warning", "--color-warning"],
  ["Error", "--color-error"],
] as const;

const palette = [
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
] as const;

const meta = {
  title: "Foundations/Color",
  parameters: { layout: "fullscreen" },
};

export default meta;

export const Guide = {
  render: () => (
    <Page
      title="Product color"
      lede="Screens use the Stone theme. These tokens already flip between light and dark. Prefer them, and the component variants that map to them, over raw colors."
    >
      <Section title="Surfaces">
        <Grid columns={{ minWidth: 200, max: 3 }} gap={4}>
          {surfaces.map(([name, token, note]) => (
            <ColorSwatch key={token} name={name} token={token} detail={note} />
          ))}
        </Grid>
      </Section>

      <Section title="Text">
        <Grid columns={{ minWidth: 200, max: 4 }} gap={4}>
          {ink.map(([name, token]) => (
            <Card key={token} padding={4}>
              <VStack gap={1}>
                <Text type="label" style={{ color: `var(${token})` }}>
                  {name}
                </Text>
                <Text type="code">{token}</Text>
              </VStack>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section title="Status">
        <Grid columns={{ minWidth: 180, max: 4 }} gap={4}>
          {status.map(([name, token]) => (
            <ColorSwatch key={token} name={name} token={token} detail={token} />
          ))}
        </Grid>
      </Section>

      <Section title="Card tints">
        <Text type="supporting">
          Use these Card variants for a soft categorical fill. The token under
          each one is --color-background- followed by the variant name.
        </Text>
        <Grid columns={{ minWidth: 140, max: 5 }} gap={3}>
          {palette.map((variant) => (
            <Card key={variant} variant={variant} padding={4}>
              <Text type="label">{variant}</Text>
            </Card>
          ))}
        </Grid>
      </Section>
    </Page>
  ),
};
