"use client";

import { useCallback, useMemo, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { ChatComposer, ChatComposerInput } from "@astryxdesign/core/Chat";
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
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import { insertDictation, VoiceTextArea } from "../voice-text-area";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  Typeahead,
  TypeaheadItem,
  type SearchSource,
} from "@astryxdesign/core/Typeahead";
import {
  ArrowTopRightOnSquareIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  LockClosedIcon,
  MicrophoneIcon,
  SparklesIcon,
  StopIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { IdeaMemberRole, IdeaType } from "@westride/db";
import type { CategoryOption } from "@westride/db/ideas";
import { signInPath } from "@/lib/auth-paths";
import { parseGithubRepoRef } from "@/lib/github/repo-ref";
import {
  MAX_IDEA_DESCRIPTION,
  MAX_IDEA_NAME,
  MAX_IDEA_PROMPT,
  validateIdeaDraft,
  type CreateIdeaFieldErrors,
  type IdeaDraft,
} from "@/lib/ideas/create-schema";
import { IDEA_ROLE_LABELS, IDEA_TYPE_LABELS, ideaPath } from "@/lib/ideas/filters";
import { useDictation } from "@/lib/voice/use-dictation";
import {
  createIdeaFromStudio,
  draftIdeaFromPrompt,
  importIdeaFromGithub,
  searchIdeaPeople,
  type DraftIdeaResult,
  type GithubImportResult,
  type GithubRepoPreview,
  type IdeaPersonHit,
} from "./actions";
import { CategoryPicker } from "./category-picker";

export type IdeaFounder = {
  name: string;
  imageUrl: string | null;
};

type Invitee = IdeaPersonHit & { role: IdeaMemberRole };

/** Step 0 is the composer on the page; the dialog's stepper covers the steps after it. */
const STEPS = [
  { label: "Start", question: "" },
  { label: "Details", question: "Does this look right?" },
  { label: "Sharing", question: "Who can see it?" },
  { label: "Team", question: "Who is building it?" },
] as const;

const STEP_FIELDS = [
  [],
  ["type", "name", "description", "categories", "githubRepoUrl"],
  ["isPublic"],
  ["invites"],
] as const;

// Opened in a new tab so the half-finished idea survives the trip to GitHub.
const CONNECT_GITHUB_HREF = "/integrations/github/connect?returnTo=/settings";
const CHOOSE_REPOS_HREF =
  "/integrations/github/connect?intent=install&returnTo=/settings";
const SETTINGS_HREF = "/settings";
const SIGN_IN_HREF = `${signInPath}?redirect_url=${encodeURIComponent("/ideas")}`;
const COMPOSER_WIDTH = 720;

type ImportNotice = Exclude<GithubImportResult, { status: "imported" }>;
type DraftNotice = Exclude<DraftIdeaResult, { status: "drafted" }>;

function ImportNoticeBanner({ notice }: { notice: ImportNotice }) {
  if (notice.status === "error") {
    return <Banner status="error" title={notice.message} />;
  }
  const isConnect = notice.status === "needs-connection";
  return (
    <Banner
      status="info"
      title={notice.message}
      description={
        isConnect
          ? "Connect GitHub and choose which repositories WeStride can read, then import again."
          : "Add it to the repositories WeStride can read on GitHub, then import again."
      }
      endContent={
        <Button
          label={isConnect ? "Connect GitHub" : "Choose repositories"}
          href={isConnect ? CONNECT_GITHUB_HREF : CHOOSE_REPOS_HREF}
          target="_blank"
          icon={<Icon icon={ArrowTopRightOnSquareIcon} />}
        />
      }
    />
  );
}

function DraftNoticeBanner({ notice }: { notice: DraftNotice }) {
  if (notice.status === "needs-ai") {
    return (
      <Banner
        status="info"
        title="Fill in the details yourself"
        description={`${notice.message} What you wrote is in the description.`}
        endContent={
          <Button
            label="Open Settings"
            href={SETTINGS_HREF}
            target="_blank"
            icon={<Icon icon={ArrowTopRightOnSquareIcon} />}
          />
        }
      />
    );
  }
  return (
    <Banner
      status="warning"
      title="Muse could not draft this idea"
      description={`${notice.message} What you wrote is in the description; fill in the rest below.`}
    />
  );
}

/**
 * Nearly the whole viewport. Dialog clamps a standard surface to the same
 * spacing-4 gutter, which leaves the darkened scrim visible around the edge.
 * The fullscreen variant would cover that scrim.
 */
const DIALOG_SIZE = "calc(100dvh - (2 * var(--spacing-4)))";
const DIALOG_WIDTH = 880;
const composerInput: CSSProperties = { minHeight: "calc(2 * var(--spacing-10))" };

const IDEA_TYPES: IdeaType[] = [
  "BUSINESS",
  "NON_PROFIT",
  "GAME",
  "OPEN_SOURCE",
  "WEBSITE",
  "MOBILE_APP",
];
/** The landing chip for "no kind yet": Muse picks one from the description. */
const EXPLORING = "EXPLORING";

function isIdeaType(value: string | null): value is IdeaType {
  return IDEA_TYPES.some((type) => type === value);
}

/** A pasted repository link, as opposed to a sentence that happens to mention GitHub. */
function looksLikeGithubLink(text: string): boolean {
  return (
    !/\s/.test(text) &&
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/|^git@github\.com:/i.test(text) &&
    parseGithubRepoRef(text) !== null
  );
}

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
  const fields: readonly string[] = STEP_FIELDS[step] ?? [];
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
  icon: typeof GlobeAltIcon;
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

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function ComposerIntro() {
  return (
    <VStack gap={3} hAlign="center">
      <Icon icon={SparklesIcon} size="md" color="accent" />
      <Text type="display-3" as="p" justify="center">
        Every idea starts somewhere.
      </Text>
      <Text type="large" color="secondary" as="p" justify="center">
        What are you thinking about creating?
      </Text>
    </VStack>
  );
}

/**
 * The top of the Idea Workshop: describe an idea (or paste a GitHub link)
 * and Muse drafts it, then a dialog walks through details, sharing, and
 * team. Signed-out visitors are asked to sign in first.
 */
export function IdeaComposer({
  founder,
  categoryOptions,
}: {
  founder: IdeaFounder | null;
  categoryOptions: CategoryOption[];
}) {
  // Cancelling the dialog remounts the composer so the next idea starts clean.
  const [session, setSession] = useState(0);

  if (!founder) {
    return (
      <VStack hAlign="center">
        <VStack gap={6} hAlign="center" maxWidth={COMPOSER_WIDTH} width="100%">
          <ComposerIntro />
          <Button
            label="Sign in to start an idea"
            variant="primary"
            size="lg"
            href={SIGN_IN_HREF}
          />
        </VStack>
      </VStack>
    );
  }

  return (
    <ComposerSession
      key={session}
      founder={founder}
      categoryOptions={categoryOptions}
      onCancel={() => setSession((current) => current + 1)}
    />
  );
}

function ComposerSession({
  founder,
  categoryOptions,
  onCancel,
}: {
  founder: IdeaFounder;
  categoryOptions: CategoryOption[];
  onCancel: () => void;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState<ReadonlySet<number>>(new Set());
  const [type, setType] = useState<IdeaType | null>(null);
  const [isExploring, setIsExploring] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [invites, setInvites] = useState<Invitee[]>([]);
  const [picker, setPicker] = useState<IdeaPersonHit | null>(null);
  const [serverErrors, setServerErrors] = useState<CreateIdeaFieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isGithubMode, setIsGithubMode] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState<DraftNotice | null>(null);
  const [isDrafting, startDrafting] = useTransition();
  const [linkedRepo, setLinkedRepo] = useState<GithubRepoPreview | null>(null);
  const [importNotice, setImportNotice] = useState<ImportNotice | null>(null);
  const [isImporting, startImporting] = useTransition();

  const handleTranscript = useCallback((text: string) => {
    setPrompt((current) => insertDictation(current, text, null).value);
  }, []);
  const dictation = useDictation({ onTranscript: handleTranscript });

  const draft: IdeaDraft = {
    type,
    name,
    description,
    categories,
    isPublic,
    invites: invites.map((person) => ({
      clerkUserId: person.id,
      role: person.role,
    })),
    githubRepoUrl: linkedRepo?.htmlUrl ?? "",
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

  function clearDetailErrors() {
    for (const key of STEP_FIELDS[1]) {
      clearServer(key);
    }
    setAttempted((current) => {
      const next = new Set(current);
      next.delete(1);
      return next;
    });
  }

  function handleOpenChange(next: boolean) {
    if (next || isSaving) {
      return;
    }
    onCancel();
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
      // Land on the idea with the Idea Workshop already open so the work starts right away.
      router.push(`${ideaPath(result.id)}?factory=open`);
    });
  }

  function chooseKind(value: string | null) {
    setIsExploring(value === EXPLORING);
    setType(isIdeaType(value) ? value : null);
    clearServer("type");
  }

  function importRepo(url: string) {
    if (!parseGithubRepoRef(url)) {
      setImportNotice({
        status: "error",
        message: "Paste a GitHub repository link, like https://github.com/owner/repo.",
      });
      return;
    }
    setImportNotice(null);
    startImporting(async () => {
      const result = await importIdeaFromGithub(url, type);
      if (result.status !== "imported") {
        setImportNotice(result);
        return;
      }
      setLinkedRepo(result.repo);
      setName(result.name);
      setDescription(result.description);
      setType((current) => current ?? result.type);
      if (result.categories.length > 0) {
        setCategories(result.categories);
      }
      setPrompt("");
      setIsGithubMode(false);
      setDraftNotice(null);
      clearDetailErrors();
      setStep(1);
    });
  }

  function submitPrompt(value: string) {
    const text = value.trim();
    if (!text || isDrafting || isImporting) {
      return;
    }
    if (isGithubMode || looksLikeGithubLink(text)) {
      importRepo(text);
      return;
    }
    if (text.length > MAX_IDEA_PROMPT) {
      setPromptError(`Keep it under ${MAX_IDEA_PROMPT} characters. You can add more detail on the next step.`);
      return;
    }
    setPromptError(null);
    setImportNotice(null);
    startDrafting(async () => {
      const result = await draftIdeaFromPrompt(text, type);
      if (result.status === "drafted") {
        const { suggestion } = result;
        setName(suggestion.name);
        setDescription(suggestion.description || text);
        setType((current) => current ?? suggestion.type);
        setCategories(suggestion.categories);
        setDraftNotice(null);
      } else {
        setDescription(text.slice(0, MAX_IDEA_DESCRIPTION));
        setDraftNotice(result);
      }
      clearDetailErrors();
      setStep(1);
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

  // Hold the dialog on its first step while it closes back to the composer.
  const dialogStep = Math.max(1, step);
  const isLastStep = dialogStep === STEPS.length - 1;
  const question = STEPS[dialogStep]?.question ?? "New idea";
  const isWorking = isDrafting || isImporting;
  const isListening = dictation.state.phase === "listening";
  const isDictationBusy =
    dictation.state.phase === "starting" ||
    dictation.state.phase === "transcribing";

  const composerError =
    promptError ??
    (dictation.state.phase === "error" ? dictation.state.message : null);

  const footnote = isDrafting
    ? "Muse is drafting a name, description, and categories…"
    : isImporting
      ? "Reading the repository…"
      : isListening
        ? `Listening… ${formatClock(dictation.elapsedSeconds)}`
        : dictation.state.phase === "transcribing"
          ? "Transcribing with Muse…"
          : isGithubMode
            ? "Paste a repository link. Its README fills in the details."
            : "Describe it in your own words, or import a GitHub repository.";

  const composer = (
    <VStack hAlign="center">
      <VStack gap={6} maxWidth={COMPOSER_WIDTH} width="100%">
        <ComposerIntro />

        <HStack gap={2} wrap="wrap" justify="center">
          <ToggleButtonGroup
            label="Kind of idea"
            value={type ?? (isExploring ? EXPLORING : null)}
            onChange={(value) =>
              chooseKind(typeof value === "string" ? value : null)
            }
            size="lg"
            isDisabled={isWorking}
          >
            {IDEA_TYPES.map((option) => (
              <ToggleButton
                key={option}
                value={option}
                label={IDEA_TYPE_LABELS[option]}
              />
            ))}
            <ToggleButton value={EXPLORING} label="Just exploring" />
          </ToggleButtonGroup>
        </HStack>

        <ChatComposer
          value={prompt}
          onChange={(value) => {
            setPrompt(value);
            setPromptError(null);
            setImportNotice(null);
            dictation.dismissError();
          }}
          onSubmit={submitPrompt}
          isDisabled={isWorking}
          placeholder={
            isGithubMode
              ? "https://github.com/owner/repo"
              : "Describe your idea, or ask me anything…"
          }
          input={
            <ChatComposerInput
              label={isGithubMode ? "GitHub repository link" : "Describe your idea"}
              style={composerInput}
              pasteAsToken={false}
              hasHistory={false}
            />
          }
          footerActions={
            <ToggleButton
              label="Import from GitHub"
              icon={<Icon icon={CodeBracketIcon} size="sm" />}
              isPressed={isGithubMode}
              onPressedChange={(pressed) => {
                setIsGithubMode(pressed);
                setImportNotice(null);
              }}
              isDisabled={isWorking}
            />
          }
          sendActions={
            <IconButton
              label={isListening ? "Stop dictating" : "Dictate your idea"}
              tooltip={isListening ? "Stop and transcribe" : "Dictate with your voice"}
              icon={<Icon icon={isListening ? StopIcon : MicrophoneIcon} />}
              variant={isListening ? "primary" : "ghost"}
              isLoading={isDictationBusy}
              isDisabled={isWorking}
              onClick={dictation.toggle}
            />
          }
          status={
            composerError ? { type: "error", message: composerError } : undefined
          }
        />

        {importNotice ? <ImportNoticeBanner notice={importNotice} /> : null}

        <Text type="supporting" as="p" justify="center" aria-live="polite">
          {footnote}
        </Text>
      </VStack>
    </VStack>
  );

  const steps = (
    <Layout
      height="fill"
      contentWidth={720}
      header={
        <DialogHeader title="New idea" onOpenChange={handleOpenChange} />
      }
      content={
        <LayoutContent>
          <VStack gap={8}>
            {formMessage ? (
              <Banner status="error" title={formMessage} />
            ) : null}
            <Stepper activeStep={dialogStep - 1} label="Create an idea">
              {STEPS.slice(1).map((item, index) => (
                <Step key={item.label} step={index} label={item.label} />
              ))}
            </Stepper>

            <VStack gap={5}>
              <Heading level={2} accessibilityLevel={3}>
                {question}
              </Heading>

              {dialogStep === 1 ? (
                <VStack gap={6}>
                  {draftNotice ? <DraftNoticeBanner notice={draftNotice} /> : null}
                  {linkedRepo ? (
                    <Banner
                      status="success"
                      title={`Filled in from ${linkedRepo.fullName}`}
                      description="The idea will link to this repository. Edit anything below before you continue."
                      endContent={
                        <Button
                          label="Unlink"
                          variant="ghost"
                          onClick={() => {
                            setLinkedRepo(null);
                            clearServer("githubRepoUrl");
                          }}
                        />
                      }
                    />
                  ) : null}
                  {stepErrors.githubRepoUrl ? (
                    <FieldStatus
                      type="error"
                      variant="detached"
                      message={stepErrors.githubRepoUrl}
                    />
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
                      status={fieldStatus(stepErrors.name)}
                    />
                    <VoiceTextArea
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
                    <VStack gap={2}>
                      <Text type="label">Kind</Text>
                      <ToggleButtonGroup
                        label="Kind"
                        value={type}
                        onChange={(value) =>
                          chooseKind(typeof value === "string" ? value : null)
                        }
                      >
                        {IDEA_TYPES.map((option) => (
                          <ToggleButton
                            key={option}
                            value={option}
                            label={IDEA_TYPE_LABELS[option]}
                          />
                        ))}
                      </ToggleButtonGroup>
                      {stepErrors.type ? (
                        <FieldStatus
                          type="error"
                          variant="detached"
                          message={stepErrors.type}
                        />
                      ) : null}
                    </VStack>
                    <CategoryPicker
                      options={categoryOptions}
                      value={categories}
                      onChange={(next) => {
                        setCategories(next);
                        clearServer("categories");
                      }}
                      status={fieldStatus(stepErrors.categories)}
                    />
                  </FormLayout>
                </VStack>
              ) : null}

              {dialogStep === 2 ? (
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
                  {linkedRepo?.isPrivate && isPublic ? (
                    <Banner
                      status="warning"
                      title="The imported description will be public"
                      description={`${linkedRepo.fullName} is private on GitHub. Anyone on WeStride can read a Community idea, including what was imported from its README. The repository itself stays private.`}
                    />
                  ) : null}
                </VStack>
              ) : null}

              {dialogStep === 3 ? (
                <VStack gap={5}>
                  <Text type="supporting">
                    You start as the founder. Invite other WeStride members
                    if you want them on the team. You can skip this and
                    invite people later.
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
              label={dialogStep === 1 ? "Start over" : "Back"}
              variant="secondary"
              isDisabled={isSaving}
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
  );

  return (
    <>
      {composer}
      <Dialog
        isOpen={step > 0}
        onOpenChange={handleOpenChange}
        purpose="form"
        width={DIALOG_WIDTH}
        maxHeight={DIALOG_SIZE}
        style={{ height: DIALOG_SIZE }}
      >
        {steps}
      </Dialog>
    </>
  );
}
