"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Divider } from "@astryxdesign/core/Divider";
import { FileInput } from "@astryxdesign/core/FileInput";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { MultiSelector } from "@astryxdesign/core/MultiSelector";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Tokenizer } from "@astryxdesign/core/Tokenizer";
import {
  createStaticSource,
  type SearchableItem,
} from "@astryxdesign/core/Typeahead";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { COUNTRY_OPTIONS } from "@/lib/mentorship/countries";
import { LANGUAGE_OPTIONS } from "@/lib/mentorship/languages";
import { prepareHeadshot } from "@/lib/mentorship/prepare-headshot";
import {
  MAX_BIO_LENGTH,
  MAX_LOCATIONS,
  MAX_SKILLS,
  type MentorProfileDraft,
  type SaveMentorProfileState,
} from "@/lib/mentorship/profile-schema";
import { removeMentorProfile, saveMentorProfile } from "../actions";

type LocationRow = MentorProfileDraft["locations"][number] & { key: string };

type HeadshotChange =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "replace"; file: File; previewUrl: string };

export type MentorProfileFormProps = {
  initial: MentorProfileDraft & { headshotUrl: string | null };
  skillNames: string[];
  isExisting: boolean;
};

const INITIAL_STATE: SaveMentorProfileState = { status: "idle" };

/** Raw uploads may be large. They are shrunk in the browser before sending. */
const MAX_SOURCE_PHOTO_BYTES = 20 * 1024 * 1024;

// crypto.randomUUID is missing outside secure contexts, such as a dev server
// opened by LAN address. These keys only need to be unique on this page.
let nextLocationRowKey = 0;

function newLocationRow(
  location: MentorProfileDraft["locations"][number] = {
    countryCode: "",
    region: "",
    city: "",
  },
): LocationRow {
  nextLocationRowKey += 1;
  return { ...location, key: `location-${nextLocationRowKey}` };
}

function errorStatus(message: string | undefined) {
  return message ? { type: "error" as const, message } : undefined;
}

