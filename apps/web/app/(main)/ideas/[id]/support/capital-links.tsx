import { Banner } from "@astryxdesign/core/Banner";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { IdeaCapitalLink } from "@westride/db";
import { linkHostname } from "@/lib/support/schema";

export const CAPITAL_DISCLAIMER =
  "WeStride never collects, holds, or processes money. These links go to places the team chose, outside WeStride. Check who you are giving to before you contribute.";

/**
 * Where the team accepts capital. Every link is external, opens in a new
 * tab with noopener/noreferrer/nofollow, and shows its hostname so people
 * can see where they are going before they click.
 */
export function CapitalLinks({ links }: { links: IdeaCapitalLink[] }) {
  if (links.length === 0) {
    return null;
  }
  return (
    <VStack gap={3}>
      <VStack gap={2}>
        {links.map((link) => (
          <HStack key={link.id} gap={2} vAlign="center" wrap="wrap">
            <Link
              href={link.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              isExternalLink
              isStandalone
            >
              {link.label || linkHostname(link.url)}
            </Link>
            {link.label ? (
              <StackItem size="fill">
                <Text type="supporting">{linkHostname(link.url)}</Text>
              </StackItem>
            ) : null}
          </HStack>
        ))}
      </VStack>
      <Banner status="info" title="Outside WeStride" description={CAPITAL_DISCLAIMER} />
    </VStack>
  );
}
