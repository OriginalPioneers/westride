import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <Heading level={1}>{title}</Heading>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <Text type="supporting">Coming soon.</Text>
        </LayoutContent>
      }
    />
  );
}
