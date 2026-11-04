import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import {
  listProjects,
  listProjectStatusOptions,
  type ProjectWithDetails,
} from "@westride/db/build";
import { listIdeasForMember } from "@westride/db/ideas";
import { signInPath } from "@/lib/auth-paths";
import {
  PROJECT_VIEW_LABELS,
  projectsPath,
  resolveProjectCollection,
  toProjectFilters,
  type ProjectCollection,
} from "@/lib/build/filters";
import { PROJECT_STATUS_LABELS } from "@/lib/build/labels";
import {
  readCollectionFilterValues,
  type CollectionFilterValues,
} from "@/lib/collections/filters";
import {
  CreateProjectButton,
  CreateProjectCard,
  CreateProjectProvider,
} from "./create-project-button";
import { ProjectCard } from "./project-card";
import { ProjectCollectionTabs, ProjectSearchBar } from "./project-filters";

export const metadata: Metadata = {
  title: "Project Factory",
};

type SearchParams = Record<string, string | string[] | undefined>;

const VIEW_DESCRIPTIONS = {
  mine: "Projects you own or build on, including private ones.",
  all: "Every project you can see: turn an idea into working software.",
} as const;

const STATUS_DESCRIPTIONS = {
  PLANNING: "Projects still shaping their tickets and milestones.",
  BUILDING: "Projects with code landing right now.",
  LAUNCHED: "Projects that have shipped to real users.",
  PAUSED: "Projects on hold until their team picks them back up.",
} as const;

function collectionHeading(collection: ProjectCollection): {
  title: string;
  description: string;
} {
  switch (collection.kind) {
    case "search":
      return {
        title: `Results for “${collection.query}”`,
        description: "Every project you can see that matches.",
      };
    case "status":
      return {
        title: PROJECT_STATUS_LABELS[collection.status],
        description: STATUS_DESCRIPTIONS[collection.status],
      };
    case "view":
      return {
        title: PROJECT_VIEW_LABELS[collection.view],
        description: VIEW_DESCRIPTIONS[collection.view],
      };
  }
}

function signInHref(values: CollectionFilterValues): string {
  return `${signInPath}?redirect_url=${encodeURIComponent(projectsPath(values))}`;
}

function CollectionEmptyState({
  collection,
  values,
  isSignedIn,
}: {
  collection: ProjectCollection;
  values: CollectionFilterValues;
  isSignedIn: boolean;
}) {
  if (collection.kind === "search") {
    return (
      <EmptyState
        title="No projects match"
        description="Try another word, or browse a collection below the search bar."
        actions={<Button label="Clear search" href={projectsPath({ ...values, q: "" })} />}
      />
    );
  }
  if (collection.kind === "status") {
    return (
      <EmptyState
        title={`No ${PROJECT_STATUS_LABELS[collection.status].toLowerCase()} projects`}
        description="Pick another status, or start a project of your own."
        actions={<CreateProjectButton variant="secondary" />}
      />
    );
  }
  if (collection.view === "mine" && !isSignedIn) {
    return (
      <EmptyState
        title="Sign in to see your projects"
        description="Your own projects, including private ones, show up here once you are signed in."
        actions={<Button label="Sign in" href={signInHref(values)} />}
      />
    );
  }
  return (
    <EmptyState
      title="No projects yet"
      description="Start one from scratch, or from an idea you are already working on in the Idea Workshop."
      actions={<CreateProjectButton variant="secondary" />}
    />
  );
}

function ProjectGrid({
  projects,
  hasCreateTile,
}: {
  projects: ProjectWithDetails[];
  /** Leads the grid with the "New project" tile. */
  hasCreateTile: boolean;
}) {
  return (
    <Grid columns={{ minWidth: 320, max: 3 }} gap={4}>
      {hasCreateTile ? <CreateProjectCard /> : null}
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </Grid>
  );
}

export default async function ProjectFactoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [{ userId }, params] = await Promise.all([auth(), searchParams]);
  const viewer = { clerkUserId: userId };
  const isSignedIn = userId !== null;
  const values = readCollectionFilterValues(params);
  const collection = resolveProjectCollection(values, isSignedIn);

  const [projects, statuses, ideas, account] = await Promise.all([
    listProjects(viewer, toProjectFilters(values, isSignedIn)),
    listProjectStatusOptions(viewer),
    userId ? listIdeasForMember(userId) : Promise.resolve([]),
    userId ? currentUser() : Promise.resolve(null),
  ]);
  const creator = userId
    ? {
        name: account?.fullName || account?.username || "You",
        imageUrl: account?.hasImage ? account.imageUrl : null,
      }
    : null;

  const heading = collectionHeading(collection);
  const countLabel = projects.length === 1 ? "1 project" : `${projects.length} projects`;
  // Your Projects always leads with the "New project" tile, so a signed-in
  // member with no projects yet sees the tile rather than an empty state.
  const hasCreateTile =
    isSignedIn && collection.kind === "view" && collection.view === "mine";

  return (
    <CreateProjectProvider
      creator={creator}
      ideaOptions={ideas.map((idea) => ({ id: idea.id, name: idea.name }))}
    >
      <Layout
        contentWidth={1120}
        header={
          <LayoutHeader hasDivider>
            <VStack gap={4}>
              <ProjectSearchBar values={values} />
              <ProjectCollectionTabs
                values={values}
                isSignedIn={isSignedIn}
                statuses={statuses}
              />
            </VStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <HStack gap={3} vAlign="end" wrap="wrap">
                <StackItem size="fill">
                  <VStack gap={1}>
                    {/* The collection is the page's heading; there is no title block. */}
                    <Heading level={2} accessibilityLevel={1}>
                      {heading.title}
                    </Heading>
                    <Text type="supporting">{heading.description}</Text>
                  </VStack>
                </StackItem>
                {projects.length > 0 ? <Text type="supporting">{countLabel}</Text> : null}
              </HStack>

              {projects.length === 0 && !hasCreateTile ? (
                <CollectionEmptyState
                  collection={collection}
                  values={values}
                  isSignedIn={isSignedIn}
                />
              ) : (
                <ProjectGrid projects={projects} hasCreateTile={hasCreateTile} />
              )}
            </VStack>
          </LayoutContent>
        }
      />
    </CreateProjectProvider>
  );
}
