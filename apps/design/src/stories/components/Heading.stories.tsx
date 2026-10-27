import type { Meta, StoryObj } from "@storybook/react-vite";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";

const meta = {
  title: "Components/Heading",
  component: Heading,
  tags: ["autodocs"],
  args: {
    level: 1,
    children: "Welcome to WeStride",
  },
} satisfies Meta<typeof Heading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Levels: Story = {
  render: () => (
    <VStack gap={3}>
      <Heading level={1}>Page title</Heading>
      <Heading level={2}>Section</Heading>
      <Heading level={3}>Subsection</Heading>
      <Heading level={4}>Group</Heading>
    </VStack>
  ),
};
