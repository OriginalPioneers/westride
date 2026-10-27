import type { Meta, StoryObj } from "@storybook/react-vite";
import { Link } from "@astryxdesign/core/Link";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

const meta = {
  title: "Components/Link",
  component: Link,
  tags: ["autodocs"],
  args: {
    href: "https://westride.org",
    children: "westride.org",
  },
} satisfies Meta<typeof Link>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Inline: Story = {
  render: () => (
    <VStack gap={2}>
      <Text>
        Read the <Link href="https://westride.org">platform introduction</Link>{" "}
        before you publish a project.
      </Text>
      <Link href="https://design.westride.org" hasUnderline>
        design.westride.org
      </Link>
    </VStack>
  ),
};
