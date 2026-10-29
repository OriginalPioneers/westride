"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Divider } from "@astryxdesign/core/Divider";
import { FieldStatus } from "@astryxdesign/core/FieldStatus";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  Typeahead,
  TypeaheadItem,
  type SearchSource,
} from "@astryxdesign/core/Typeahead";
import { TrashIcon } from "@heroicons/react/24/outline";
import type { IdeaMemberRole } from "@westride/db";
import {
  MAX_IDEA_DESCRIPTION,
  MAX_IDEA_NAME,
  validateIdeaEdit,
  type CreateIdeaFieldErrors,
  type IdeaEditDraft,
} from "@/lib/ideas/create-schema";
import { IDEA_ROLE_LABELS } from "@/lib/ideas/filters";
import {
  searchIdeaPeople,
  updateIdeaFromStudio,
  type IdeaPersonHit,
} from "../actions";

export type EditableIdeaMember = {
  clerkUserId: string;
  role: IdeaMemberRole;
  name: string;
  imageUrl: string | null;
};

export type EditableIdea = {
  prototypeUrl: string | null;
  prototypeInstructions: string | null;
  isPublic: boolean;
  id: string;
  name: string;
  description: string;
  members: EditableIdeaMember[];
};

type TeamMember = EditableIdeaMember & {
  detail: string | null;
};

const KEEP_FOUNDER = "Keep at least one founder.";

const DIALOG_HEIGHT = "calc(100dvh - (2 * var(--spacing-4)))";

function fieldStatus(message: string | undefined) {
  return message ? { type: "error" as const, message } : undefined;
}

function messageFor(
  errors: CreateIdeaFieldErrors,
  field: string,
): string | undefined {
  if (errors[field]) {
    return errors[field];
  }
  const nested = Object.entries(errors).find(([key]) =>
    key.startsWith(`${field}.`),
  );
  return nested?.[1];
}

function isRole(value: string): value is IdeaMemberRole {
  return value === "FOUNDER" || value === "MEMBER";
}

function foundersFirst(members: TeamMember[]): TeamMember[] {
  return [...members].sort((a, b) => {
    if (a.role === b.role) {
      return 0;
    }
    return a.role === "FOUNDER" ? -1 : 1;
  });
}

