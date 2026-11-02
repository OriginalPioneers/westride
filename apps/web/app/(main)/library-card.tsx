import type { ReactNode } from "react";
import Image from "next/image";
import { AspectRatio } from "@astryxdesign/core/AspectRatio";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Section } from "@astryxdesign/core/Section";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { EntityImage } from "./entity-image";

/** Entity images are stored as 512×512 squares; the card crops them to 16:9. */
const ENTITY_IMAGE_SIZE = 512;
const THUMBNAIL_RATIO = 16 / 9;

/**
 * The full-bleed thumbnail at the top of the card. Items without an image
 * get a muted panel with their initials so the grid stays uniform.
 */
function Thumbnail({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  if (imageUrl) {
    return (
      <AspectRatio ratio={THUMBNAIL_RATIO} fit="cover">
        <Image
          src={imageUrl}
          alt=""
          width={ENTITY_IMAGE_SIZE}
          height={ENTITY_IMAGE_SIZE}
          unoptimized
        />
      </AspectRatio>
    );
  }

  return (
    <AspectRatio ratio={THUMBNAIL_RATIO}>
      <Section variant="muted" padding={0} height="100%">
        <Center height="100%">
          <EntityImage name={name} imageUrl={null} size={72} />
        </Center>
      </Section>
    </AspectRatio>
  );
}

/**
 * The card every studio grid uses for an idea, project, or agent, in the
 * style of the Astryx Library template: image on top, then the name, a
 * short description, and a footer row of badges. Stretches to the row's
 * height so the footer lines up across cards.
 */
export function LibraryCard({
  name,
  href,
  imageUrl,
  description,
  meta,
  action,
  children,
  footer,
}: {
  name: string;
  href: string;
  imageUrl: string | null;
  /** Plain-text excerpt; two lines at most. */
  description?: string | null;
  /** One supporting line under the description: countries, repos, links. */
  meta?: string | null;
  /** A small control beside the name, such as Follow. */
  action?: ReactNode;
  /** Anything else that belongs in the body, such as a progress bar. */
  children?: ReactNode;
  /** The pinned bottom row: badges and tokens. */
  footer?: ReactNode;
}) {
  return (
    <Card padding={0} height="100%">
      <VStack height="100%">
        <Thumbnail name={name} imageUrl={imageUrl} />
        <StackItem size="fill">
          <Section variant="transparent" padding={4} height="100%">
            <VStack gap={3} height="100%">
              <StackItem size="fill">
                <VStack gap={1}>
                  <HStack gap={2} vAlign="start">
                    <StackItem size="fill">
                      <Heading level={3} maxLines={2}>
                        <Link href={href}>{name}</Link>
                      </Heading>
                    </StackItem>
                    {action}
                  </HStack>
                  {description ? (
                    <Text type="body" size="sm" color="secondary" maxLines={2}>
                      {description}
                    </Text>
                  ) : null}
                  {meta ? (
                    <Text type="supporting" maxLines={1}>
                      {meta}
                    </Text>
                  ) : null}
                </VStack>
              </StackItem>
              {children}
              {footer ? (
                <HStack gap={1} wrap="wrap" vAlign="center">
                  {footer}
                </HStack>
              ) : null}
            </VStack>
          </Section>
        </StackItem>
      </VStack>
    </Card>
  );
}
