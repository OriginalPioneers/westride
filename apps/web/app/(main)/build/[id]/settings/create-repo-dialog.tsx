"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { projectSettingsPath } from "@/lib/build/labels";
import {
  createProjectRepoSchema,
  fieldErrorsFrom,
  type FieldErrors,
} from "@/lib/build/schema";
import { suggestGithubRepoName } from "@/lib/github/repo-ref";
import {
  createRepoForProjectAction,
  loadGithubRepoOwners,
  type GithubRepoOwnersResult,
} from "../../actions";

const OWNER_FIELD = "newGithubRepo.owner";
const NAME_FIELD = "newGithubRepo.name";

function fieldStatus(message: string | undefined) {
  return message ? { type: "error" as const, message } : undefined;
}

export function CreateRepoDialog({
  projectId,
  projectName,
  hasRepos,
  isOpen,
  onOpenChange,
}: {
  projectId: string;
  projectName: string;
  /** Whether the project already links a repository, so primary is a choice. */
  hasRepos: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [repoOwners, setRepoOwners] = useState<GithubRepoOwnersResult | null>(null);
  const [owner, setOwner] = useState("");
  const [name, setName] = useState(() => suggestGithubRepoName(projectName));
  const [isPrivate, setIsPrivate] = useState(true);
  const [makePrimary, setMakePrimary] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    loadGithubRepoOwners()
      .then((result) => {
        if (!isCurrent) {
          return;
        }
        setRepoOwners(result);
        if (result.status === "ok") {
          setOwner((current) => current || (result.owners[0]?.login ?? ""));
        }
      })
      .catch((error: unknown) => {
        console.error("GitHub owner lookup failed", error);
        if (isCurrent) {
          setMessage("Your GitHub accounts could not be loaded. Try again.");
        }
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const owners = repoOwners?.status === "ok" ? repoOwners.owners : [];
  const returnTo = encodeURIComponent(projectSettingsPath(projectId));
  const connectHref = `/integrations/github/connect?returnTo=${returnTo}`;
  const installHref = `/integrations/github/connect?intent=install&returnTo=${returnTo}`;

  function handleOpenChange(next: boolean) {
    if (!next && isSaving) {
      return;
    }
    onOpenChange(next);
  }

  function clearField(key: string) {
    setErrors((current) => {
      if (!(key in current)) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
    setMessage(null);
  }

  function save() {
    const draft = {
      newGithubRepo: { owner, name, isPrivate },
      makePrimary: hasRepos && makePrimary,
    };
    const parsed = createProjectRepoSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      setMessage("Fix the highlighted fields.");
      return;
    }
    startSaving(async () => {
      try {
        const result = await createRepoForProjectAction(projectId, draft);
        if (result.status === "error") {
          setErrors(result.fieldErrors);
          setMessage(result.message);
          return;
        }
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        console.error("Project repo create failed", error);
        setMessage("The repository could not be created. Try again.");
      }
    });
  }

  let body: ReactNode;
  if (repoOwners === null) {
    body = message ? null : <Text type="supporting">Loading your GitHub accounts…</Text>;
  } else if (repoOwners.status === "needs-connection") {
    body = (
      <Text type="supporting">
        <Link href={connectHref}>Connect GitHub</Link> to create a repository
        from here.
      </Text>
    );
  } else if (repoOwners.status === "unavailable") {
    body = (
      <Text type="supporting">
        GitHub is not set up on WeStride, so repositories cannot be created here.
      </Text>
    );
  } else if (repoOwners.status === "error") {
    body = null;
  } else if (owners.length === 0) {
    body = (
      <Text type="supporting">
        To create a repository from here,{" "}
        <Link href={installHref}>
          install WeStride on your GitHub account or an organization
        </Link>
        .
      </Text>
    );
  } else {
    body = (
      <FormLayout defaultOptionality="required">
        <Selector
          label="Owner"
          options={owners.map((candidate) => ({
            value: candidate.login,
            label: candidate.login,
            description: candidate.isOrganization ? "Organization" : "Your account",
          }))}
          value={owner || undefined}
          placeholder="Choose an account"
          onChange={(value) => {
            setOwner(value);
            clearField(OWNER_FIELD);
          }}
          hasSearch={owners.length > 8}
          isRequired
          isDisabled={isSaving}
          status={fieldStatus(errors[OWNER_FIELD])}
        />
        <TextInput
          label="Repository name"
          value={name}
          onChange={(value) => {
            setName(value);
            clearField(NAME_FIELD);
          }}
          placeholder="tool-library-app"
          description={
            owner && name
              ? `github.com/${owner}/${name}`
              : "Letters, numbers, dots, dashes, or underscores."
          }
          isRequired
          isDisabled={isSaving}
          status={fieldStatus(errors[NAME_FIELD])}
        />
        <SegmentedControl
          label="Visibility on GitHub"
          value={isPrivate ? "private" : "public"}
          onChange={(value) => setIsPrivate(value === "private")}
        >
          <SegmentedControlItem value="private" label="Private" />
          <SegmentedControlItem value="public" label="Public" />
        </SegmentedControl>
        {hasRepos ? (
          <CheckboxInput
            label="Make it the primary repository"
            description="Muse Code agents work in the primary repository unless a ticket picks another."
            value={makePrimary}
            onChange={setMakePrimary}
            isDisabled={isSaving}
          />
        ) : null}
      </FormLayout>
    );
  }

  const errorTitle =
    message ?? (repoOwners?.status === "error" ? repoOwners.message : null);

  return (
    <Dialog isOpen={isOpen} onOpenChange={handleOpenChange} purpose="form" width={560}>
      <Layout
        header={
          <DialogHeader
            title="New GitHub repository"
            hasDivider
            onOpenChange={handleOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <Text type="supporting">
                Created as you, with a README, and linked to this project.
              </Text>
              {errorTitle ? <Banner status="error" title={errorTitle} /> : null}
              {body}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} vAlign="center">
              <Button
                label="Cancel"
                variant="secondary"
                isDisabled={isSaving}
                onClick={() => handleOpenChange(false)}
              />
              <StackItem size="fill" />
              <Button
                label="Create repository"
                variant="primary"
                isLoading={isSaving}
                isDisabled={owners.length === 0}
                onClick={save}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