export function EditIdeaDialog({
  isOpen,
  onOpenChange,
  idea,
  viewerId,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  idea: EditableIdea;
  viewerId: string;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState(idea.name);
  const [description, setDescription] = useState(idea.description);
  const [prototypeUrl, setPrototypeUrl] = useState(idea.prototypeUrl ?? "");
  const [prototypeInstructions, setPrototypeInstructions] = useState(
    idea.prototypeInstructions ?? "",
  );
  const [prototypeTested, setPrototypeTested] = useState(
    Boolean(idea.prototypeUrl),
  );
  const [members, setMembers] = useState<TeamMember[]>(() =>
    idea.members.map((member) => ({ ...member, detail: null })),
  );
  const [picker, setPicker] = useState<IdeaPersonHit | null>(null);
  const [serverErrors, setServerErrors] = useState<CreateIdeaFieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const draft: IdeaEditDraft = {
    prototypeUrl,
    prototypeInstructions,
    prototypeTested,
    name,
    description,
    members: members.map((member) => ({
      clerkUserId: member.clerkUserId,
      role: member.role,
    })),
  };

  const errors = {
    ...(submitted ? validateIdeaEdit(draft) : {}),
    ...serverErrors,
  };
  const membersError = messageFor(errors, "members");
  const founderCount = members.filter(
    (member) => member.role === "FOUNDER",
  ).length;

  const memberSource = useMemo<SearchSource<IdeaPersonHit>>(
    () => ({
      async search(query: string) {
        const hits = await searchIdeaPeople(query, { includeSelf: true });
        const taken = new Set(members.map((member) => member.clerkUserId));
        return hits.filter((hit) => !taken.has(hit.id));
      },
      bootstrap() {
        return [];
      },
    }),
    [members],
  );

  function clearServer(key: string) {
    setServerErrors((current) => {
      const keys = Object.keys(current).filter(
        (entry) => entry === key || entry.startsWith(`${key}.`),
      );
      if (keys.length === 0) {
        return current;
      }
      const next = { ...current };
      for (const entry of keys) {
        delete next[entry];
      }
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

  function addPerson(hit: IdeaPersonHit) {
    setMembers((current) => {
      if (current.some((member) => member.clerkUserId === hit.id)) {
        return current;
      }
      return [
        ...current,
        {
          clerkUserId: hit.id,
          role: "MEMBER",
          name: hit.label,
          imageUrl: hit.auxiliaryData.imageUrl,
          detail: hit.auxiliaryData.detail,
        },
      ];
    });
    setPicker(null);
    clearServer("members");
  }

  function setMemberRole(clerkUserId: string, role: string) {
    if (!isRole(role)) {
      return;
    }
    setMembers((current) => {
      const founders = current.filter(
        (member) => member.role === "FOUNDER",
      ).length;
      return current.map((member) => {
        if (member.clerkUserId !== clerkUserId) {
          return member;
        }
        if (member.role === "FOUNDER" && role === "MEMBER" && founders <= 1) {
          return member;
        }
        return { ...member, role };
      });
    });
    clearServer("members");
  }

  function removeMember(clerkUserId: string) {
    setMembers((current) => {
      const target = current.find(
        (member) => member.clerkUserId === clerkUserId,
      );
      const founders = current.filter(
        (member) => member.role === "FOUNDER",
      ).length;
      if (target?.role === "FOUNDER" && founders <= 1) {
        return current;
      }
      return current.filter((member) => member.clerkUserId !== clerkUserId);
    });
    clearServer("members");
  }

  function save() {
    setSubmitted(true);
    const nextErrors = validateIdeaEdit(draft);
    if (Object.keys(nextErrors).length > 0) {
      setServerErrors({});
      setFormMessage("Fix the highlighted fields.");
      return;
    }

    startSaving(async () => {
      try {
        const result = await updateIdeaFromStudio(idea.id, draft);
        if (result.status === "error") {
          setServerErrors(result.fieldErrors);
          setFormMessage(result.message);
          return;
        }
        window.dispatchEvent(new Event("westride:achievements"));
        if (!result.canStillView) {
          router.push("/ideas");
          return;
        }
        try {
          await router.refresh();
        } catch (error) {
          console.error("Idea page refresh failed", error);
        }
        onOpenChange(false);
      } catch (error) {
        console.error("Idea update failed", error);
        setFormMessage("The idea could not be saved. Try again.");
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
            title="Edit idea"
            hasDivider
            onOpenChange={handleOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={8}>
              {formMessage ? (
                <Banner status="error" title={formMessage} />
              ) : null}
              <FormLayout defaultOptionality="required">
                <TextInput
                  label="Name"
                  value={name}
                  onChange={(value) => {
                    setName(value);
                    clearServer("name");
                  }}
                  placeholder="Neighborhood tool library"
                  description={`Up to ${MAX_IDEA_NAME} characters.`}
                  isRequired
                  status={fieldStatus(errors.name)}
                />
                <TextArea
                  label="Description"
                  description="A short pitch. Markdown is fine."
                  value={description}
                  onChange={(value) => {
                    setDescription(value);
                    clearServer("description");
                  }}
                  placeholder="What it is, who it is for, and why it should exist."
                  rows={8}
                  maxLength={MAX_IDEA_DESCRIPTION}
                  isRequired
                  status={fieldStatus(errors.description)}
                />
              </FormLayout>

              <Divider />

              <VStack gap={4}>
                <Heading level={2} accessibilityLevel={3}>
                  Prototype
                </Heading>
                <Text type="supporting">
                  {idea.isPublic
                    ? "Your link will be visible to everyone who views this public idea."
                    : "Your link will be visible to members of this private idea."}{" "}
                  The prototype’s own access settings still apply.
                </Text>
                <TextInput
                  label="Prototype link"
                  value={prototypeUrl}
                  isOptional
                  placeholder="https://your-prototype.example.com"
                  description="Share something people can use. Clear the link to remove it."
                  status={fieldStatus(errors.prototypeUrl)}
                  onChange={(value) => {
                    setPrototypeUrl(value);
                    setPrototypeTested(false);
                    clearServer("prototypeUrl");
                  }}
                />
                {prototypeUrl.trim() ? (
                  <>
                    <TextArea
                      label="What should people try?"
                      value={prototypeInstructions}
                      rows={3}
                      maxLength={600}
                      isRequired
                      description="Give one short task, such as adding a sample item and checking the result."
                      status={fieldStatus(errors.prototypeInstructions)}
                      onChange={(value) => {
                        setPrototypeInstructions(value);
                        setPrototypeTested(false);
                        clearServer("prototypeInstructions");
                      }}
                    />
                    <CheckboxInput
                      label="I tested this link and the task works."
                      value={prototypeTested}
                      isRequired
                      onChange={setPrototypeTested}
                      description="Check that the people viewing your idea can access the prototype."
                    />
                  </>
                ) : null}
              </VStack>
              <Divider />
              <VStack gap={5}>
                <VStack gap={2}>
                  <Heading level={2} accessibilityLevel={3}>
                    Team
                  </Heading>
                  <Text type="supporting">
                    Add WeStride members, or remove people who should no longer
                    be on the idea. {KEEP_FOUNDER}
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
                  {foundersFirst(members).map((member) => {
                    const isLastFounder =
                      member.role === "FOUNDER" && founderCount === 1;
                    const detail =
                      member.clerkUserId === viewerId ? "You" : member.detail;
                    return (
                      <HStack
                        key={member.clerkUserId}
                        gap={3}
                        vAlign="center"
                        wrap="wrap"
                      >
                        <Avatar
                          name={member.name}
                          src={member.imageUrl ?? undefined}
                          size="md"
                          tooltip={false}
                        />
                        <StackItem size="fill">
                          <VStack gap={0}>
                            <Text>{member.name}</Text>
                            {detail ? (
                              <Text type="supporting">{detail}</Text>
                            ) : null}
                          </VStack>
                        </StackItem>
                        <SegmentedControl
                          label={`Role for ${member.name}`}
                          value={member.role}
                          onChange={(role) =>
                            setMemberRole(member.clerkUserId, role)
                          }
                          size="lg"
                          isDisabled={isLastFounder}
                          disabledMessage={
                            isLastFounder ? KEEP_FOUNDER : undefined
                          }
                        >
                          <SegmentedControlItem
                            value="MEMBER"
                            label={IDEA_ROLE_LABELS.MEMBER}
                          />
                          <SegmentedControlItem
                            value="FOUNDER"
                            label={IDEA_ROLE_LABELS.FOUNDER}
                          />
                        </SegmentedControl>
                        <IconButton
                          label={`Remove ${member.name}`}
                          tooltip={isLastFounder ? KEEP_FOUNDER : "Remove"}
                          icon={<Icon icon={TrashIcon} />}
                          variant="ghost"
                          isDisabled={isLastFounder}
                          onClick={() => removeMember(member.clerkUserId)}
                        />
                      </HStack>
                    );
                  })}
                </VStack>
                {membersError ? (
                  <FieldStatus
                    type="error"
                    variant="detached"
                    message={membersError}
                  />
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
                label="Save"
                variant="primary"
                isLoading={isSaving}
                onClick={save}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
