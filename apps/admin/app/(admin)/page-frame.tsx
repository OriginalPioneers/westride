import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

/**
 * The frame every admin page shares: the dashboard template's fill layout
 * with a title row, then whatever the page is about.
 */
export function PageFrame({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  /** Buttons at the right of the title row. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Layout height="fill">
      <LayoutContent padding={6}>
        <VStack gap={6}>
          <HStack gap={4} vAlign="start">
            <StackItem size="fill">
              <VStack gap={1}>
                <Heading level={1}>{title}</Heading>
                {description ? <Text type="supporting">{description}</Text> : null}
              </VStack>
            </StackItem>
            {actions ? <StackItem size="static">{actions}</StackItem> : null}
          </HStack>
          {children}
        </VStack>
      </LayoutContent>
    </Layout>
  );
}
