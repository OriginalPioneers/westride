import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import type { IdeaWithDetails } from "@westride/db/ideas";
import { markdownExcerpt } from "@/lib/ideas/excerpt";
import { ideaPath, ideasPath } from "@/lib/ideas/filters";
import { FeaturedBadge, IdeaTypeBadge } from "./idea-badges";

const VISIBLE_TAGS = 4;
const VISIBLE_COUNTRIES = 3;

export function summarizeCountries(names: string[]): string {
  const shown = names.slice(0, VISIBLE_COUNTRIES);
  const hidden = names.length - shown.length;
  return hidden > 0 ? `${shown.join(", ")} +${hidden} more` : shown.join(", ");
}

export function IdeaCard({ idea }: { idea: IdeaWithDetails }) {
  const shownTags = idea.tags.slice(0, VISIBLE_TAGS);
  const hiddenTagCount = idea.tags.length - shownTags.length;
  const excerpt = markdownExcerpt(idea.description);
  const countries = summarizeCountries(idea.countries.map((c) => c.name));

  return (
    <Card>
      <VStack gap={3}>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <IdeaTypeBadge type={idea.type} />
          {idea.isFeatured ? <FeaturedBadge /> : null}
        </HStack>
        <VStack gap={1}>
          <Heading level={3} maxLines={2}>
            <Link href={ideaPath(idea.id)}>{idea.name}</Link>
          </Heading>
          {countries ? (
            <Text type="supporting" maxLines={1}>
              {countries}
            </Text>
          ) : null}
        </VStack>
        {excerpt ? <Text maxLines={3}>{excerpt}</Text> : null}
        {shownTags.length > 0 ? (
          <HStack gap={1} wrap="wrap" vAlign="center">
            {shownTags.map((tag) => (
              <Token
                key={tag.id}
                label={tag.name}
                size="sm"
                href={ideasPath({ tag: tag.slug })}
              />
            ))}
            {hiddenTagCount > 0 ? (
              <Text type="supporting">+{hiddenTagCount} more</Text>
            ) : null}
          </HStack>
        ) : null}
      </VStack>
    </Card>
  );
}
