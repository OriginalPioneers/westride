import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { listIdeaFilterOptions, listIdeas } from "@westride/db/ideas";
import {
  hasIdeaFilters,
  IDEA_TYPE_LABELS,
  ideaTypeParam,
  readIdeaFilterValues,
  toIdeaFilters,
} from "@/lib/ideas/filters";
import { IdeaCard } from "./idea-card";
import { IdeaFilters } from "./idea-filters";

export const metadata: Metadata = {
  title: "Idea Studio",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function IdeaStudioPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [{ userId }, params] = await Promise.all([auth(), searchParams]);
  const viewer = { clerkUserId: userId };
  const values = readIdeaFilterValues(params);

  const [ideas, options] = await Promise.all([
    listIdeas(toIdeaFilters(values), viewer),
    listIdeaFilterOptions(viewer),
  ]);

  const featured = ideas.filter((idea) => idea.isFeatured);
  const rest = ideas.filter((idea) => !idea.isFeatured);
  const hasFilters = hasIdeaFilters(values);
  const countLabel = ideas.length === 1 ? "1 idea" : `${ideas.length} ideas`;

  return (
    <Layout
      contentWidth={1120}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <VStack gap={1}>
                <Heading level={1}>Idea Studio</Heading>
                <Text type="supporting">
                  Businesses and non-profits the community is dreaming up.
                  Find one to join, or get inspired to start your own.
                </Text>
              </VStack>
            </StackItem>
            {ideas.length > 0 ? (
              <Text type="supporting">{countLabel}</Text>
            ) : null}
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={6}>
            <IdeaFilters
              values={values}
              typeOptions={options.types.map((type) => ({
                value: ideaTypeParam(type),
                label: IDEA_TYPE_LABELS[type],
              }))}
              countryOptions={options.countries.map((country) => ({
                value: country.code,
                label: country.name,
              }))}
              tagOptions={options.tags.map((tag) => ({
                value: tag.slug,
                label: tag.name,
              }))}
            />

            {ideas.length === 0 ? (
              hasFilters ? (
                <EmptyState
                  title="No ideas match"
                  description="Try a different search, type, geography, or tag."
                  actions={<Button label="Clear filters" href="/ideas" />}
                />
              ) : (
                <EmptyState
                  title="No ideas yet"
                  description="Ideas shared with the community will show up here."
                />
              )
            ) : (
              <VStack gap={8}>
                {featured.length > 0 ? (
                  <VStack gap={4}>
                    <VStack gap={1}>
                      <Heading level={2}>Featured</Heading>
                      <Text type="supporting">
                        Ideas we think deserve a closer look.
                      </Text>
                    </VStack>
                    <Grid columns={{ minWidth: 300, max: 3 }} gap={4}>
                      {featured.map((idea) => (
                        <IdeaCard key={idea.id} idea={idea} />
                      ))}
                    </Grid>
                  </VStack>
                ) : null}

                {featured.length > 0 && rest.length > 0 ? <Divider /> : null}

                {rest.length > 0 ? (
                  <VStack gap={4}>
                    <Heading level={2}>
                      {featured.length > 0 ? "More ideas" : "All ideas"}
                    </Heading>
                    <Grid columns={{ minWidth: 300, max: 3 }} gap={4}>
                      {rest.map((idea) => (
                        <IdeaCard key={idea.id} idea={idea} />
                      ))}
                    </Grid>
                  </VStack>
                ) : null}
              </VStack>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
