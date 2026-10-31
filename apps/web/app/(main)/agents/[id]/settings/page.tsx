import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/Stack";
import { listAgentLinkOptions } from "@westride/db/agents";
import { getCronSecret } from "@/lib/agents/config";
import { agentPath } from "@/lib/agents/labels";
import { isGithubAppConfigured } from "@/lib/github/config";
import { AgentHeader } from "../agent-header";
import { loadAgentPage } from "../load-agent";
import { AgentDetailsForm } from "./agent-details-form";
import { AgentRepoSettings } from "./repo-settings";
import { AgentScheduleForm } from "./schedule-form";
import { AgentStatusControls } from "./status-controls";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const context = await loadAgentPage((await params).id);
  return { title: context ? `Settings · ${context.agent.name}` : "Agent settings" };
}

export default async function AgentSettingsPage({ params }: { params: Params }) {
  const { id } = await params;
  const context = await loadAgentPage(id);
  if (!context) {
    notFound();
  }
  if (!context.isOwner || !context.userId) {
    redirect(agentPath(id));
  }
  const { agent, userId } = context;
  const links = await listAgentLinkOptions(userId);

  return (
    <Layout
      contentWidth={880}
      header={
        <LayoutHeader hasDivider>
          <AgentHeader context={context} section="settings" />
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={10}>
            <VStack gap={4}>
              <Heading level={2}>Schedule</Heading>
              <AgentScheduleForm
                agentId={agent.id}
                initial={{
                  schedule: agent.schedule,
                  scheduleHourUtc: agent.scheduleHourUtc,
                  scheduleWeekday: agent.scheduleWeekday,
                  standingTask: agent.standingTask,
                }}
                isActive={agent.status === "ACTIVE"}
                ownerHasMetaConnection={context.hasMetaConnection}
                cronConfigured={getCronSecret() !== null}
              />
            </VStack>

            <Divider />

            <VStack gap={4}>
              <Heading level={2}>Repository</Heading>
              <AgentRepoSettings
                agentId={agent.id}
                repo={
                  agent.repoOwner && agent.repoName && agent.repoHtmlUrl
                    ? {
                        owner: agent.repoOwner,
                        name: agent.repoName,
                        htmlUrl: agent.repoHtmlUrl,
                        defaultBranch: agent.repoDefaultBranch ?? "main",
                        isPrivate: agent.repoIsPrivate ?? false,
                      }
                    : null
                }
                canConnectGithub={isGithubAppConfigured()}
                canRunCode={context.runsCode || !agent.repoOwner}
              />
            </VStack>

            <Divider />

            <VStack gap={4}>
              <Heading level={2}>Agent</Heading>
              <AgentDetailsForm
                agentId={agent.id}
                initial={{
                  name: agent.name,
                  description: agent.description,
                  instructions: agent.instructions,
                  isPublic: agent.isPublic,
                  ideaId: agent.ideaId,
                  projectId: agent.projectId,
                  model: agent.model,
                  maxSteps: agent.maxSteps,
                }}
                ideas={links.ideas}
                projects={links.projects}
              />
            </VStack>

            <Divider />

            <VStack gap={4}>
              <Heading level={2}>Status</Heading>
              <AgentStatusControls
                agentId={agent.id}
                agentName={agent.name}
                status={agent.status}
                activeJobs={agent.activeJobs}
              />
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
