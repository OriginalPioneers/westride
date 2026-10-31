"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Divider } from "@astryxdesign/core/Divider";
import { FieldStatus } from "@astryxdesign/core/FieldStatus";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  Typeahead,
  TypeaheadItem,
  type SearchSource,
} from "@astryxdesign/core/Typeahead";
import { CodeBracketIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { ProjectMemberRole } from "@westride/db";
import {
  MAX_PROJECT_DESCRIPTION,
  MAX_PROJECT_NAME,
  validateProjectDraft,
  type FieldErrors,
  type ProjectDraft,
} from "@/lib/build/schema";
import { PROJECT_ROLE_LABELS, projectPath } from "@/lib/build/labels";
import { parseGithubRepoRef, suggestGithubRepoName } from "@/lib/github/repo-ref";
import { searchIdeaPeople, type IdeaPersonHit } from "../ideas/actions";
import {
  createProjectFromStudio,
  loadGithubRepoOwners,
  loadProjectPrefill,
  type GithubRepoOwnersResult,
  type ProjectPrefill,
} from "./actions";

const CONNECT_GITHUB_HREF = "/integrations/github/connect?returnTo=/settings";
const INSTALL_GITHUB_HREF = "/integrations/github/connect?intent=install&returnTo=/settings";

export type ProjectCreator = {
  name: string;
  imageUrl: string | null;
};

export type IdeaOption = { id: string; name: string };

type Invitee = {
  clerkUserId: string;
  name: string;
  imageUrl: string | null;
  detail: string | null;
  role: ProjectMemberRole;
};

const DIALOG_HEIGHT = "calc(100dvh - (2 * var(--spacing-4)))";

function fieldStatus(message: string | undefined) {
  return message ? { type: "error" as const, message } : undefined;
}

function isRole(value: string): value is ProjectMemberRole {
  return value === "OWNER" || value === "MEMBER";
}

function invitesFromPrefill(prefill: ProjectPrefill): Invitee[] {
  return prefill.invites.map((invite) => ({
    clerkUserId: invite.clerkUserId,
    name: invite.name,
    imageUrl: invite.imageUrl,
    detail: null,
    role: invite.role,
  }));
}

export function CreateProjectDialog({
  isOpen,
  onOpenChange,
  creator,
  prefill,
  ideaOptions,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  creator: ProjectCreator;
  /** Filled in when the dialog was opened from an idea. */
  prefill?: ProjectPrefill | null;
  /** Ideas the member could start from. Empty hides the picker. */
  ideaOptions?: IdeaOption[];
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isPrefilling, startPrefilling] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [ideaId, setIdeaId] = useState(prefill?.ideaId ?? "");
  const [name, setName] = useState(prefill?.name ?? "");
  const [description, setDescription] = useState(prefill?.description ?? "");
  const [isPublic, setIsPublic] = useState(false);
  const [invites, setInvites] = useState<Invitee[]>(() =>
    prefill ? invitesFromPrefill(prefill) : [],
  );
  const [repoUrls, setRepoUrls] = useState<string[]>(() =>
    prefill?.githubRepoUrl ? [prefill.githubRepoUrl] : [],
  );
  const [repoInput, setRepoInput] = useState("");
  const [repoInputError, setRepoInputError] = useState<string | null>(null);
  const [repoOwners, setRepoOwners] = useState<GithubRepoOwnersResult | null>(null);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [newRepoOwner, setNewRepoOwner] = useState("");
  /** Null follows the project name until the member types their own. */
  const [newRepoName, setNewRepoName] = useState<string | null>(null);
  const [newRepoIsPrivate, setNewRepoIsPrivate] = useState(true);
  const [picker, setPicker] = useState<IdeaPersonHit | null>(null);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || repoOwners) {
      return;
    }
    let isCurrent = true;
    loadGithubRepoOwners()
      .then((result) => {
        if (!isCurrent) {
          return;
        }
        setRepoOwners(result);
        if (result.status === "ok") {
          setNewRepoOwner((current) => current || (result.owners[0]?.login ?? ""));
        }
      })
      .catch((error: unknown) => {
        console.error("GitHub owner lookup failed", error);
      });
    return () => {
      isCurrent = false;
    };
  }, [isOpen, repoOwners]);

  const owners = repoOwners?.status === "ok" ? repoOwners.owners : [];
  const effectiveRepoName = newRepoName ?? suggestGithubRepoName(name);

  const draft: ProjectDraft = {
    name,
    description,
    isPublic,
    ideaId,
    invites: invites.map((invite) => ({
      clerkUserId: invite.clerkUserId,
      role: invite.role,
    })),
    githubRepoUrls: repoUrls,
    newGithubRepo:
      isCreatingRepo && owners.length > 0
        ? { owner: newRepoOwner, name: effectiveRepoName, isPrivate: newRepoIsPrivate }
        : null,
  };
  const errors: FieldErrors = {
    ...(submitted ? validateProjectDraft(draft) : {}),
    ...serverErrors,
  };

  const memberSource = useMemo<SearchSource<IdeaPersonHit>>(
    () => ({
      async search(query: string) {
        const hits = await searchIdeaPeople(query);
        const taken = new Set(invites.map((invite) => invite.clerkUserId));
        return hits.filter((hit) => !taken.has(hit.id));
      },
      bootstrap() {
        return [];
      },
    }),
    [invites],
  );

  function clearServer(key: string) {
    setServerErrors((current) => {
      if (!(key in current)) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
    setFormMessage(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next && isSaving) {
      return;
    }
    onOpenChange(next);
  }

  function chooseIdea(nextIdeaId: string | null) {
    const chosen = nextIdeaId ?? "";
    setIdeaId(chosen);
    clearServer("ideaId");
    if (!chosen) {
      return;
    }
    startPrefilling(async () => {
      const result = await loadProjectPrefill(chosen);
      if (result.status === "error") {
        setFormMessage(result.message);
        return;
      }
      const loaded = result.prefill;
      setName(loaded.name);
      setDescription(loaded.description);
      setInvites(invitesFromPrefill(loaded));
      if (loaded.githubRepoUrl) {
        setRepoUrls((current) =>
          current.includes(loaded.githubRepoUrl!) ? current : [...current, loaded.githubRepoUrl!],
        );
      }
    });
  }

  function addRepo() {
    const url = repoInput.trim();
    if (!url) {
      return;
    }
    const ref = parseGithubRepoRef(url);
    if (!ref) {
      setRepoInputError("Use a GitHub repository link, like https://github.com/owner/repo.");
      return;
    }
    const canonical = `https://github.com/${ref.owner}/${ref.repo}`;
    setRepoUrls((current) => (current.includes(canonical) ? current : [...current, canonical]));
    setRepoInput("");
    setRepoInputError(null);
    clearServer("githubRepoUrls");
  }

  function addPerson(hit: IdeaPersonHit) {
    setInvites((current) =>
      current.some((invite) => invite.clerkUserId === hit.id)
        ? current
        : [
            ...current,
            {
              clerkUserId: hit.id,
              name: hit.label,
              imageUrl: hit.auxiliaryData.imageUrl,
              detail: hit.auxiliaryData.detail,
              role: "MEMBER",
            },
          ],
    );
    setPicker(null);
    clearServer("invites");
  }

  function save() {
    setSubmitted(true);
    const nextErrors = validateProjectDraft(draft);
    if (Object.keys(nextErrors).length > 0) {
      setServerErrors({});
      setFormMessage("Fix the highlighted fields.");
      return;
    }
    startSaving(async () => {
      try {
        const result = await createProjectFromStudio(draft);
        if (result.status === "error") {
          const createdRepoUrl = result.createdRepoUrl;
          if (createdRepoUrl) {
            setRepoUrls((current) =>
              current.includes(createdRepoUrl) ? current : [createdRepoUrl, ...current],
            );
            setIsCreatingRepo(false);
          }
          setServerErrors(result.fieldErrors);
          setFormMessage(result.message);
          return;
        }
        onOpenChange(false);
        router.push(projectPath(result.id));
      } catch (error) {
        console.error("Project create failed", error);
        setFormMessage("The project could not be saved. Try again.");
      }
    });
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      purpose="form"
      width={880}
      maxHeight={DIALOG_HEIGHT}
      style={{ height: DIALOG_HEIGHT }}
    >
      <Layout
        height="fill"
        header={
          <DialogHeader
            title="New project"
            hasDivider
            onOpenChange={handleOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={8}>
              {formMessage ? <Banner status="error" title={formMessage} /> : null}

              <FormLayout defaultOptionality="required">
                {ideaOptions && ideaOptions.length > 0 ? (
                  <Selector
                    label="Start from an idea"
                    description="Copies the idea's name, pitch, team, and repository. You can change any of it."
                    placeholder="Start fresh"
                    options={ideaOptions.map((idea) => ({
                      value: idea.id,
                      label: idea.name,
                    }))}
                    value={ideaId || null}
                    onChange={chooseIdea}
                    hasClear
                    hasSearch={ideaOptions.length > 8}
                    isOptional
                    isDisabled={isPrefilling}
                    status={fieldStatus(errors.ideaId)}
                  />
                ) : null}
                <TextInput
                  label="Name"
                  value={name}
                  onChange={(value) => {
                    setName(value);
                    clearServer("name");
                  }}
                  placeholder="Tool library app"
                  description={`Up to ${MAX_PROJECT_NAME} characters. Ticket keys use its initials.`}
                  isRequired
                  status={fieldStatus(errors.name)}
                />
                <TextArea
                  label="What are you building?"
                  description="The product in a paragraph: who it is for, the core flows, and what version one leaves out. Muse reads this when it drafts tickets. Markdown is fine."
                  value={description}
                  onChange={(value) => {
                    setDescription(value);
                    clearServer("description");
                  }}
                  rows={8}
                  maxLength={MAX_PROJECT_DESCRIPTION}
                  isRequired
                  status={fieldStatus(errors.description)}
                />
                <SegmentedControl
                  label="Who can see it"
                  value={isPublic ? "public" : "private"}
                  onChange={(value) => setIsPublic(value === "public")}
                >
                  <SegmentedControlItem value="private" label="Private · team only" />
                  <SegmentedControlItem value="public" label="Public · anyone on WeStride" />
                </SegmentedControl>
              </FormLayout>

              <Divider />

              <VStack gap={4}>
                <VStack gap={1}>
                  <Heading level={2} accessibilityLevel={3}>
                    Repositories
                  </Heading>
                  <Text type="supporting">
                    Where the code lives. Link repositories you already have, or
                    create a new one. Private repositories need your GitHub
                    connection from Settings. You can add more later.
                  </Text>
                </VStack>
                <HStack gap={2} vAlign="end" wrap="wrap">
                  <StackItem size="fill">
                    <TextInput
                      label="GitHub repository"
                      isLabelHidden
                      value={repoInput}
                      onChange={(value) => {
                        setRepoInput(value);
                        setRepoInputError(null);
                      }}
                      placeholder="https://github.com/owner/repo"
                      status={fieldStatus(repoInputError ?? errors.githubRepoUrls)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addRepo();
                        }
                      }}
                    />
                  </StackItem>
                  <Button label="Add" variant="secondary" onClick={addRepo} />
                </HStack>
                {repoUrls.length > 0 ? (
                  <List>
                    {repoUrls.map((url) => (
                      <ListItem
                        key={url}
                        label={url.replace("https://github.com/", "")}
                        startContent={<Icon icon={CodeBracketIcon} />}
                        endContent={
                          <IconButton
                            label={`Remove ${url}`}
                            icon={<Icon icon={TrashIcon} />}
                            variant="ghost"
                            onClick={() =>
                              setRepoUrls((current) => current.filter((item) => item !== url))
                            }
                          />
                        }
                      />
                    ))}
                  </List>
                ) : null}
                {owners.length > 0 ? (
                  <VStack gap={4}>
                    <CheckboxInput
                      label="Create a new GitHub repository"
                      description="Created with a README when you create the project, and linked as its primary repository."
                      value={isCreatingRepo}
                      onChange={(checked) => {
                        setIsCreatingRepo(checked);
                        clearServer("newGithubRepo.owner");
                        clearServer("newGithubRepo.name");
                      }}
                      isDisabled={isSaving}
                    />
                    {isCreatingRepo ? (
                      <FormLayout defaultOptionality="required">
                        <Selector
                          label="Owner"
                          options={owners.map((owner) => ({
                            value: owner.login,
                            label: owner.login,
                            description: owner.isOrganization
                              ? "Organization"
                              : "Your account",
                          }))}
                          value={newRepoOwner || undefined}
                          placeholder="Choose an account"
                          onChange={(value) => {
                            setNewRepoOwner(value);
                            clearServer("newGithubRepo.owner");
                          }}
                          hasSearch={owners.length > 8}
                          isRequired
                          isDisabled={isSaving}
                          status={fieldStatus(errors["newGithubRepo.owner"])}
                        />
                        <TextInput
                          label="Repository name"
                          value={effectiveRepoName}
                          onChange={(value) => {
                            setNewRepoName(value);
                            clearServer("newGithubRepo.name");
                          }}
                          placeholder="tool-library-app"
                          description={
                            newRepoOwner && effectiveRepoName
                              ? `github.com/${newRepoOwner}/${effectiveRepoName}`
                              : "Letters, numbers, dots, dashes, or underscores."
                          }
                          isRequired
                          isDisabled={isSaving}
                          status={fieldStatus(errors["newGithubRepo.name"])}
                        />
                        <SegmentedControl
                          label="Visibility on GitHub"
                          value={newRepoIsPrivate ? "private" : "public"}
                          onChange={(value) => setNewRepoIsPrivate(value === "private")}
                        >
                          <SegmentedControlItem value="private" label="Private" />
                          <SegmentedControlItem value="public" label="Public" />
                        </SegmentedControl>
                      </FormLayout>
                    ) : null}
                  </VStack>
                ) : repoOwners?.status === "ok" ? (
                  <Text type="supporting">
                    To create a new repository from here,{" "}
                    <Link href={INSTALL_GITHUB_HREF} isExternalLink>
                      install WeStride on your GitHub account or an organization
                    </Link>
                    .
                  </Text>
                ) : repoOwners?.status === "needs-connection" ? (
                  <Text type="supporting">
                    <Link href={CONNECT_GITHUB_HREF} isExternalLink>
                      Connect GitHub
                    </Link>{" "}
                    to create a new repository from here.
                  </Text>
                ) : null}
              </VStack>

              <Divider />

              <VStack gap={5}>
                <VStack gap={1}>
                  <Heading level={2} accessibilityLevel={3}>
                    Team
                  </Heading>
                  <Text type="supporting">
                    You will be an owner. Add anyone who should work on it.
                  </Text>
                </VStack>
                <Typeahead
                  label="Add people"
                  description="Search by name or email. They need a WeStride account."
                  placeholder="Search members"
                  searchSource={memberSource}
                  value={picker}
                  onChange={(item) => {
                    if (item) {
                      addPerson(item);
                    } else {
                      setPicker(null);
                    }
                  }}
                  isOptional
                  minQueryLength={2}
                  debounceMs={300}
                  emptySearchText="No WeStride members match that search."
                  renderItem={(item) => (
                    <TypeaheadItem
                      item={item}
                      description={item.auxiliaryData.detail ?? undefined}
                      icon={
                        <Avatar
                          name={item.label}
                          src={item.auxiliaryData.imageUrl ?? undefined}
                          size="sm"
                          tooltip={false}
                        />
                      }
                    />
                  )}
                />
                <VStack gap={4}>
                  <HStack gap={3} vAlign="center" wrap="wrap">
                    <Avatar
                      name={creator.name}
                      src={creator.imageUrl ?? undefined}
                      size="md"
                      tooltip={false}
                    />
                    <StackItem size="fill">
                      <VStack gap={0}>
                        <Text>{creator.name}</Text>
                        <Text type="supporting">You · {PROJECT_ROLE_LABELS.OWNER}</Text>
                      </VStack>
                    </StackItem>
                  </HStack>
                  {invites.map((invite) => (
                    <HStack key={invite.clerkUserId} gap={3} vAlign="center" wrap="wrap">
                      <Avatar
                        name={invite.name}
                        src={invite.imageUrl ?? undefined}
                        size="md"
                        tooltip={false}
                      />
                      <StackItem size="fill">
                        <VStack gap={0}>
                          <Text>{invite.name}</Text>
                          {invite.detail ? (
                            <Text type="supporting">{invite.detail}</Text>
                          ) : null}
                        </VStack>
                      </StackItem>
                      <SegmentedControl
                        label={`Role for ${invite.name}`}
                        value={invite.role}
                        onChange={(role) => {
                          if (isRole(role)) {
                            setInvites((current) =>
                              current.map((item) =>
                                item.clerkUserId === invite.clerkUserId
                                  ? { ...item, role }
                                  : item,
                              ),
                            );
                          }
                        }}
                        size="lg"
                      >
                        <SegmentedControlItem value="MEMBER" label={PROJECT_ROLE_LABELS.MEMBER} />
                        <SegmentedControlItem value="OWNER" label={PROJECT_ROLE_LABELS.OWNER} />
                      </SegmentedControl>
                      <IconButton
                        label={`Remove ${invite.name}`}
                        icon={<Icon icon={TrashIcon} />}
                        variant="ghost"
                        onClick={() =>
                          setInvites((current) =>
                            current.filter((item) => item.clerkUserId !== invite.clerkUserId),
                          )
                        }
                      />
                    </HStack>
                  ))}
                </VStack>
                {errors.invites ? (
                  <FieldStatus type="error" variant="detached" message={errors.invites} />
                ) : null}
              </VStack>
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
                label="Create project"
                variant="primary"
                isLoading={isSaving}
                isDisabled={isPrefilling}
                onClick={save}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
