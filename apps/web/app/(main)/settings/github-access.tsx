"use client";

import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import type { GithubAccountAccess } from "@/lib/github/repos";

export function GithubAccess({
  access,
  installHref,
}: {
  access: GithubAccountAccess;
  installHref: string;
}) {
  return (
    <>
      <VStack gap={3}>
        <Heading level={3}>Accounts and organizations</Heading>
        {access.installations.length === 0 ? (
          <EmptyState
            title="WeStride cannot reach any repositories yet"
            description="Install WeStride on your account or an organization, and choose which repositories it can use."
            actions={
              <Button label="Choose repositories" variant="primary" href={installHref} />
            }
          />
        ) : (
          <>
            <List hasDividers edge="flush">
              {access.installations.map((installation) => (
                <ListItem
                  key={installation.id}
                  label={installation.accountLogin}
                  description={
                    installation.repositorySelection === "all"
                      ? "All repositories"
                      : "Only the repositories you selected"
                  }
                  startContent={
                    <Avatar
                      name={installation.accountLogin}
                      src={installation.avatarUrl ?? undefined}
                      size="sm"
                      tooltip={false}
                    />
                  }
                  endContent={
                    <Button
                      label="Choose repositories"
                      size="sm"
                      href={installation.manageUrl}
                      target="_blank"
                      icon={<Icon icon={ArrowTopRightOnSquareIcon} />}
                    />
                  }
                />
              ))}
            </List>
            <HStack>
              <Button label="Add an account or organization" href={installHref} />
            </HStack>
          </>
        )}
      </VStack>

      {access.installations.length > 0 ? (
        <VStack gap={3}>
          <Heading level={3}>Repositories WeStride can reach</Heading>
          {access.repos.length === 0 ? (
            <Text type="supporting">
              {access.installations.some(
                (installation) => installation.repositorySelection === "selected",
              )
                ? "No repositories are selected. Choose some on GitHub."
                : "These accounts do not have any repositories yet."}
            </Text>
          ) : (
            <List hasDividers edge="flush" density="compact">
              {access.repos.map((repo) => (
                <ListItem
                  key={repo.id}
                  label={repo.fullName}
                  description={repo.description ?? undefined}
                  href={repo.htmlUrl}
                  target="_blank"
                  endContent={
                    <Text type="supporting">
                      {repo.isPrivate ? "Private" : "Public"}
                    </Text>
                  }
                />
              ))}
            </List>
          )}
          {access.unlistedRepoCount > 0 ? (
            <Text type="supporting">
              {`And ${access.unlistedRepoCount} more not shown here.`}
            </Text>
          ) : null}
        </VStack>
      ) : null}
    </>
  );
}
