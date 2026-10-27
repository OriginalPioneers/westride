import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Page, Section } from "../../docs/Page";

const wordmarkStyle = {
  fontFamily: "var(--font-family-wordmark)",
  fontWeight: 800,
  letterSpacing: "-0.04em",
  color: "var(--color-stride-navy)",
} as const;

const meta = {
  title: "Brand/Typography",
  parameters: { layout: "fullscreen" },
};

export default meta;

export const Guide = {
  render: () => (
    <Page
      title="Typography"
      lede="The wordmark is lowercase, extra-bold, and tightly tracked. Everything else on the platform uses the Stone theme faces."
    >
      <Section title="Wordmark">
        <Card padding={6}>
          <VStack gap={3}>
            <Heading level={1} style={wordmarkStyle}>
              westride
            </Heading>
            <Text type="supporting">
              Manrope ExtraBold. Always lowercase. Set in Deep Stride Navy on
              light backgrounds, and in white when the field is navy. A future
              custom face can replace Manrope. Until then, do not substitute
              another family for the wordmark.
            </Text>
            <Text type="code">font-family: var(--font-family-wordmark)</Text>
          </VStack>
        </Card>
      </Section>

      <Section title="What not to do">
        <VStack gap={2}>
          <Text>Do not set the wordmark in title case or all caps.</Text>
          <Text>Do not track it loose, and do not use a serif or a monospace.</Text>
          <Text>
            Do not set product UI in Manrope. Headings, body, and code on the
            platform are Montserrat, Figtree, and JetBrains Mono. See
            Foundations / Typography.
          </Text>
        </VStack>
      </Section>
    </Page>
  ),
};
