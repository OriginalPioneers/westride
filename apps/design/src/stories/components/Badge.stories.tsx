import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "@astryxdesign/core/Badge";
import { HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Stack";

const meta = {
  title: "Components/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: {
    label: "3",
    variant: "neutral",
  },
  parameters: {
    docs: {
      description: {
        component:
          "Badges show counts. Use a List row for a named status, and a Card for a subject. Color here means the kind of count, not a category tag.",
      },
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Counts: Story = {
  render: () => (
    <VStack gap={3}>
      <Text type="supporting">
        Neutral for a plain total. Info, success, warning, and error when the
        number itself is the status.
      </Text>
      <HStack gap={3}>
        <Badge label="12" variant="neutral" />
        <Badge label="4" variant="info" />
        <Badge label="8" variant="success" />
        <Badge label="2" variant="warning" />
        <Badge label="1" variant="error" />
      </HStack>
    </VStack>
  ),
};
