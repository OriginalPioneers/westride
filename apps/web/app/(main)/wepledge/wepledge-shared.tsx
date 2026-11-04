import type { CSSProperties, ReactNode } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

/**
 * Pieces both the server page and its client islands use. No directive, so
 * each side gets its own copy and nothing crosses the boundary as a reference.
 */

export const WEPLEDGE_CONTENT_WIDTH = 1120;

export const centered: CSSProperties = {
  marginInline: "auto",
  boxSizing: "content-box",
};

/* Section props stop at spacing step 10, and Section paints its surface on
   an inner element, so a band's padding lives on its content column. */
export const bandPadding: CSSProperties = {
  paddingInline: "var(--spacing-6)",
  paddingBlock: "calc(var(--spacing-12) * 1.5)",
};

const eyebrowStyle: CSSProperties = {
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Text type="label" size="sm" weight="semibold" className="sp-eyebrow" style={eyebrowStyle}>
      {children}
    </Text>
  );
}

export function Container({
  children,
  gap = 8,
  className,
  style,
}: {
  children: ReactNode;
  gap?: 4 | 6 | 8 | 10;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <VStack
      gap={gap}
      maxWidth={WEPLEDGE_CONTENT_WIDTH}
      className={className}
      style={{ ...centered, ...bandPadding, ...style }}
    >
      {children}
    </VStack>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  lede,
  align = "start",
  end,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "start" | "center";
  /** Something to sit beside the intro, like a button. */
  end?: ReactNode;
}) {
  return (
    <VStack
      gap={3}
      hAlign={align}
      maxWidth={align === "center" ? 760 : 820}
      className="sp-reveal"
      style={align === "center" ? centered : undefined}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <Heading level={2} type="display-3" justify={align} textWrap="balance">
        {title}
      </Heading>
      {lede != null && (
        <Text type="large" color="secondary" justify={align} textWrap="pretty">
          {lede}
        </Text>
      )}
      {end}
    </VStack>
  );
}
