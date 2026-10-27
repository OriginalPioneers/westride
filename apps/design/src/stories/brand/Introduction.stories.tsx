import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { List, ListItem } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
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
      lede="Learn together. Spark ideas. Build forward. This Storybook is the brand and interface reference for the platform, published at design.westride.org."
    >
      <Section title="The name">
        <VStack gap={2}>
          <Text>
            We is the community: mentors, collaborators, people who belong in
            the work. Stride is the motion from a first step to something
            launched.
          </Text>
          <Text>
            Two places carry that story. Idea Factory is the spark. Build
            Factory is the structure that makes the spark real. The mark shows
            both: people moving together, steps rising, a spark at the end.
          </Text>
        </VStack>
      </Section>

      <Section title="What lives here">
        <List edge="flush" hasDividers>
          <ListItem
            label="Brand"
            description="Color, typography, and logo for the identity."
          />
          <ListItem
            label="Foundations"
            description="Stone theme tokens the product UI actually paints with."
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
            The web and mobile apps use Astryx with the Stone theme. Import
            the reset and theme styles, then wrap the tree in Theme. Reach
            for a component before a custom box. Spacing comes from the gap,
            padding, and contentWidth props.
          </Text>
          <Card variant="muted" padding={4}>
            <VStack gap={2}>
              <Heading level={3}>Conventions</Heading>
              <Text>
                Dense data is a List or Table of rows. Cards group a single
                subject. Badge is for counts. Color in the product comes from
                theme tokens, not from the logo palette.
              </Text>
            </VStack>
          </Card>
        </VStack>
      </Section>
    </Page>
  ),
};
