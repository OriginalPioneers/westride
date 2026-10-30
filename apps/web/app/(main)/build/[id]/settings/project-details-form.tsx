"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { FieldStatus } from "@astryxdesign/core/FieldStatus";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
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
import { TrashIcon } from "@heroicons/react/24/outline";
import type { ProjectMemberRole, ProjectStatus } from "@westride/db";
import {
  PROJECT_ROLE_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
} from "@/lib/build/labels";
import {
  MAX_PROJECT_DESCRIPTION,
  MAX_PROJECT_NAME,
  validateProjectEdit,
  type FieldErrors,
  type ProjectEditDraft,
} from "@/lib/build/schema";
import { searchIdeaPeople, type IdeaPersonHit } from "../../../ideas/actions";
import { updateProjectFromStudio } from "../../actions";

export type EditableMember = {
  clerkUserId: string;
  role: ProjectMemberRole;
  name: string;
  imageUrl: string | null;
};

export type EditableProject = {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  status: ProjectStatus;
  members: EditableMember[];
};

type TeamMember = EditableMember & { detail: string | null };

const KEEP_OWNER = "Keep at least one owner.";

function fieldStatus(message: string | undefined) {
  return message ? { type: "error" as const, message } : undefined;
}

function isRole(value: string): value is ProjectMemberRole {
  return value === "OWNER" || value === "MEMBER";
}

function isStatus(value: string): value is ProjectStatus {
  return value in PROJECT_STATUS_LABELS;
}

export function ProjectDetailsForm({
  project,
  viewerId,
}: {
  project: EditableProject;
  viewerId: string;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [isPublic, setIsPublic] = useState(project.isPublic);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [members, setMembers] = useState<TeamMember[]>(() =>
    project.members.map((member) => ({ ...member, detail: null })),
  );
  const [picker, setPicker] = useState<IdeaPersonHit | null>(null);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const draft: ProjectEditDraft = {
    name,
    description,
    isPublic,
    status,
    members: members.map((member) => ({
      clerkUserId: member.clerkUserId,
      role: member.role,
    })),
  };
  const errors: FieldErrors = {
    ...(submitted ? validateProjectEdit(draft) : {}),
    ...serverErrors,
  };
  const ownerCount = members.filter((member) => member.role === "OWNER").length;

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

  function touch(key: string) {
    setSaved(false);
    setFormMessage(null);
    setServerErrors((current) => {
      if (!(key in current)) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function save() {
    setSubmitted(true);
    const nextErrors = validateProjectEdit(draft);
    if (Object.keys(nextErrors).length > 0) {
      setServerErrors({});
      setFormMessage("Fix the highlighted fields.");
      return;
    }
    startSaving(async () => {
      try {
        const result = await updateProjectFromStudio(project.id, draft);
        if (result.status === "error") {
          setServerErrors(result.fieldErrors);
          setFormMessage(result.message);
          return;
        }
        if (!result.canStillView) {
          router.push("/build");
          return;
        }
        setSaved(true);
        router.refresh();
      } catch (error) {
        console.error("Project update failed", error);
        setFormMessage("The project could not be saved. Try again.");
      }
    });
  }

  return (
    <VStack gap={6}>
      {formMessage ? <Banner status="error" title={formMessage} /> : null}
      {saved ? <Banner status="success" title="Saved." /> : null}
      <FormLayout defaultOptionality="required">
        <TextInput
          label="Name"
          value={name}
          onChange={(value) => {
            setName(value);
            touch("name");
          }}
          description={`Up to ${MAX_PROJECT_NAME} characters.`}
          isRequired
          status={fieldStatus(errors.name)}
        />
        <TextArea
          label="Description"
          description="What you are building, for whom, and what version one leaves out. Markdown is fine."
          value={description}
          onChange={(value) => {
            setDescription(value);
            touch("description");
          }}
          rows={8}
          maxLength={MAX_PROJECT_DESCRIPTION}
          isRequired
          status={fieldStatus(errors.description)}
        />
        <Selector
          label="Stage"
          options={PROJECT_STATUS_ORDER.map((value) => ({
            value,
            label: PROJECT_STATUS_LABELS[value],
          }))}
          value={status}
          onChange={(value) => {
            if (value && isStatus(value)) {
              setStatus(value);
              touch("status");
            }
          }}
        />
        <SegmentedControl
          label="Who can see it"
          value={isPublic ? "public" : "private"}
          onChange={(value) => {
            setIsPublic(value === "public");
            touch("isPublic");
          }}
        >
          <SegmentedControlItem value="private" label="Private · team only" />
          <SegmentedControlItem value="public" label="Public · anyone on WeStride" />
        </SegmentedControl>
      </FormLayout>

      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={3}>Team</Heading>
          <Text type="supporting">
            Owners can change these settings. Everyone on the team can work on
            tickets. {KEEP_OWNER}
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
              setMembers((current) =>
                current.some((member) => member.clerkUserId === item.id)
                  ? current
                  : [
                      ...current,
                      {
                        clerkUserId: item.id,
                        role: "MEMBER",
                        name: item.label,
                        imageUrl: item.auxiliaryData.imageUrl,
                        detail: item.auxiliaryData.detail,
                      },
                    ],
              );
              touch("members");
            }
            setPicker(null);
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
          {members.map((member) => {
            const isLastOwner = member.role === "OWNER" && ownerCount === 1;
            const detail = member.clerkUserId === viewerId ? "You" : member.detail;
            return (
              <HStack key={member.clerkUserId} gap={3} vAlign="center" wrap="wrap">
                <Avatar
                  name={member.name}
                  src={member.imageUrl ?? undefined}
                  size="md"
                  tooltip={false}
                />
                <StackItem size="fill">
                  <VStack gap={0}>
                    <Text>{member.name}</Text>
                    {detail ? <Text type="supporting">{detail}</Text> : null}
                  </VStack>
                </StackItem>
                <SegmentedControl
                  label={`Role for ${member.name}`}
                  value={member.role}
                  onChange={(role) => {
                    if (!isRole(role) || isLastOwner) {
                      return;
                    }
                    setMembers((current) =>
                      current.map((item) =>
                        item.clerkUserId === member.clerkUserId ? { ...item, role } : item,
                      ),
                    );
                    touch("members");
                  }}
                  size="lg"
                  isDisabled={isLastOwner}
                  disabledMessage={isLastOwner ? KEEP_OWNER : undefined}
                >
                  <SegmentedControlItem value="MEMBER" label={PROJECT_ROLE_LABELS.MEMBER} />
                  <SegmentedControlItem value="OWNER" label={PROJECT_ROLE_LABELS.OWNER} />
                </SegmentedControl>
                <IconButton
                  label={`Remove ${member.name}`}
                  tooltip={isLastOwner ? KEEP_OWNER : "Remove"}
                  icon={<Icon icon={TrashIcon} />}
                  variant="ghost"
                  isDisabled={isLastOwner}
                  onClick={() => {
                    setMembers((current) =>
                      current.filter((item) => item.clerkUserId !== member.clerkUserId),
                    );
                    touch("members");
                  }}
                />
              </HStack>
            );
          })}
        </VStack>
        {errors.members ? (
          <FieldStatus type="error" variant="detached" message={errors.members} />
        ) : null}
      </VStack>

      <HStack gap={2} vAlign="center">
        <StackItem size="fill" />
        <Button label="Save changes" variant="primary" isLoading={isSaving} onClick={save} />
      </HStack>
    </VStack>
  );
}