export function MentorProfileForm({
  initial,
  skillNames,
  isExisting,
}: MentorProfileFormProps) {
  const [state, formAction, isSaving] = useActionState(
    saveMentorProfile,
    INITIAL_STATE,
  );
  const fieldErrors = state.status === "error" ? state.fieldErrors : {};

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [githubUrl, setGithubUrl] = useState(initial.githubUrl);
  const [linkedinUrl, setLinkedinUrl] = useState(initial.linkedinUrl);
  const [facebookUrl, setFacebookUrl] = useState(initial.facebookUrl);
  const [skills, setSkills] = useState<SearchableItem[]>(() =>
    initial.skills.map((name) => ({ id: name, label: name })),
  );
  const [languageCodes, setLanguageCodes] = useState(initial.languageCodes);
  const [isGlobal, setIsGlobal] = useState(initial.isGlobal);
  const [locations, setLocations] = useState<LocationRow[]>(() =>
    initial.locations.length > 0
      ? initial.locations.map((location) => newLocationRow(location))
      : [newLocationRow()],
  );

  const [headshot, setHeadshot] = useState<HeadshotChange>({ kind: "keep" });
  const [pickedPhoto, setPickedPhoto] = useState<File | null>(null);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | undefined>();
  const [isRemoving, setIsRemoving] = useState(false);

  const [skillSource] = useState(() =>
    createStaticSource(skillNames.map((name) => ({ id: name, label: name }))),
  );

  const previewUrl = headshot.kind === "replace" ? headshot.previewUrl : null;
  useEffect(() => {
    if (!previewUrl) {
      return;
    }
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const shownHeadshot =
    headshot.kind === "replace"
      ? headshot.previewUrl
      : headshot.kind === "remove"
        ? undefined
        : (initial.headshotUrl ?? undefined);

  async function handlePhotoPicked(value: File | File[] | null) {
    const file = Array.isArray(value) ? (value[0] ?? null) : value;
    setPickedPhoto(file);
    setPhotoError(undefined);
    if (!file) {
      setHeadshot({ kind: "keep" });
      return;
    }

    setIsPreparingPhoto(true);
    try {
      const prepared = await prepareHeadshot(file);
      setHeadshot({
        kind: "replace",
        file: prepared,
        previewUrl: URL.createObjectURL(prepared),
      });
    } catch {
      setPickedPhoto(null);
      setHeadshot({ kind: "keep" });
      setPhotoError("That photo could not be read. Try a JPEG, PNG, or WebP.");
    } finally {
      setIsPreparingPhoto(false);
    }
  }

  function updateLocation(key: string, patch: Partial<LocationRow>) {
    setLocations((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Rows left completely blank are spare inputs, not locations.
    const filledLocations = locations
      .filter((row) => row.countryCode || row.region.trim() || row.city.trim())
      .map(({ countryCode, region, city }) => ({ countryCode, region, city }));

    const draft: MentorProfileDraft = {
      displayName,
      bio,
      githubUrl,
      linkedinUrl,
      facebookUrl,
      isGlobal,
      skills: skills.map((skill) => skill.label),
      locations: filledLocations,
      languageCodes,
    };

    const formData = new FormData();
    formData.set("profile", JSON.stringify(draft));
    formData.set("headshotAction", headshot.kind);
    if (headshot.kind === "replace") {
      formData.set("headshot", headshot.file);
    }
    startTransition(() => formAction(formData));
  }

  function handleRemoveProfile() {
    if (
      !window.confirm(
        "Remove your mentor profile? Mentees will no longer find you in the directory.",
      )
    ) {
      return;
    }
    setIsRemoving(true);
    startTransition(async () => {
      await removeMentorProfile();
    });
  }

  const skillError =
    fieldErrors.skills ??
    Object.entries(fieldErrors).find(([key]) => key.startsWith("skills."))?.[1];
  const languageError =
    fieldErrors.languageCodes ??
    Object.entries(fieldErrors).find(([key]) =>
      key.startsWith("languageCodes."),
    )?.[1];

  // Server errors index the rows that were sent, which skip blank rows.
  const filledRowKeys = locations
    .filter((row) => row.countryCode || row.region.trim() || row.city.trim())
    .map((row) => row.key);
  const locationError = (key: string, field: string) => {
    const index = filledRowKeys.indexOf(key);
    return index === -1 ? undefined : fieldErrors[`locations.${index}.${field}`];
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <VStack gap={8}>
        {state.status === "error" ? (
          <Banner status="error" title={state.message} />
        ) : null}

        <VStack gap={5}>
          <Heading level={2}>About you</Heading>
          <HStack gap={5} vAlign="center" wrap="wrap">
            <Avatar
              src={shownHeadshot}
              name={displayName || "Your headshot"}
              size="xl"
              tooltip={false}
            />
            <StackItem size="fill">
              <VStack gap={2}>
                <FileInput
                  label="Headshot"
                  description="JPEG, PNG, or WebP. It is cropped to a square."
                  accept="image/jpeg,image/png,image/webp"
                  maxSize={MAX_SOURCE_PHOTO_BYTES}
                  mode="dropzone"
                  value={pickedPhoto}
                  onChange={handlePhotoPicked}
                  isLoading={isPreparingPhoto}
                  isOptional
                  status={errorStatus(photoError ?? fieldErrors.headshot)}
                />
                {shownHeadshot ? (
                  <HStack>
                    <Button
                      label="Remove photo"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPickedPhoto(null);
                        setPhotoError(undefined);
                        setHeadshot(
                          initial.headshotUrl
                            ? { kind: "remove" }
                            : { kind: "keep" },
                        );
                      }}
                    />
                  </HStack>
                ) : null}
              </VStack>
            </StackItem>
          </HStack>

          <TextInput
            label="Name"
            description="How mentees will see you."
            value={displayName}
            onChange={setDisplayName}
            autoComplete="name"
            isRequired
            status={errorStatus(fieldErrors.displayName)}
          />
          <TextArea
            label="About"
            description="A paragraph on your background, what you can help with, and how you like to mentor."
            value={bio}
            onChange={setBio}
            rows={6}
            maxLength={MAX_BIO_LENGTH}
            isRequired
            status={errorStatus(fieldErrors.bio)}
          />
        </VStack>

        <Divider />

        <VStack gap={5}>
          <Heading level={2}>Skills and languages</Heading>
          <Tokenizer
            label="Skills"
            description="Pick from the list, or type a new skill and press Enter to add it."
            placeholder="Search or add skills..."
            searchSource={skillSource}
            value={skills}
            onChange={setSkills}
            hasCreate
            hasEntriesOnFocus
            hasClear
            maxEntries={MAX_SKILLS}
            debounceMs={0}
            isRequired
            status={errorStatus(skillError)}
          />
          <MultiSelector
            label="Languages"
            description="Languages you can mentor in fluently."
            placeholder="Choose languages"
            options={LANGUAGE_OPTIONS}
            value={languageCodes}
            onChange={setLanguageCodes}
            triggerDisplay="labels"
            hasSearch
            searchPlaceholder="Search languages..."
            isRequired
            status={errorStatus(languageError)}
          />
        </VStack>

        <Divider />

        <VStack gap={5}>
          <VStack gap={1}>
            <Heading level={2}>Locations</Heading>
            <Text type="supporting">
              Where you live or can meet mentees in person. State and city are
              optional.
            </Text>
          </VStack>
          <CheckboxInput
            label="I mentor globally"
            description="Mentees anywhere will find you, whatever location they filter by."
            value={isGlobal}
            onChange={setIsGlobal}
          />
          {fieldErrors.locations ? (
            <Banner status="error" title={fieldErrors.locations} />
          ) : null}
          <VStack gap={4}>
            {locations.map((row, index) => (
              <HStack key={row.key} gap={2} vAlign="start">
                <StackItem size="fill">
                  <Grid columns={{ minWidth: 180, max: 3 }} gap={3}>
                    <Selector
                      label="Country"
                      placeholder="Choose a country"
                      options={COUNTRY_OPTIONS}
                      value={row.countryCode || undefined}
                      onChange={(value) =>
                        updateLocation(row.key, { countryCode: value ?? "" })
                      }
                      hasSearch
                      searchPlaceholder="Search countries..."
                      status={errorStatus(locationError(row.key, "countryCode"))}
                    />
                    <TextInput
                      label="State or province"
                      value={row.region}
                      onChange={(value) =>
                        updateLocation(row.key, { region: value })
                      }
                      autoComplete="address-level1"
                      isOptional
                      status={errorStatus(locationError(row.key, "region"))}
                    />
                    <TextInput
                      label="City"
                      value={row.city}
                      onChange={(value) =>
                        updateLocation(row.key, { city: value })
                      }
                      autoComplete="address-level2"
                      isOptional
                      status={errorStatus(locationError(row.key, "city"))}
                    />
                  </Grid>
                </StackItem>
                <IconButton
                  label={`Remove location ${index + 1}`}
                  tooltip="Remove location"
                  icon={<Icon icon={TrashIcon} />}
                  variant="ghost"
                  onClick={() =>
                    setLocations((rows) =>
                      rows.filter((entry) => entry.key !== row.key),
                    )
                  }
                />
              </HStack>
            ))}
          </VStack>
          {locations.length < MAX_LOCATIONS ? (
            <HStack>
              <Button
                label="Add a location"
                icon={<Icon icon={PlusIcon} />}
                onClick={() =>
                  setLocations((rows) => [...rows, newLocationRow()])
                }
              />
            </HStack>
          ) : null}
        </VStack>

        <Divider />

        <VStack gap={5}>
          <VStack gap={1}>
            <Heading level={2}>Links</Heading>
            <Text type="supporting">
              Where mentees can learn more about you and reach out.
            </Text>
          </VStack>
          <TextInput
            label="GitHub"
            placeholder="github.com/yourname"
            value={githubUrl}
            onChange={setGithubUrl}
            isOptional
            status={errorStatus(fieldErrors.githubUrl)}
          />
          <TextInput
            label="LinkedIn"
            placeholder="linkedin.com/in/yourname"
            value={linkedinUrl}
            onChange={setLinkedinUrl}
            isOptional
            status={errorStatus(fieldErrors.linkedinUrl)}
          />
          <TextInput
            label="Facebook"
            placeholder="facebook.com/yourname"
            value={facebookUrl}
            onChange={setFacebookUrl}
            isOptional
            status={errorStatus(fieldErrors.facebookUrl)}
          />
        </VStack>

        <HStack gap={2} hAlign="end" wrap="wrap">
          <Button label="Cancel" variant="ghost" href="/mentorship" />
          <Button
            label={isExisting ? "Save changes" : "Publish mentor profile"}
            variant="primary"
            type="submit"
            isLoading={isSaving}
            isDisabled={isPreparingPhoto || isRemoving}
          />
        </HStack>

        {isExisting ? (
          <>
            <Divider />
            <VStack gap={3}>
              <Heading level={2}>Stop mentoring</Heading>
              <Text type="supporting">
                Removes your profile and photo from the mentor directory. You
                can create a new profile at any time.
              </Text>
              <HStack>
                <Button
                  label="Remove my mentor profile"
                  variant="destructive"
                  onClick={handleRemoveProfile}
                  isLoading={isRemoving}
                  isDisabled={isSaving}
                />
              </HStack>
            </VStack>
          </>
        ) : null}
      </VStack>
    </form>
  );
}
