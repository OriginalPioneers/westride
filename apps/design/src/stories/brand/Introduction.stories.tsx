import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { List, ListItem } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import {
  brandDescriptor,
  brandTagline,
  brandTaglineSupport,
} from "@westride/theme";
import { Page, Section } from "../../docs/Page";

const meta = {
  title: "Brand/Introduction",
  parameters: { layout: "fullscreen" },
};

export default meta;

export const Guide = {
  render: () => (
    <Page
      title="WeStride"
      lede={`${brandTagline} This Storybook is the brand and interface reference for the platform, published at design.westride.org.`}
    >
      <Section title="The tagline">
        <Card padding={6} style={{ backgroundColor: "var(--color-brand-navy)" }}>
          <VStack gap={3}>
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
              level={2}
              type="display-2"
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
              type="large"
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
        <Text type="supporting">
          The guiding message. Set the tagline in Figtree Bold, tracked wide,
          in capitals. The support line sits beneath it in Regular weight. Use
          the descriptor as an eyebrow when the lockup needs context.
        </Text>
      </Section>

      <Section title="The name">
        <VStack gap={2}>
          <Text>
            We is the community: mentors, collaborators, people who belong in
            the work. Stride is the motion from a first step to something
            launched, with AI alongside the whole way.
          </Text>
          <Text>
            Three studios carry that story. Idea Workshop is the spark. Project
            Factory is the structure that makes the spark real. Agent Studio
            keeps it moving after launch. The mark shows all of it: people
            moving together, steps rising, a spark at the end.
          </Text>
        </VStack>
      </Section>

      <Section title="What lives here">
        <List edge="flush" hasDividers>
          <ListItem
            label="Brand"
            description="Logo system, brand icon, color palette, typography, and the tagline."
          />
          <ListItem
            label="Foundations"
            description="The theme tokens the product UI actually paints with."
          />
          <ListItem
            label="Components"
            description="Astryx components to compose screens. Start here instead of custom layout."
          />
        </List>
      </Section>

      <Section title="How to build a screen">
        <VStack gap={3}>
          <Text>
            The web app, the API explorer, the MCP guide, and this site all
            use Astryx with the WeStride theme from @westride/theme. Import the
            reset and theme styles, then wrap the tree in Theme. Reach for a
            component before a custom box. Spacing comes from the gap,
            padding, and contentWidth props.
          </Text>
          <Card variant="muted" padding={4}>
            <VStack gap={2}>
              <Heading level={3}>Conventions</Heading>
              <Text>
                Dense data is a List or Table of rows. Cards group a single
                subject. Badge is for counts. Color in the product comes from
                theme tokens. The brand palette is published as
                --color-brand-* tokens for the logo and brand moments only.
              </Text>
            </VStack>
          </Card>
        </VStack>
      </Section>
    </Page>
  ),
};
