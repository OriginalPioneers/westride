import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import {
  getMentorProfileForUser,
  listMentorFilterOptions,
  listMentors,
} from "@westride/db/mentorship";
import { languageName } from "@/lib/mentorship/languages";
import {
  buildLocationFilterOptions,
  decodeLocationFilter,
} from "@/lib/mentorship/locations";
import { MentorCard } from "./mentor-card";
import { MentorFilters } from "./mentor-filters";

export const metadata: Metadata = {
  title: "Find a Mentor",
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(params: SearchParams, key: string): string {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function FindMentorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [{ userId }, params] = await Promise.all([auth(), searchParams]);
  const values = {
    skill: firstParam(params, "skill"),
    location: firstParam(params, "location"),
    language: firstParam(params, "language"),
  };

  const [mentors, options, ownProfile] = await Promise.all([
    listMentors({
      skillSlug: values.skill || undefined,
      languageCode: values.language || undefined,
      location: decodeLocationFilter(values.location),
    }),
    listMentorFilterOptions(),
    userId ? getMentorProfileForUser(userId) : Promise.resolve(null),
  ]);

  const hasFilters = Boolean(values.skill || values.location || values.language);
  const countLabel =
    mentors.length === 1 ? "1 mentor" : `${mentors.length} mentors`;

  return (
    <Layout
      contentWidth={1120}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <VStack gap={1}>
                <Heading level={1}>Find a Mentor</Heading>
                <Text type="supporting">
                  Free mentorship from people who have done it before.
                </Text>
              </VStack>
            </StackItem>
            <Button
              label={ownProfile ? "Edit your mentor profile" : "Become a Mentor"}
              href="/mentorship/become"
            />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={6}>
            <MentorFilters
              values={values}
              skillOptions={options.skills.map((skill) => ({
                value: skill.slug,
                label: skill.name,
              }))}
              languageOptions={options.languageCodes
                .map((code) => ({ value: code, label: languageName(code) }))
                .sort((a, b) => a.label.localeCompare(b.label, "en"))}
              locationOptions={buildLocationFilterOptions(options.locations)}
              hasGlobal={options.hasGlobal}
            />
            {mentors.length === 0 ? (
              hasFilters ? (
                <EmptyState
                  title="No mentors match these filters"
                  description="Try a different skill, location, or language."
                  actions={
                    <Button label="Clear filters" href="/mentorship/mentors" />
                  }
                />
              ) : (
                <EmptyState
                  title="No mentors yet"
                  description="Be the first to offer your experience to the community."
                  actions={
                    <Button
                      label="Become a Mentor"
                      variant="primary"
                      href="/mentorship/become"
                    />
                  }
                />
              )
            ) : (
              <VStack gap={3}>
                <Text type="supporting">{countLabel}</Text>
                <Grid columns={{ minWidth: 300, max: 3 }} gap={4}>
                  {mentors.map((mentor) => (
                    <MentorCard key={mentor.id} mentor={mentor} />
                  ))}
                </Grid>
              </VStack>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
