import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { brandFontFamily, brandFontWeights } from "@westride/theme";
import { Wordmark } from "../../brand/Wordmark";
import { Page, Section } from "../../docs/Page";

const meta = {
  title: "Brand/Typography",
  parameters: { layout: "fullscreen" },
};

export default meta;

export const Guide = {
  render: () => (
    <Page
      title="Typography"
      lede={`${brandFontFamily} is used for all brand communications: the wordmark, the tagline, headings, and body copy. Code is the one exception, set in JetBrains Mono.`}
    >
      <Section title="The typeface">
        <Card padding={6}>
          <HStack gap={8} vAlign="end" wrap="wrap">
            <VStack gap={1}>
              <Heading
                level={2}
                type="display-1"
                weight="bold"
                style={{ fontFamily: "var(--font-family-heading)" }}
              >
                Aa
              </Heading>
              <Text type="label">{brandFontFamily}</Text>
            </VStack>
            <StackItem size="fill">
              <Grid columns={{ minWidth: 80, max: 5 }} gap={4}>
                {brandFontWeights.map((weight) => (
                  <VStack key={weight.weight} gap={1}>
                    <Text type="supporting" size="sm">
                      {weight.name}
                    </Text>
                    <Text type="supporting" size="sm">
                      {weight.weight}
                    </Text>
                    <Heading
                      level={3}
                      style={{
                        fontFamily: "var(--font-family-body)",
                        fontWeight: weight.weight,
                      }}
                    >
                      Aa
                    </Heading>
                  </VStack>
                ))}
              </Grid>
            </StackItem>
          </HStack>
        </Card>
        <Text type="supporting">
          Five weights ship: Light 300, Regular 400, Medium 500, Semibold 600,
          and Bold 700. The theme loads them all through its font stylesheet,
          so Heading and Text pick them up with the weight prop.
        </Text>
      </Section>

      <Section title="Wordmark">
        <Card padding={6}>
          <VStack gap={3}>
            <Wordmark level={1} />
            <Text type="supporting">
              Figtree Bold. Always lowercase. Set in Midnight Navy on light
              backgrounds, and in white when the field is navy. Track it
              slightly tight so the letters read as one shape.
            </Text>
            <Text type="code">
              font-family: var(--font-family-heading); font-weight:
              var(--font-weight-bold)
            </Text>
          </VStack>
        </Card>
      </Section>

      <Section title="In the product">
        <VStack gap={2}>
          <Text>
            Headings and body both use Figtree through the theme, so the
            product reads as the brand without any extra setup. Use Heading
            and Text; they already carry --font-family-heading and
            --font-family-body. See Foundations / Typography for the scale.
          </Text>
        </VStack>
      </Section>

      <Section title="What not to do">
        <VStack gap={2}>
          <Text>Do not set the wordmark in title case or all caps.</Text>
          <Text>Do not track it loose, and do not use a serif or a monospace.</Text>
          <Text>
            Do not substitute another family. Figtree is the only brand face;
            there is no separate display or wordmark font.
          </Text>
        </VStack>
      </Section>
    </Page>
  ),
};
