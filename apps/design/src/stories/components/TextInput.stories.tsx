import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/Stack";

const meta = {
  title: "Components/TextInput",
  component: TextInput,
  tags: ["autodocs"],
  args: {
    label: "Display name",
    placeholder: "Ada Lovelace",
    value: "",
  },
} satisfies Meta<typeof TextInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value ?? "");
    return (
      <TextInput
        {...args}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const WithDescription: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <VStack gap={4}>
        <TextInput
          label="Display name"
          description="This is how mentors see you."
          placeholder="Ada Lovelace"
          value={value}
          onChange={setValue}
        />
      </VStack>
    );
  },
};
