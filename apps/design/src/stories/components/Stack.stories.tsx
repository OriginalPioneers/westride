import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "@astryxdesign/core/Card";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

const meta = {
  title: "Components/Stack",
  component: VStack,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "VStack and HStack are the spacing primitives. Pass gap from the spacing scale. Do not add margins on children.",
      },
    },
  },
} satisfies Meta<typeof VStack>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Vertical: Story = {
  render: () => (
    <VStack gap={3}>
      <Card variant="muted" padding={4}>
        <Text type="label">First</Text>
      </Card>
      <Card variant="muted" padding={4}>
        <Text type="label">Second</Text>
      </Card>
      <Card variant="muted" padding={4}>
        <Text type="label">Third</Text>
      </Card>
    </VStack>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <HStack gap={3}>
      <Card variant="muted" padding={4}>
        <Text type="label">Learn</Text>
      </Card>
      <Card variant="muted" padding={4}>
        <Text type="label">Spark</Text>
      </Card>
      <Card variant="muted" padding={4}>
        <Text type="label">Build</Text>
      </Card>
    </HStack>
  ),
};
