import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

const meta = {
  title: "Components/Grid",
  component: Grid,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Use the object form of columns so tracks reflow. minWidth is the smallest a cell may be, and max caps the count.",
      },
    },
  },
} satisfies Meta<typeof Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

const tiles = [
  ["Academy", "Lessons you can finish this week."],
  ["Mentorship", "Someone who has shipped the thing you are attempting."],
  ["Build Studio", "A prototype with a URL."],
] as const;

export const Reflowing: Story = {
  render: () => (
    <Grid columns={{ minWidth: 220, max: 3 }} gap={4}>
      {tiles.map(([title, body]) => (
        <Card key={title} padding={4}>
          <VStack gap={1}>
            <Heading level={3}>{title}</Heading>
            <Text type="supporting">{body}</Text>
          </VStack>
        </Card>
      ))}
    </Grid>
  ),
};
