import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Page, Section } from "../../docs/Page";

const families = [
  {
    name: "Headings",
    token: "--font-family-heading",
    face: "Montserrat",
    sample: "Learn together",
    style: { fontFamily: "var(--font-family-heading)" },
  },
  {
    name: "Body",
    token: "--font-family-body",
    face: "Figtree",
    sample: "Spark an idea, then take the next step with a mentor.",
    style: { fontFamily: "var(--font-family-body)" },
  },
  {
    name: "Code",
    token: "--font-family-code",
    face: "JetBrains Mono",
    sample: "bun run dev --filter=web",
    style: { fontFamily: "var(--font-family-code)" },
  },
] as const;

const meta = {
  title: "Foundations/Typography",
  parameters: { layout: "fullscreen" },
};

export default meta;

export const Guide = {
  render: () => (
    <Page
      title="Product type"
      lede="Stone loads three families. Use Heading and Text so size, weight, and leading stay on the theme scale."
    >
      <Section title="Families">
        <VStack gap={4}>
          {families.map((family) => (
            <Card key={family.token} padding={4}>
              <VStack gap={2}>
                <Text type="label">
                  {family.name} · {family.face}
                </Text>
                <Text type="large" style={family.style}>
                  {family.sample}
                </Text>
                <Text type="code">{family.token}</Text>
              </VStack>
            </Card>
          ))}
        </VStack>
      </Section>

      <Section title="Heading scale">
        <VStack gap={3}>
          <Heading level={1}>Heading 1</Heading>
          <Heading level={2}>Heading 2</Heading>
          <Heading level={3}>Heading 3</Heading>
          <Heading level={4}>Heading 4</Heading>
        </VStack>
      </Section>

      <Section title="Text styles">
        <VStack gap={2}>
          <Text type="large">Large. Introductions and ledes.</Text>
          <Text type="body">Body. The default for paragraphs.</Text>
          <Text type="label">Label. Names of controls and items.</Text>
          <Text type="supporting">Supporting. Secondary explanation.</Text>
          <Text type="code">code. Tokens, commands, and identifiers.</Text>
        </VStack>
      </Section>
    </Page>
  ),
};
