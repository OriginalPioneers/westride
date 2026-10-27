import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

const meta = {
  title: "Components/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A card holds one subject. A list of peers belongs in List, not a stack of cards.",
      },
    },
  },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card padding={4}>
      <VStack gap={1}>
        <Heading level={3}>Idea Studio</Heading>
        <Text type="supporting">
          Start with a spark, then shape it into a plan.
        </Text>
      </VStack>
    </Card>
  ),
};

export const Variants: Story = {
  render: () => (
    <Grid columns={{ minWidth: 200, max: 3 }} gap={4}>
      <Card padding={4}>
        <Text type="label">Default</Text>
      </Card>
      <Card variant="muted" padding={4}>
        <Text type="label">Muted</Text>
      </Card>
      <Card variant="transparent" padding={4}>
        <Text type="label">Transparent</Text>
      </Card>
    </Grid>
  ),
};
