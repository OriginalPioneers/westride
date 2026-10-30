"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ArrowTopRightOnSquareIcon, StarIcon, TrashIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import type { ProjectRepo } from "@westride/db";
import {
  linkRepoToProject,
  setProjectPrimaryRepo,
  unlinkRepoFromProject,
} from "../../actions";

const CONNECT_GITHUB_HREF = "/integrations/github/connect?returnTo=/settings";

export function RepoSettings({
  projectId,
  repos,
  canConnectGithub,
}: {
  projectId: string;
  repos: ProjectRepo[];
  /** Whether the WeStride GitHub App is configured on this deployment. */
  canConnectGithub: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isWorking, startWorking] = useTransition();

  function run(task: () => Promise<{ status: "ok" } | { status: "error"; message: string }>) {
    setError(null);
    startWorking(async () => {
      const result = await task();
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setUrl("");
      router.refresh();
    });
  }

  return (
    <VStack gap={4}>
      <Text type="supporting">
        Link every repository the project is built in. The primary one is
        where Muse Code agents work unless a ticket picks another.
        {canConnectGithub ? (
          <>
            {" "}
            Private repositories need your{" "}
            <Link href={CONNECT_GITHUB_HREF} isExternalLink>
              GitHub connection
            </Link>
            .
          </>
        ) : null}
      </Text>
      {error ? <Banner status="error" title={error} /> : null}
      <HStack gap={2} vAlign="end" wrap="wrap">
        <StackItem size="fill">
          <TextInput
            label="GitHub repository"
            isLabelHidden
            value={url}
            onChange={(value) => {
              setUrl(value);
              setError(null);
            }}
            placeholder="https://github.com/owner/repo"
            isDisabled={isWorking}
            onKeyDown={(event) => {
              if (event.key === "Enter" && url.trim()) {
                event.preventDefault();
                run(() => linkRepoToProject(projectId, url));
              }
            }}
          />
        </StackItem>
        <Button
          label="Link repository"
          variant="secondary"
          isLoading={isWorking}
          isDisabled={!url.trim()}
          onClick={() => run(() => linkRepoToProject(projectId, url))}
        />
      </HStack>
      {repos.length > 0 ? (
        <List>
          {repos.map((repo) => (
            <ListItem
              key={repo.id}
              label={`${repo.owner}/${repo.name}`}
              description={[
                repo.isPrimary ? "Primary" : null,
                repo.isPrivate ? "Private on GitHub" : "Public",
                `default branch ${repo.defaultBranch}`,
              ]
                .filter(Boolean)
                .join(" · ")}
              endContent={
                <HStack gap={1} vAlign="center">
                  <Button
                    label="Open"
                    variant="ghost"
                    size="sm"
                    href={repo.htmlUrl}
                    target="_blank"
                    icon={<Icon icon={ArrowTopRightOnSquareIcon} />}
                  />
                  <IconButton
                    label={repo.isPrimary ? "Primary repository" : "Make primary"}
                    tooltip={repo.isPrimary ? "Primary repository" : "Make primary"}
                    icon={<Icon icon={repo.isPrimary ? StarIconSolid : StarIcon} />}
                    variant="ghost"
                    isDisabled={repo.isPrimary || isWorking}
                    onClick={() => run(() => setProjectPrimaryRepo(projectId, repo.id))}
                  />
                  <IconButton
                    label={`Unlink ${repo.owner}/${repo.name}`}
                    tooltip="Unlink"
                    icon={<Icon icon={TrashIcon} />}
                    variant="ghost"
                    isDisabled={isWorking}
                    onClick={() => run(() => unlinkRepoFromProject(projectId, repo.id))}
                  />
                </HStack>
              }
            />
          ))}
        </List>
      ) : (
        <Text type="supporting">No repositories linked yet.</Text>
      )}
    </VStack>
  );
}
