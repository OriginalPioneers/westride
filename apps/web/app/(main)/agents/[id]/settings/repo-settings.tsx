"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ArrowTopRightOnSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { updateAgentRepoAction } from "../../actions";

const CONNECT_GITHUB_HREF = "/integrations/github/connect?returnTo=/settings";

export type LinkedRepo = {
  owner: string;
  name: string;
  htmlUrl: string;
  defaultBranch: string;
  isPrivate: boolean;
};

export function AgentRepoSettings({
  agentId,
  repo,
  canConnectGithub,
  canRunCode,
}: {
  agentId: string;
  repo: LinkedRepo | null;
  /** Whether the WeStride GitHub App is configured on this deployment. */
  canConnectGithub: boolean;
  /** Whether this server can run Muse Code sandboxes. */
  canRunCode: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isWorking, startWorking] = useTransition();

  function save(githubRepoUrl: string) {
    setError(null);
    startWorking(async () => {
      const result = await updateAgentRepoAction(agentId, { githubRepoUrl });
      if (result.status === "error") {
        setError(result.fieldErrors.githubRepoUrl ?? result.message);
        return;
      }
      setUrl("");
      router.refresh();
    });
  }

  return (
    <VStack gap={4}>
      <Text type="supporting">
        With a repository, jobs run as Muse Code in a sandbox and end in a pull request. Without one, jobs are
        written reports.
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
      {!canRunCode ? (
        <Banner
          status="info"
          title="Code jobs are not set up on this server"
          description="A linked repository is saved, but jobs run as reports until Muse Code sandboxes are configured. See docs/agent-studio.md."
        />
      ) : null}
      {error ? <Banner status="error" title={error} /> : null}
      {repo ? (
        <List>
          <ListItem
            label={`${repo.owner}/${repo.name}`}
            description={[repo.isPrivate ? "Private on GitHub" : "Public", `default branch ${repo.defaultBranch}`].join(" · ")}
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
                <Button
                  label="Unlink"
                  variant="ghost"
                  size="sm"
                  icon={<Icon icon={TrashIcon} />}
                  isDisabled={isWorking}
                  onClick={() => save("")}
                />
              </HStack>
            }
          />
        </List>
      ) : null}
      <HStack gap={2} vAlign="end" wrap="wrap">
        <StackItem size="fill">
          <TextInput
            label={repo ? "Replace with another repository" : "GitHub repository"}
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
                save(url);
              }
            }}
          />
        </StackItem>
        <Button
          label={repo ? "Replace repository" : "Link repository"}
          variant="secondary"
          isLoading={isWorking}
          isDisabled={!url.trim()}
          onClick={() => save(url)}
        />
      </HStack>
    </VStack>
  );
}
