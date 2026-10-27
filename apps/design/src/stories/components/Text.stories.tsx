import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Stack";

const meta = {
  title: "Components/Text",
  component: Text,
  tags: ["autodocs"],
  args: {
    children: "Turn a spark into something you can build.",
    type: "body",
  },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Types: Story = {
  render: () => (
    <VStack gap={2}>
      <Text type="large">Large</Text>
      <Text type="body">Body</Text>
      <Text type="label">Label</Text>
      <Text type="supporting">Supporting</Text>
      <Text type="code">--color-text-primary</Text>
    </VStack>
  ),
};
