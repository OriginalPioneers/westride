import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { List, ListItem } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import {
  brandColorRoleLabels,
  brandColors,
  brandPastels,
  stampGradient,
} from "@westride/theme";
import { Page, Section } from "../../docs/Page";
import { ColorSwatch } from "../../docs/Swatch";

const meta = {
  title: "Brand/Color",
  parameters: { layout: "fullscreen" },
};

export default meta;

export const Guide = {
  render: () => (
    <Page
      title="Color"
      lede="Our colors reflect growth, community, innovation, and opportunity. The palette lives on the logo and in brand moments; product screens stay on the theme so the interface can be quiet and the mark can be loud."
    >
      <Section title="Palette">
        <Grid columns={{ minWidth: 180, max: 4 }} gap={4}>
          {brandColors.map((color) => (
            <ColorSwatch
              key={color.token}
              name={color.name}
              token={color.token}
              detail={`${color.hex} · ${brandColorRoleLabels[color.role]}`}
            />
          ))}
        </Grid>
        <Text type="supporting">
          Midnight Navy and Bright Blue are primary. White is the background.
          Indigo, Electric Purple, and Teal support the stamp. Spark Orange is
          the accent, and it belongs to the spark.
        </Text>
      </Section>

      <Section title="How the stamp uses them">
        <VStack gap={3}>
          <Card height={88} padding={0} style={{ background: stampGradient }} />
          <Text>
            The four strokes run Indigo, Electric Purple, Bright Blue, and
            Teal, left to right, each one taller than the last. Spark Orange is
            reserved for the spark at the top of the final stroke. It is not a
            fifth stop in the bar.
          </Text>
          <List edge="flush" hasDividers>
            {brandColors.map((color) => (
              <ListItem
                key={color.token}
                label={`${color.name} · ${brandColorRoleLabels[color.role]}`}
                description={color.use}
              />
            ))}
          </List>
        </VStack>
      </Section>

      <Section title="Pastels">
        <VStack gap={3}>
          <Text>
            Each chromatic brand color has one pastel: the same hue, lightened
            to a shared lightness and saturation so any two sit evenly side
            by side. Pastels are fields, not inks. Use them as the background
            of a card, a band, or a tile that should feel like the brand
            without shouting, and keep text on them in the theme&apos;s
            primary color. Each one flips to a deep, muted version of itself
            in dark mode.
          </Text>
          <Grid columns={{ minWidth: 180, max: 5 }} gap={4}>
            {brandPastels.map((pastel) => (
              <ColorSwatch
                key={pastel.token}
                name={pastel.name}
                token={pastel.token}
                detail={`${pastel.hex} · ${pastel.darkHex} dark`}
              />
            ))}
          </Grid>
          <List edge="flush" hasDividers>
            {brandPastels.map((pastel) => (
              <ListItem
                key={pastel.token}
                label={`${pastel.name} · tint of ${
                  brandColors.find((color) => color.token === pastel.from)
                    ?.name
                }`}
                description={pastel.use}
              />
            ))}
          </List>
        </VStack>
      </Section>

      <Section title="Where to use them">
        <VStack gap={2}>
          <Text>
            Every color is published by the theme as a --color-brand-* token,
            so reference the token, never the hex. Use the palette for the
            logo, marketing bands, and moments that should feel like the
            brand. Do not recolor buttons, links, or page backgrounds with
            them. Those follow the theme tokens in Foundations.
          </Text>
          <Text>
            Small sizes — favicon, avatar, embroidery — use Midnight Navy or
            White. The gradient and the spark need enough size to stay
            readable.
          </Text>
        </VStack>
      </Section>
    </Page>
  ),
};
