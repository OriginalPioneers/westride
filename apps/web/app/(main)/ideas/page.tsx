import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import {
  isSupportWant,
  listCategoryOptions,
  listIdeaFilterOptions,
  listIdeas,
  type IdeaWithDetails,
} from "@westride/db/ideas";
import { signInPath } from "@/lib/auth-paths";
import {
  IDEA_VIEW_LABELS,
  SUPPORT_WANT_LABELS,
  ideasPath,
  readIdeaFilterValues,
  resolveIdeaCollection,
  toIdeaFilters,
  type IdeaCollection,
  type IdeaFilterValues,
} from "@/lib/ideas/filters";
import { IdeaCard } from "./idea-card";
import { IdeaComposer } from "./idea-composer";
import {
  IdeaCollectionTabs,
  IdeaSearchBar,
  IdeaSupportFilter,
} from "./idea-filters";

export const metadata: Metadata = {
  title: "Idea Workshop",
};

type SearchParams = Record<string, string | string[] | undefined>;

const SEARCH_DESCRIPTION = "Every idea you can see that matches.";
const CATEGORY_DESCRIPTION = "Ideas the community filed under this category.";

const VIEW_DESCRIPTIONS = {
  mine: "Ideas you founded or joined, including private ones.",
  following: "Ideas you follow to keep up with.",
  featured: "Ideas the WeStride team picked as the ones to watch.",
} as const;

function titleize(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function collectionHeading(
  collection: IdeaCollection,
  categoryNames: Map<string, string>,
): { title: string; description: string } {
  switch (collection.kind) {
    case "search":
      return {
        title: `Results for “${collection.query}”`,
        description: SEARCH_DESCRIPTION,
      };
    case "category":
      return {
        title: categoryNames.get(collection.slug) ?? titleize(collection.slug),
        description: CATEGORY_DESCRIPTION,
      };
    case "view":
      return {
        title: IDEA_VIEW_LABELS[collection.view],
        description: VIEW_DESCRIPTIONS[collection.view],
      };
  }
}

function signInHref(values: IdeaFilterValues): string {
  return `${signInPath}?redirect_url=${encodeURIComponent(ideasPath(values))}`;
}

function CollectionEmptyState({
  collection,
  values,
  isSignedIn,
}: {
  collection: IdeaCollection;
  values: IdeaFilterValues;
  isSignedIn: boolean;
}) {
  if (
    !isSignedIn &&
    collection.kind === "view" &&
    collection.view !== "featured"
  ) {
    return (
      <EmptyState
        title={
          collection.view === "mine"
            ? "Sign in to see your ideas"
            : "Sign in to follow ideas"
        }
        description={
          collection.view === "mine"
            ? "Your own ideas, including private ones, show up here once you are signed in."
            : "Follow any idea to keep up with it here."
        }
        actions={<Button label="Sign in" href={signInHref(values)} />}
      />
    );
  }
  if (isSupportWant(values.wants)) {
    const label = SUPPORT_WANT_LABELS[values.wants].toLowerCase();
    return (
      <EmptyState
        title={`No ideas looking for ${label}`}
        description="Nothing in this view is asking for that right now. Clear the filter to see the rest of the collection."
        actions={
          <Button
            label="Clear support filter"
            href={ideasPath({ ...values, wants: "" })}
          />
        }
      />
    );
  }
  if (collection.kind === "search") {
    return (
      <EmptyState
        title="No ideas match"
        description="Try another word, or browse a collection below the search bar."
        actions={
          <Button
            label="Clear search"
            href={ideasPath({ ...values, q: "" })}
          />
        }
      />
    );
  }
  if (collection.kind === "category") {
    return (
      <EmptyState
        title="No ideas in this category yet"
        description="Describe one above and file it here, or pick another category."
      />
    );
  }
  if (collection.view === "featured") {
    return (
      <EmptyState
        title="Nothing featured yet"
        description="The WeStride team has not picked any ideas to feature. Check back soon."
      />
    );
  }
  if (collection.view === "following") {
    return (
      <EmptyState
        title="You are not following any ideas yet"
        description="Follow an idea from Best of WeStride or a category, and it will show up here."
        actions={
          <Button
            label="Browse Best of WeStride"
            href={ideasPath({
              view: "featured",
              sort: values.sort,
              wants: values.wants,
            })}
          />
        }
      />
    );
  }
  return (
    <EmptyState
      title="No ideas yet"
      description="Describe one above and you will be the founder. You can invite other people onto the team."
    />
  );
}

function IdeaGrid({
  ideas,
  viewerId,
}: {
  ideas: IdeaWithDetails[];
  viewerId: string | null;
}) {
  return (
    <Grid columns={{ minWidth: 320, max: 3 }} gap={4}>
      {ideas.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} viewerId={viewerId} />
      ))}
    </Grid>
  );
}

