import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { listProjects } from "@westride/db/build";
import { listIdeasForMember } from "@westride/db/ideas";
import { CreateProjectButton, CreateProjectProvider } from "./create-project-button";
import { ProjectCard } from "./project-card";

export const metadata: Metadata = {
  title: "Build Studio",
};

export default async function BuildStudioPage() {
  const { userId } = await auth();
  const [projects, ideas, account] = await Promise.all([
    listProjects({ clerkUserId: userId }),
    userId ? listIdeasForMember(userId) : Promise.resolve([]),
    userId ? currentUser() : Promise.resolve(null),
  ]);
  const creator = userId
    ? {
        name: account?.fullName || account?.username || "You",
        imageUrl: account?.hasImage ? account.imageUrl : null,
      }
    : null;

  const mine = userId
    ? projects.filter((project) =>
        project.members.some((member) => member.clerkUserId === userId),
      )
    : [];
  const others = projects.filter((project) => !mine.includes(project));
  const countLabel =
    projects.length === 1 ? "1 project" : `${projects.length} projects`;

  return (
    <CreateProjectProvider
      creator={creator}
      ideaOptions={ideas.map((idea) => ({ id: idea.id, name: idea.name }))}
    >
      <Layout
        contentWidth={1120}
        header={
          <LayoutHeader hasDivider>
            <HStack gap={4} vAlign="center" wrap="wrap">
              <StackItem size="fill">
                <VStack gap={1}>
                  <Heading level={1}>Build Studio</Heading>
                  <Text type="supporting">
                    Turn an idea into working software. Plan the tickets, link
                    the code, and track the build.
                  </Text>
                </VStack>
              </StackItem>
              <HStack gap={3} vAlign="center">
                {projects.length > 0 ? (
                  <Text type="supporting">{countLabel}</Text>
                ) : null}
                <CreateProjectButton />
              </HStack>
            </HStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            {projects.length === 0 ? (
              <EmptyState
                title="No projects yet"
                description="Start one from scratch, or from an idea you are already working on in the Idea Studio."
                actions={<CreateProjectButton variant="secondary" />}
              />
            ) : (
              <VStack gap={8}>
                {mine.length > 0 ? (
                  <VStack gap={4}>
                    <Heading level={2}>Your projects</Heading>
                    <Grid columns={{ minWidth: 300, max: 3 }} gap={4}>
                      {mine.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                      ))}
                    </Grid>
                  </VStack>
                ) : null}

                {mine.length > 0 && others.length > 0 ? <Divider /> : null}

                {others.length > 0 ? (
                  <VStack gap={4}>
                    <Heading level={2}>
                      {mine.length > 0 ? "Other projects" : "All projects"}
                    </Heading>
                    <Grid columns={{ minWidth: 300, max: 3 }} gap={4}>
                      {others.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                      ))}
                    </Grid>
                  </VStack>
                ) : null}
              </VStack>
            )}
          </LayoutContent>
        }
      />
    </CreateProjectProvider>
  );
}
