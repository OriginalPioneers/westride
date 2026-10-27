import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";

const meta = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  args: {
    label: "Continue",
    variant: "primary",
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <HStack gap={3}>
      <Button label="Primary" variant="primary" />
      <Button label="Secondary" variant="secondary" />
      <Button label="Ghost" variant="ghost" />
      <Button label="Destructive" variant="destructive" />
    </HStack>
  ),
};

export const Sizes: Story = {
  render: () => (
    <HStack gap={3} vAlign="center">
      <Button label="Small" size="sm" variant="primary" />
      <Button label="Medium" size="md" variant="primary" />
      <Button label="Large" size="lg" variant="primary" />
    </HStack>
  ),
};

export const States: Story = {
  render: () => (
    <VStack gap={3}>
      <HStack gap={3}>
        <Button label="Ready" variant="primary" />
        <Button label="Working" variant="primary" isLoading />
        <Button label="Unavailable" variant="primary" isDisabled />
      </HStack>
    </VStack>
  ),
};
