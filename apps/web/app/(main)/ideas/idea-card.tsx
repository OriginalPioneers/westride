import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { isClaimableIdea } from "@westride/db/claim-rules";
import type { IdeaWithDetails } from "@westride/db/ideas";
import { markdownExcerpt } from "@/lib/ideas/excerpt";
import { ideaPath, ideasPath } from "@/lib/ideas/filters";
import { LibraryCard } from "../library-card";
import { FollowButton } from "./follow-button";
import { FeaturedBadge, IdeaTypeBadge, UnclaimedBadge } from "./idea-badges";

const VISIBLE_CATEGORIES = 3;
const VISIBLE_COUNTRIES = 3;

export function summarizeCountries(names: string[]): string {
  const shown = names.slice(0, VISIBLE_COUNTRIES);
  const hidden = names.length - shown.length;
  return hidden > 0 ? `${shown.join(", ")} +${hidden} more` : shown.join(", ");
}

export function IdeaCard({
  idea,
  viewerId,
}: {
  idea: IdeaWithDetails;
  /** Null for a visitor. Members of the idea see no Follow button. */
  viewerId: string | null;
}) {
  const shownCategories = idea.tags.slice(0, VISIBLE_CATEGORIES);
  const hiddenCategoryCount = idea.tags.length - shownCategories.length;
  const isMember =
    viewerId !== null &&
    idea.members.some((member) => member.clerkUserId === viewerId);

  return (
    <LibraryCard
      name={idea.name}
      href={ideaPath(idea.id)}
      imageUrl={idea.imageUrl}
      description={markdownExcerpt(idea.description)}
      meta={summarizeCountries(idea.countries.map((c) => c.name))}
      action={
        isMember ? null : (
          <FollowButton
            ideaId={idea.id}
            isFollowing={idea.isFollowing}
            viewerId={viewerId}
            size="sm"
          />
        )
      }
      footer={
        <>
          <IdeaTypeBadge type={idea.type} />
          {idea.isFeatured ? <FeaturedBadge /> : null}
          {isClaimableIdea(idea) ? <UnclaimedBadge /> : null}
          {shownCategories.map((category) => (
            <Token
              key={category.id}
              label={category.name}
              size="sm"
              href={ideasPath({ category: category.slug })}
            />
          ))}
          {hiddenCategoryCount > 0 ? (
            <Text type="supporting">+{hiddenCategoryCount} more</Text>
          ) : null}
        </>
      }
    />
  );
}
