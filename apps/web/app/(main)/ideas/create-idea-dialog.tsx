"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Divider } from "@astryxdesign/core/Divider";
import { FieldStatus } from "@astryxdesign/core/FieldStatus";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from "@astryxdesign/core/Layout";
import { SelectableCard } from "@astryxdesign/core/SelectableCard";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  Typeahead,
  TypeaheadItem,
  type SearchSource,
} from "@astryxdesign/core/Typeahead";
import {
  BuildingOffice2Icon,
  GlobeAltIcon,
  HeartIcon,
  LockClosedIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { IdeaMemberRole, IdeaType } from "@westride/db";
import {
  MAX_IDEA_DESCRIPTION,
  MAX_IDEA_NAME,
  validateIdeaDraft,
  type CreateIdeaFieldErrors,
  type IdeaDraft,
} from "@/lib/ideas/create-schema";
import { IDEA_ROLE_LABELS, IDEA_TYPE_LABELS, ideaPath } from "@/lib/ideas/filters";
import {
  createIdeaFromStudio,
  searchIdeaPeople,
  type IdeaPersonHit,
} from "./actions";

export type IdeaFounder = {
  name: string;
  imageUrl: string | null;
};

type Invitee = IdeaPersonHit & { role: IdeaMemberRole };

const STEPS = [
  { label: "Kind", question: "What kind of idea is this?" },
  { label: "Idea", question: "What is the idea?" },
  { label: "Sharing", question: "Who can see it?" },
  { label: "Team", question: "Who is building it?" },
] as const;

const STEP_FIELDS = [
  ["type"],
  ["name", "description"],
  ["isPublic"],
  ["invites"],
] as const;

/**
 * Nearly the whole viewport. Dialog clamps a standard surface to the same
 * spacing-4 gutter, which leaves the darkened scrim visible around the edge.
 * The fullscreen variant would cover that scrim.
 */
const DIALOG_SIZE = "calc(100dvh - (2 * var(--spacing-4)))";
const DIALOG_WIDTH = "calc(100dvw - (2 * var(--spacing-4)))";

const KIND_OPTIONS: {
  type: IdeaType;
  description: string;
  icon: typeof BuildingOffice2Icon;
}[] = [
  {
    type: "BUSINESS",
    description:
      "A product, service, or company. Something you want to build and grow.",
    icon: BuildingOffice2Icon,
  },
  {
    type: "NON_PROFIT",
    description:
      "A cause, charity, or community organization built to serve people.",
    icon: HeartIcon,
  },
];

const SHARING_OPTIONS: {
  isPublic: boolean;
  label: string;
  description: string;
  icon: typeof GlobeAltIcon;
}[] = [
  {
    isPublic: true,
    label: "Community",
    description: "Anyone on WeStride can find this idea and read it.",
    icon: GlobeAltIcon,
  },
  {
    isPublic: false,
    label: "Team only",
    description: "Only you and the people you invite can see it.",
    icon: LockClosedIcon,
  },
];

function errorsForStep(
  errors: CreateIdeaFieldErrors,
  step: number,
): CreateIdeaFieldErrors {
  const fields = STEP_FIELDS[step] ?? [];
  const picked: CreateIdeaFieldErrors = {};
  for (const [key, message] of Object.entries(errors)) {
    if (
      message &&
      fields.some((field) => key === field || key.startsWith(`${field}.`))
    ) {
      picked[key] = message;
    }
  }
  return picked;
}

function firstInvalidStep(errors: CreateIdeaFieldErrors): number {
  return STEPS.findIndex(
    (_, index) => Object.keys(errorsForStep(errors, index)).length > 0,
  );
}

function fieldStatus(message: string | undefined) {
  return message ? { type: "error" as const, message } : undefined;
}

function ChoiceTile({
  label,
  description,
  icon,
  isSelected,
  onSelect,
}: {
  label: string;
  description: string;
  icon: typeof BuildingOffice2Icon;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <SelectableCard
      label={label}
      isSelected={isSelected}
      onChange={(selected) => {
        if (selected) {
          onSelect();
        }
      }}
      padding={10}
      elevation="low"
      height="100%"
    >
      <VStack gap={4}>
        <Icon icon={icon} size="lg" color="accent" />
        <VStack gap={2}>
          <Heading level={3}>{label}</Heading>
          <Text type="supporting">{description}</Text>
        </VStack>
      </VStack>
    </SelectableCard>
  );
}

export function CreateIdeaDialog({
  isOpen,
  onOpenChange,
  founder,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  founder: IdeaFounder;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState<ReadonlySet<number>>(new Set());
  const [type, setType] = useState<IdeaType | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [invites, setInvites] = useState<Invitee[]>([]);
  const [picker, setPicker] = useState<IdeaPersonHit | null>(null);
  const [serverErrors, setServerErrors] = useState<CreateIdeaFieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const draft: IdeaDraft = {
    type,
    name,
    description,
    isPublic,
    invites: invites.map((person) => ({
      clerkUserId: person.id,
      role: person.role,
    })),
  };

  const clientErrors = validateIdeaDraft(draft);
  const stepErrors = {
    ...(attempted.has(step) ? errorsForStep(clientErrors, step) : {}),
    ...errorsForStep(serverErrors, step),
  };

  const memberSource = useMemo<SearchSource<IdeaPersonHit>>(
    () => ({
      async search(query: string) {
        const hits = await searchIdeaPeople(query);
        const taken = new Set(invites.map((person) => person.id));
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

  function goNext() {
    setAttempted((current) => new Set(current).add(step));
    if (Object.keys(errorsForStep(clientErrors, step)).length > 0) {
      return;
    }
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  }

  function create() {
    const errors = validateIdeaDraft(draft);
    setAttempted(new Set(STEPS.map((_, index) => index)));
    const invalid = firstInvalidStep(errors);
    if (invalid !== -1) {
      setStep(invalid);
      setFormMessage("Fix the highlighted fields.");
      return;
    }

    startSaving(async () => {
      const result = await createIdeaFromStudio(draft);
      if (result.status === "error") {
        setServerErrors(result.fieldErrors);
        setFormMessage(result.message);
        const target = firstInvalidStep(result.fieldErrors);
        if (target !== -1) {
          setStep(target);
        }
        return;
      }
      router.push(ideaPath(result.id));
    });
  }

  function addInvite(hit: IdeaPersonHit) {
    setInvites((current) => {
      if (current.some((person) => person.id === hit.id)) {
        return current;
      }
      return [...current, { ...hit, role: "MEMBER" }];
    });
    setPicker(null);
    clearServer("invites");
  }

  function setInviteRole(id: string, role: string) {
    if (role !== "FOUNDER" && role !== "MEMBER") {
      return;
    }
    setInvites((current) =>
      current.map((person) => (person.id === id ? { ...person, role } : person)),
    );
  }

  const isLastStep = step === STEPS.length - 1;
  const question = STEPS[step]?.question ?? "New idea";

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      purpose="form"
      width={DIALOG_WIDTH}
      maxHeight={DIALOG_SIZE}
      style={{ height: DIALOG_SIZE }}
    >
      <Layout
        height="fill"
        contentWidth={880}
        header={
          <DialogHeader title="New idea" onOpenChange={handleOpenChange} />
        }
        content={
          <LayoutContent>
            <VStack gap={8}>
              {formMessage ? (
                <Banner status="error" title={formMessage} />
              ) : null}
              <Stepper activeStep={step} label="Create an idea">
                {STEPS.map((item, index) => (
                  <Step key={item.label} step={index} label={item.label} />
                ))}
              </Stepper>

              <VStack gap={5}>
                <Heading level={2} accessibilityLevel={3}>
                  {question}
                </Heading>

                {step === 0 ? (
                  <VStack gap={4}>
                    <Grid columns={{ minWidth: 280, max: 2 }} gap={4}>
                      {KIND_OPTIONS.map((option) => (
                        <ChoiceTile
                          key={option.type}
                          label={IDEA_TYPE_LABELS[option.type]}
                          description={option.description}
                          icon={option.icon}
                          isSelected={type === option.type}
                          onSelect={() => {
                            setType(option.type);
                            clearServer("type");
                          }}
                        />
                      ))}
                    </Grid>
                    {stepErrors.type ? (
                      <FieldStatus
                        type="error"
                        variant="detached"
                        message={stepErrors.type}
                      />
                    ) : null}
                  </VStack>
                ) : null}

                {step === 1 ? (
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
                      status={fieldStatus(stepErrors.name)}
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
                      status={fieldStatus(stepErrors.description)}
                    />
                  </FormLayout>
                ) : null}

                {step === 2 ? (
                  <VStack gap={4}>
                    <Grid columns={{ minWidth: 280, max: 2 }} gap={4}>
                      {SHARING_OPTIONS.map((option) => (
                        <ChoiceTile
                          key={option.label}
                          label={option.label}
                          description={option.description}
                          icon={option.icon}
                          isSelected={isPublic === option.isPublic}
                          onSelect={() => {
                            setIsPublic(option.isPublic);
                            clearServer("isPublic");
                          }}
                        />
                      ))}
                    </Grid>
                    {stepErrors.isPublic ? (
                      <FieldStatus
                        type="error"
                        variant="detached"
                        message={stepErrors.isPublic}
                      />
                    ) : null}
                  </VStack>
                ) : null}

                {step === 3 ? (
                  <VStack gap={5}>
                    <Text type="supporting">
                      You start as the founder. Invite other WeStride members
                      if you want them on the team.
                    </Text>
                    <HStack gap={3} vAlign="center">
                      <Avatar
                        name={founder.name}
                        src={founder.imageUrl ?? undefined}
                        size="md"
                        tooltip={false}
                      />
                      <VStack gap={0}>
                        <Text>{founder.name}</Text>
                        <Text type="supporting">
                          {IDEA_ROLE_LABELS.FOUNDER}
                        </Text>
                      </VStack>
                    </HStack>
                    <Divider />
                    <Typeahead
                      label="Invite people"
                      description="Search by name or email. They need a WeStride account."
                      placeholder="Search members"
                      searchSource={memberSource}
                      value={picker}
                      onChange={(item) => {
                        if (item) {
                          addInvite(item);
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
                      status={fieldStatus(stepErrors.invites)}
                    />
                    {invites.length > 0 ? (
                      <VStack gap={4}>
                        {invites.map((person) => (
                          <HStack
                            key={person.id}
                            gap={3}
                            vAlign="center"
                            wrap="wrap"
                          >
                            <Avatar
                              name={person.label}
                              src={person.auxiliaryData.imageUrl ?? undefined}
                              size="md"
                              tooltip={false}
                            />
                            <StackItem size="fill">
                              <VStack gap={0}>
                                <Text>{person.label}</Text>
                                {person.auxiliaryData.detail ? (
                                  <Text type="supporting">
                                    {person.auxiliaryData.detail}
                                  </Text>
                                ) : null}
                              </VStack>
                            </StackItem>
                            <SegmentedControl
                              label={`Role for ${person.label}`}
                              value={person.role}
                              onChange={(role) => setInviteRole(person.id, role)}
                              size="lg"
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
                              label={`Remove ${person.label}`}
                              tooltip="Remove"
                              icon={<Icon icon={TrashIcon} />}
                              variant="ghost"
                              onClick={() => {
                                setInvites((current) =>
                                  current.filter(
                                    (invite) => invite.id !== person.id,
                                  ),
                                );
                                clearServer("invites");
                              }}
                            />
                          </HStack>
                        ))}
                      </VStack>
                    ) : null}
                  </VStack>
                ) : null}
              </VStack>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} vAlign="center">
              <Button
                label="Back"
                variant="secondary"
                isDisabled={step === 0 || isSaving}
                onClick={() => setStep((current) => Math.max(0, current - 1))}
              />
              <StackItem size="fill" />
              <Button
                label={isLastStep ? "Create idea" : "Continue"}
                variant="primary"
                isLoading={isSaving}
                onClick={isLastStep ? create : goNext}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
