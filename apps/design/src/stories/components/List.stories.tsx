import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "@astryxdesign/core/Badge";
import { Heading } from "@astryxdesign/core/Heading";
import { List, ListItem } from "@astryxdesign/core/List";

const meta = {
  title: "Components/List",
  component: List,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Rows for repeated data. Put the count in a Badge at the end of the row.",
      },
    },
  },
} satisfies Meta<typeof List>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Tracks: Story = {
  args: {
    children: null,
  },
  render: () => (
    <List
      edge="flush"
      hasDividers
      header={<Heading level={2}>Academy</Heading>}
    >
      <ListItem
        label="Prompting"
        description="Ask for the outcome, then tighten the constraints."
        endContent={<Badge label="6" />}
      />
      <ListItem
        label="Agents"
        description="Give a tool a job and a place to stop."
        endContent={<Badge label="4" />}
      />
      <ListItem
        label="Shipping"
        description="Take a prototype to a URL someone else can open."
        endContent={<Badge label="3" />}
      />
    </List>
  ),
};
