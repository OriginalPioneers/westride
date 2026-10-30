import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { projectPath } from "@/lib/build/labels";
import { isGithubAppConfigured } from "@/lib/github/config";
import { resolveMemberProfiles } from "@/lib/ideas/members";
import { loadProjectPage } from "../load-project";
import { ProjectHeader } from "../project-header";
import { MilestoneSettings } from "./milestone-settings";
import { ProjectDetailsForm } from "./project-details-form";
import { RepoSettings } from "./repo-settings";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const context = await loadProjectPage((await params).id);
  return { title: context ? `Settings · ${context.project.name}` : "Project settings" };
}

export default async function ProjectSettingsPage({ params }: { params: Params }) {
  const { id } = await params;
  const context = await loadProjectPage(id);
  if (!context) {
    notFound();
  }
  if (!context.isMember || !context.userId) {
    redirect(projectPath(id));
  }
  const { project, userId } = context;
  const profiles = await resolveMemberProfiles(
    project.members.map((member) => member.clerkUserId),
  );

  return (
    <Layout
      contentWidth={880}
      header={
        <LayoutHeader hasDivider>
          <ProjectHeader context={context} section="settings" />
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={10}>
            <VStack gap={4}>
              <Heading level={2}>Repositories</Heading>
              <RepoSettings
                projectId={project.id}
                repos={project.repos}
                canConnectGithub={isGithubAppConfigured()}
              />
            </VStack>

            <Divider />

            <VStack gap={4}>
              <Heading level={2}>Milestones</Heading>
              <MilestoneSettings projectId={project.id} milestones={project.milestones} />
            </VStack>

            <Divider />

            <VStack gap={4}>
              <Heading level={2}>Project</Heading>
              {context.isOwner ? (
                <ProjectDetailsForm
                  viewerId={userId}
                  project={{
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    isPublic: project.isPublic,
                    status: project.status,
                    members: project.members.map((member) => {
                      const profile = profiles.get(member.clerkUserId);
                      return {
                        clerkUserId: member.clerkUserId,
                        role: member.role,
                        name: profile?.name ?? "WeStride member",
                        imageUrl: profile?.imageUrl ?? null,
                      };
                    }),
                  }}
                />
              ) : (
                <Text type="supporting">
                  Only owners can change the project&apos;s name, description,
                  visibility, and team. Ask an owner if something needs to change.
                </Text>
              )}
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
