import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { projectKeyPrefix } from "@westride/db/build-rules";
import { readProjectActivity, type RepoActivity } from "@/lib/build/activity";
import { projectSettingsPath, ticketPath } from "@/lib/build/labels";
import { loadProjectPage } from "../load-project";
import { ProjectHeader } from "../project-header";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const context = await loadProjectPage((await params).id);
  return { title: context ? `Activity · ${context.project.name}` : "Activity" };
}

export default async function ActivityPage({ params }: { params: Params }) {
  const { id } = await params;
  const context = await loadProjectPage(id);
  if (!context) {
    notFound();
  }
  const { project } = context;
  const prefix = projectKeyPrefix(project.name);
  const activity = await readProjectActivity(project.repos, context.userId, prefix);

  return (
    <Layout
      contentWidth={1100}
      header={
        <LayoutHeader hasDivider>
          <ProjectHeader context={context} section="activity" />
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          {project.repos.length === 0 ? (
            <EmptyState
              title="No repositories linked"
              description="Link a GitHub repository to see its commits, pull requests, branches, and deployments here."
              actions={
                context.isMember ? (
                  <Link href={projectSettingsPath(project.id)} isStandalone>
                    Open settings
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <VStack gap={10}>
              {activity.map((entry) => (
                <RepoActivitySection
                  key={entry.repo.id}
                  entry={entry}
                  projectId={project.id}
                  prefix={prefix}
                />
              ))}
            </VStack>
          )}
        </LayoutContent>
      }
    />
  );
}

function TicketLinks({
  numbers,
  projectId,
  prefix,
}: {
  numbers: number[];
  projectId: string;
  prefix: string;
}) {
  if (numbers.length === 0) {
    return null;
  }
  return (
    <HStack gap={1} wrap="wrap">
      {numbers.map((number) => (
        <Link key={number} href={ticketPath(projectId, number)}>
          {`${prefix}-${number}`}
        </Link>
      ))}
    </HStack>
  );
}

const PR_VARIANT = { open: "green", merged: "purple", closed: "neutral" } as const;
const PR_LABEL = { open: "Open", merged: "Merged", closed: "Closed" } as const;

function deploymentVariant(state: string | null) {
  switch (state) {
    case "success":
      return "green" as const;
    case "failure":
    case "error":
      return "error" as const;
    case "in_progress":
    case "pending":
    case "queued":
      return "blue" as const;
    default:
      return "neutral" as const;
  }
}

function RepoActivitySection({
  entry,
  projectId,
  prefix,
}: {
  entry: RepoActivity;
  projectId: string;
  prefix: string;
}) {
  const { repo } = entry;
  const openPulls = entry.pullRequests.filter((pull) => pull.state === "open");
  const closedPulls = entry.pullRequests.filter((pull) => pull.state !== "open");
  return (
    <VStack gap={6}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Heading level={2}>
              <Link href={repo.htmlUrl} isExternalLink>
                {`${repo.owner}/${repo.name}`}
              </Link>
            </Heading>
            {repo.isPrimary ? <Badge variant="blue" label="Primary" /> : null}
          </HStack>
        </StackItem>
        <Text type="supporting">default branch {repo.defaultBranch}</Text>
      </HStack>

      {entry.status !== "ok" ? (
        <Banner
          status={entry.status === "error" ? "error" : "info"}
          title={entry.status === "error" ? "GitHub is unavailable" : "Not visible yet"}
          description={entry.note ?? undefined}
        />
      ) : (
        <VStack gap={8}>
          <VStack gap={3}>
            <Heading level={3}>Pull requests</Heading>
            {entry.pullRequests.length === 0 ? (
              <Text type="supporting">No pull requests yet.</Text>
            ) : (
              <List density="compact">
                {[...openPulls, ...closedPulls].map((pull) => (
                  <ListItem
                    key={pull.number}
                    href={pull.htmlUrl}
                    target="_blank"
                    startContent={
                      <Avatar
                        src={pull.authorAvatarUrl ?? undefined}
                        name={pull.authorLogin ?? "GitHub"}
                        size="sm"
                        tooltip={false}
                      />
                    }
                    label={`#${pull.number} ${pull.title}`}
                    description={
                      <HStack gap={2} vAlign="center" wrap="wrap">
                        <Text type="supporting">
                          {pull.headBranch} → {pull.baseBranch}
                          {pull.authorLogin ? ` · ${pull.authorLogin}` : ""} ·{" "}
                          <Timestamp value={pull.mergedAt ?? pull.updatedAt} format="relative" />
                        </Text>
                        <TicketLinks numbers={pull.ticketNumbers} projectId={projectId} prefix={prefix} />
                      </HStack>
                    }
                    endContent={
                      <Badge
                        variant={PR_VARIANT[pull.state]}
                        label={pull.isDraft && pull.state === "open" ? "Draft" : PR_LABEL[pull.state]}
                      />
                    }
                  />
                ))}
              </List>
            )}
          </VStack>

          <VStack gap={3}>
            <Heading level={3}>Recent commits</Heading>
            {entry.commits.length === 0 ? (
              <Text type="supporting">No commits yet.</Text>
            ) : (
              <List density="compact">
                {entry.commits.map((commit) => (
                  <ListItem
                    key={commit.sha}
                    href={commit.htmlUrl}
                    target="_blank"
                    startContent={
                      <Avatar
                        src={commit.authorAvatarUrl ?? undefined}
                        name={commit.authorName}
                        size="sm"
                        tooltip={false}
                      />
                    }
                    label={commit.message || "(no message)"}
                    description={`${commit.authorLogin ?? commit.authorName} · ${commit.shortSha}`}
                    endContent={
                      <Text type="supporting">
                        <Timestamp value={commit.committedAt} format="relative" />
                      </Text>
                    }
                  />
                ))}
              </List>
            )}
          </VStack>

          <VStack gap={3}>
            <Heading level={3}>Branches</Heading>
            {entry.branches.length === 0 ? (
              <Text type="supporting">No branches.</Text>
            ) : (
              <List density="compact">
                {entry.branches.map((branch) => (
                  <ListItem
                    key={branch.name}
                    href={`${repo.htmlUrl}/tree/${branch.name}`}
                    target="_blank"
                    label={branch.name}
                    description={
                      <HStack gap={2} vAlign="center" wrap="wrap">
                        <Text type="supporting">{branch.sha.slice(0, 7)}</Text>
                        <TicketLinks numbers={branch.ticketNumbers} projectId={projectId} prefix={prefix} />
                      </HStack>
                    }
                    endContent={
                      branch.isDefault ? (
                        <Badge variant="blue" label="Default" />
                      ) : branch.isProtected ? (
                        <Badge variant="neutral" label="Protected" />
                      ) : undefined
                    }
                  />
                ))}
              </List>
            )}
          </VStack>

          <VStack gap={3}>
            <Heading level={3}>Deployments</Heading>
            {entry.deployments.length === 0 ? (
              <Text type="supporting">
                No deployments reported to GitHub. Platforms like Vercel post them when the
                GitHub integration is on.
              </Text>
            ) : (
              <List density="compact">
                {entry.deployments.map((deployment) => (
                  <ListItem
                    key={deployment.id}
                    href={deployment.targetUrl ?? `${repo.htmlUrl}/deployments`}
                    target="_blank"
                    label={deployment.environment}
                    description={`${deployment.ref} · ${deployment.sha}${deployment.creatorLogin ? ` · ${deployment.creatorLogin}` : ""}`}
                    endContent={
                      <HStack gap={2} vAlign="center">
                        <Badge
                          variant={deploymentVariant(deployment.state)}
                          label={deployment.state ?? "Unknown"}
                        />
                        <Text type="supporting">
                          <Timestamp value={deployment.createdAt} format="relative" />
                        </Text>
                      </HStack>
                    }
                  />
                ))}
              </List>
            )}
          </VStack>
        </VStack>
      )}
    </VStack>
  );
}
