"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Layout, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { Outline, type OutlineItem } from "@astryxdesign/core/Outline";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

type DocSectionProps = {
  id: string;
  title: string;
  children: ReactNode;
};

/** One titled section of a DocPage. Its id and title also feed the outline. */
export function DocSection({ id, title, children }: DocSectionProps) {
  return (
    <VStack gap={4}>
      <Heading id={id} level={2}>
        {title}
      </Heading>
      {children}
    </VStack>
  );
}

const outlinePanel: CSSProperties = {
  paddingBlockStart: "var(--spacing-10)",
};

function isDocSection(node: ReactNode): node is ReactElement<DocSectionProps> {
  return isValidElement(node) && node.type === DocSection;
}

function findScrollParent(node: HTMLElement): HTMLElement | null {
  for (let el = node.parentElement; el != null; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === "auto" || overflowY === "scroll") {
      return el;
    }
  }
  return null;
}

/**
 * Long-form page with a title block and DocSection children separated by
 * dividers. Wide screens get a sticky outline; narrow ones get a section picker.
 */
export function DocPage({
  title,
  lede,
  actions,
  children,
}: {
  title: string;
  lede: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const sections = Children.toArray(children).filter(isDocSection);
  const outlineItems: OutlineItem[] = sections.map((section) => ({
    id: section.props.id,
    label: section.props.title,
    level: 2,
  }));

  const [activeId, setActiveId] = useState<string | undefined>(
    outlineItems[0]?.id,
  );
  const isMobile = useMediaQuery("(max-width: 768px)");

  // The outline lives in a side panel, outside the content's scroll region,
  // so it cannot find the scroll root on its own.
  const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null);
  const bodyRef = useCallback((node: HTMLElement | null) => {
    setScrollRoot(node == null ? null : findScrollParent(node));
  }, []);
  const scrollContainerRef = useMemo(
    () => ({ current: scrollRoot }),
    [scrollRoot],
  );

  const scrollToId = useCallback((id: string) => {
    setActiveId(id);
    const target = document.getElementById(id);
    if (target != null) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `#${id}`);
    }
  }, []);

  return (
    <Layout
      contentWidth={960}
      end={
        isMobile ? undefined : (
          <LayoutPanel
            label="On this page"
            role="complementary"
            style={outlinePanel}
          >
            {scrollRoot != null && (
              <Outline
                items={outlineItems}
                onActiveIdChange={setActiveId}
                scrollContainerRef={scrollContainerRef}
              />
            )}
          </LayoutPanel>
        )
      }
      content={
        <LayoutContent padding={8}>
          <VStack gap={8} ref={bodyRef}>
            <VStack gap={4}>
              <VStack gap={2}>
                <Heading level={1} type="display-1">
                  {title}
                </Heading>
                <Text type="large" color="secondary">
                  {lede}
                </Text>
              </VStack>
              {actions != null && (
                <HStack gap={2} wrap="wrap">
                  {actions}
                </HStack>
              )}
              {isMobile && (
                <Selector
                  label="On this page"
                  isLabelHidden
                  options={outlineItems.map((item) => ({
                    value: item.id,
                    label: item.label,
                  }))}
                  value={activeId}
                  onChange={scrollToId}
                  width="100%"
                />
              )}
            </VStack>

            {sections.map((section, index) => (
              <Fragment key={section.props.id}>
                {index > 0 && <Divider />}
                {section}
              </Fragment>
            ))}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