export default async function IdeaWorkshopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [{ userId }, params] = await Promise.all([auth(), searchParams]);
  const viewer = { clerkUserId: userId };
  const isSignedIn = userId !== null;
  const values = readIdeaFilterValues(params);
  const collection = resolveIdeaCollection(values, isSignedIn);

  const [ideas, options, categoryOptions, account] = await Promise.all([
    listIdeas(toIdeaFilters(values, isSignedIn), viewer),
    listIdeaFilterOptions(viewer),
    isSignedIn ? listCategoryOptions() : Promise.resolve([]),
    isSignedIn ? currentUser() : Promise.resolve(null),
  ]);
  const founder = isSignedIn
    ? {
        name: account?.fullName || account?.username || "You",
        imageUrl: account?.hasImage ? account.imageUrl : null,
      }
    : null;

  const categoryNames = new Map(options.tags.map((tag) => [tag.slug, tag.name]));
  const heading = collectionHeading(collection, categoryNames);
  const countryFilter = values.country
    ? options.countries.find((country) => country.code === values.country)
    : undefined;
  const countLabel = ideas.length === 1 ? "1 idea" : `${ideas.length} ideas`;

  return (
    <Layout
      contentWidth={1120}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={4}>
            <IdeaSearchBar values={values} />
            <IdeaCollectionTabs
              values={values}
              isSignedIn={isSignedIn}
              categories={options.tags.map((tag) => ({
                slug: tag.slug,
                name: tag.name,
              }))}
            />
            <IdeaSupportFilter values={values} />
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={10}>
            <IdeaComposer founder={founder} categoryOptions={categoryOptions} />

            <VStack gap={4}>
              <HStack gap={3} vAlign="end" wrap="wrap">
                <StackItem size="fill">
                  <VStack gap={1}>
                    {/* The collection is the page's heading now that the title block is gone. */}
                    <Heading level={2} accessibilityLevel={1}>
                      {heading.title}
                    </Heading>
                    {heading.description ? (
                      <Text type="supporting">{heading.description}</Text>
                    ) : null}
                  </VStack>
                </StackItem>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  {values.country ? (
                    <Token
                      label={`In ${countryFilter?.name ?? values.country}`}
                      href={ideasPath({ ...values, country: "" })}
                      description="Remove the geography filter"
                    />
                  ) : null}
                  {isSupportWant(values.wants) ? (
                    <Token
                      label={`Needing ${SUPPORT_WANT_LABELS[values.wants].toLowerCase()}`}
                      href={ideasPath({ ...values, wants: "" })}
                      description="Remove the support filter"
                    />
                  ) : null}
                  {ideas.length > 0 ? (
                    <Text type="supporting">{countLabel}</Text>
                  ) : null}
                </HStack>
              </HStack>

              {ideas.length === 0 ? (
                <CollectionEmptyState
                  collection={collection}
                  values={values}
                  isSignedIn={isSignedIn}
                />
              ) : (
                <IdeaGrid ideas={ideas} viewerId={userId} />
              )}
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
