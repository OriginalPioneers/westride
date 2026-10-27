import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { List, ListItem } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { brandColors, stampGradient } from "../../brand/tokens";
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
      lede="The identity palette lives on the logo. Product screens stay on the Stone theme so the interface can be quiet and the mark can be loud."
    >
      <Section title="Identity palette">
        <Grid columns={{ minWidth: 220, max: 3 }} gap={4}>
          {brandColors.map((color) => (
            <ColorSwatch
              key={color.token}
              name={color.name}
              token={color.token}
              detail={color.hex}
            />
          ))}
        </Grid>
      </Section>

      <Section title="How the stamp uses them">
        <VStack gap={3}>
          <Card height={88} padding={0} style={{ background: stampGradient }} />
          <Text>
            The four strokes run Electric Indigo, Vivid Violet, Bright Azure,
            and Stride Teal, left to right, each one taller than the last.
            Sunrise Coral is reserved for the spark at the top of the final
            stroke. It is not a fifth stop in the bar.
          </Text>
          <List edge="flush" hasDividers>
            {brandColors.map((color) => (
              <ListItem
                key={color.token}
                label={color.name}
                description={color.role}
              />
            ))}
          </List>
        </VStack>
      </Section>

      <Section title="Where to use them">
        <VStack gap={2}>
          <Text>
            Use this palette for the logo, marketing, and moments that should
            feel like the brand. Do not recolor buttons, links, or page
            backgrounds with these hex values. Those follow the Stone theme
            tokens in Foundations.
          </Text>
          <Text>
            Small sizes — favicon, avatar, embroidery — use Deep Stride Navy
            or white. The gradient and the coral spark need enough size to
            stay readable.
          </Text>
        </VStack>
      </Section>
    </Page>
  ),
};
