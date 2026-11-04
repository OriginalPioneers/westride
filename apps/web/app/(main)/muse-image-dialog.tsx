"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { AspectRatio } from "@astryxdesign/core/AspectRatio";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { ChatComposer } from "@astryxdesign/core/Chat";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import {
  CameraIcon,
  CubeIcon,
  PaintBrushIcon,
  SparklesIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import type { EntityImageKind } from "@westride/db/entity-images";
import { ENTITY_IMAGE_SIZE, MAX_IMAGE_PROMPT } from "@/lib/entity-images/limits";
import { MUSE_IMAGE_MODEL } from "@/lib/idea-factory/pricing";
import { generateEntityImageAction, suggestEntityImagePromptAction } from "./entity-image-actions";

const DIALOG_HEIGHT = "calc(100dvh - (2 * var(--spacing-4)))";
// Fill the dialog so the greeting and composer stay vertically centered.
const pageStyle = { minHeight: "100%" };
const categoriesStyle = { paddingInline: "var(--spacing-3)" };

const KIND_NOUNS: Record<EntityImageKind, string> = {
  idea: "idea",
  project: "project",
  agent: "agent",
};

type Suggestion = { heading: string; body: string; prompt: string };

// Style filters, each with starting prompts written around the entity's name.
const STYLES = [
  { key: "illustration", label: "Illustration", icon: PaintBrushIcon },
  { key: "3d", label: "3D", icon: CubeIcon },
  { key: "photo", label: "Photo", icon: CameraIcon },
  { key: "pixel", label: "Pixel art", icon: Squares2X2Icon },
] as const;

type StyleKey = (typeof STYLES)[number]["key"];

function suggestionsFor(style: StyleKey, name: string): Suggestion[] {
  const subject = `“${name}”`;
  switch (style) {
    case "illustration":
      return [
        {
          heading: "Flat app icon",
          body: "One bold symbol on a soft gradient",
          prompt: `A flat vector app icon for ${subject}: one bold symbol at the center, simple geometric shapes, a soft two-color gradient background, no text.`,
        },
        {
          heading: "Friendly mascot",
          body: "A character that embodies it",
          prompt: `A friendly cartoon mascot that represents ${subject}, centered, expressive face, clean outlines, bright cheerful colors, plain light background, no text.`,
        },
      ];
    case "3d":
      return [
        {
          heading: "Clay render",
          body: "Soft, tactile, and playful",
          prompt: `A soft 3D clay render of a single object that symbolizes ${subject}, rounded forms, pastel colors, gentle studio lighting, plain background, no text.`,
        },
        {
          heading: "Glossy emblem",
          body: "Polished and dramatic",
          prompt: `A glossy 3D emblem representing ${subject}, centered, smooth reflective materials, dramatic rim lighting, dark gradient background, no text.`,
        },
      ];
    case "photo":
      return [
        {
          heading: "Studio still life",
          body: "One object on a clean backdrop",
          prompt: `A studio photograph of one object that captures the spirit of ${subject}, centered on a seamless colored backdrop, soft shadows, shallow depth of field.`,
        },
        {
          heading: "Cinematic scene",
          body: "Golden light and rich color",
          prompt: `A cinematic photo that captures ${subject}, one clear subject, golden-hour light, rich color, simple uncluttered background.`,
        },
      ];
    case "pixel":
      return [
        {
          heading: "Pixel badge",
          body: "A crisp 16-bit icon",
          prompt: `A 16-bit pixel art badge representing ${subject}, one centered icon, limited bright palette, crisp pixels, dark background, no text.`,
        },
        {
          heading: "Isometric diorama",
          body: "A tiny world on a floating tile",
          prompt: `A tiny isometric pixel art diorama about ${subject}, one small scene on a floating tile, cheerful colors, plain background.`,
        },
      ];
  }
}

type Step = { kind: "compose" } | { kind: "painting"; prompt: string } | { kind: "result"; prompt: string; preview: string };

export function MuseImageDialog({
  isOpen,
  onOpenChange,
  kind,
  id,
  name,
  hasMetaConnection,
  onKeep,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  kind: EntityImageKind;
  id: string;
  name: string;
  hasMetaConnection: boolean;
  /** Saves the chosen 512×512 data URL. Resolves to an error message, or null when saved. */
  onKeep: (preview: string) => Promise<string | null>;
}) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<StyleKey | null>(null);
  const [step, setStep] = useState<Step>({ kind: "compose" });
  const [error, setError] = useState<string | null>(null);
  const [needsConnection, setNeedsConnection] = useState(!hasMetaConnection);
  const [isSuggesting, startSuggesting] = useTransition();
  const [isKeeping, startKeeping] = useTransition();

  const isWorking = step.kind === "painting" || isSuggesting || isKeeping;
  const suggestions = style ? suggestionsFor(style, name) : null;
  const noun = KIND_NOUNS[kind];

  function handleOpenChange(next: boolean) {
    if (!next && isWorking) {
      return;
    }
    onOpenChange(next);
  }

  async function paint(value: string) {
    const text = value.trim();
    if (!text) {
      setError("Describe the image first, or ask Muse to write it.");
      return;
    }
    if (text.length > MAX_IMAGE_PROMPT) {
      setError(`Keep the description under ${MAX_IMAGE_PROMPT.toLocaleString()} characters.`);
      return;
    }
    setError(null);
    setStep({ kind: "painting", prompt: text });
    try {
      const result = await generateEntityImageAction({ kind, id, prompt: text });
      if (result.status === "error") {
        setError(result.message);
        setNeedsConnection(Boolean(result.needsConnection));
        setStep({ kind: "compose" });
        return;
      }
      setStep({ kind: "result", prompt: text, preview: result.preview });
    } catch (caught) {
      console.error("Muse image failed", caught);
      setError("Muse could not be reached. Try again.");
      setStep({ kind: "compose" });
    }
  }

  function suggest() {
    setError(null);
    startSuggesting(async () => {
      try {
        const result = await suggestEntityImagePromptAction({ kind, id, draft: prompt });
        if (result.status === "error") {
          setError(result.message);
          setNeedsConnection(Boolean(result.needsConnection));
          return;
        }
        setPrompt(result.prompt);
      } catch (caught) {
        console.error("Muse prompt help failed", caught);
        setError("Muse could not be reached. Try again.");
      }
    });
  }

  function keep(preview: string) {
    setError(null);
    startKeeping(async () => {
      const message = await onKeep(preview);
      if (message) {
        setError(message);
        return;
      }
      setStep({ kind: "compose" });
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      purpose="form"
      width={760}
      maxHeight={DIALOG_HEIGHT}
    >
      <Layout
        height="fill"
        padding={6}
        header={<DialogHeader title="Create an image with Muse" hasDivider onOpenChange={handleOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={8} vAlign="center" style={pageStyle}>
              {/* Greeting */}
              <VStack gap={1}>
                <HStack gap={2} vAlign="center">
                  <Icon icon={SparklesIcon} size="md" color="accent" />
                  <Text type="large" as="h2">
                    Create with Muse
                  </Text>
                </HStack>
                <Text type="display-2" as="h1">
                  {step.kind === "result" ? "How does this look?" : `Let’s picture your ${noun}`}
                </Text>
                <Text type="supporting">
                  {step.kind === "result"
                    ? `Keep it as the image for ${name}, or try again.`
                    : `Describe an image for ${name}, pick a starting point, or let Muse write the description.`}
                </Text>
              </VStack>

              {needsConnection ? (
                <Banner
                  status="info"
                  title="Connect your Meta account first"
                  description="Muse runs on your own Meta API key. Connect it in Settings and come back here."
                  collapsible={false}
                >
                  <Button label="Open settings" href="/settings" variant="secondary" />
                </Banner>
              ) : null}

              {step.kind === "compose" ? (
                <>
                  {/* Composer */}
                  <ChatComposer
                    value={prompt}
                    onChange={setPrompt}
                    onSubmit={paint}
                    isDisabled={needsConnection || isSuggesting}
                    placeholder="Describe the image you want…"
                    status={error ? { type: "error", message: error } : undefined}
                    footerActions={
                      <HStack gap={2} vAlign="center" wrap="wrap">
                        <Button
                          label={prompt.trim() ? "Improve with Muse" : "Write it with Muse"}
                          variant="ghost"
                          size="sm"
                          icon={<Icon icon={SparklesIcon} size="sm" />}
                          isLoading={isSuggesting}
                          isDisabled={needsConnection}
                          onClick={suggest}
                        />
                        <Text type="supporting" size="xsm">
                          {MUSE_IMAGE_MODEL.label} · 512 × 512 · $0.01 per image
                        </Text>
                      </HStack>
                    }
                  />

                  {/* Style filters + suggestion cards */}
                  <VStack gap={6} style={categoriesStyle}>
                    <ToggleButtonGroup
                      label="Style"
                      value={style}
                      onChange={(value) => setStyle(typeof value === "string" ? (value as StyleKey) : null)}
                      size="lg"
                    >
                      {STYLES.map((option) => (
                        <ToggleButton
                          key={option.key}
                          value={option.key}
                          label={option.label}
                          icon={<Icon icon={option.icon} size="sm" />}
                        />
                      ))}
                    </ToggleButtonGroup>

                    {suggestions ? (
                      <Grid columns={{ minWidth: 280 }} gap={3}>
                        {suggestions.map((suggestion) => (
                          <ClickableCard
                            key={suggestion.heading}
                            label={suggestion.heading}
                            variant="muted"
                            padding={3}
                            isDisabled={isSuggesting}
                            onClick={() => {
                              setError(null);
                              setPrompt(suggestion.prompt);
                            }}
                          >
                            <VStack gap={0.5}>
                              <Heading level={4}>{suggestion.heading}</Heading>
                              <Text type="body" color="secondary" size="xsm">
                                {suggestion.body}
                              </Text>
                            </VStack>
                          </ClickableCard>
                        ))}
                      </Grid>
                    ) : null}
                  </VStack>
                </>
              ) : (
                <Grid columns={{ minWidth: 240, max: 2 }} gap={6} align="center">
                  <AspectRatio ratio={1} fit="cover">
                    {step.kind === "result" ? (
                      <Image
                        src={step.preview}
                        alt={`Muse's image for ${name}`}
                        width={ENTITY_IMAGE_SIZE}
                        height={ENTITY_IMAGE_SIZE}
                        unoptimized
                      />
                    ) : (
                      <Skeleton radius={3} />
                    )}
                  </AspectRatio>
                  <VStack gap={4}>
                    {step.kind === "painting" ? (
                      <Spinner size="lg" label="Muse is painting your image. This can take a minute." />
                    ) : null}
                    {error ? <Banner status="error" title={error} /> : null}
                    <VStack gap={1}>
                      <Text type="label">Description</Text>
                      <Text type="supporting">{step.prompt}</Text>
                    </VStack>
                    {step.kind === "result" ? (
                      <VStack gap={2} hAlign="start">
                        <Button
                          label="Use this image"
                          variant="primary"
                          isLoading={isKeeping}
                          onClick={() => keep(step.preview)}
                        />
                        <HStack gap={2} wrap="wrap">
                          <Button
                            label="Try again"
                            variant="secondary"
                            isDisabled={isKeeping}
                            onClick={() => paint(step.prompt)}
                          />
                          <Button
                            label="Change the description"
                            variant="ghost"
                            isDisabled={isKeeping}
                            onClick={() => {
                              setError(null);
                              setPrompt(step.prompt);
                              setStep({ kind: "compose" });
                            }}
                          />
                        </HStack>
                        <Text type="supporting" size="xsm">
                          Each try is billed to your Meta account. Nothing changes until you choose to use an image.
                        </Text>
                      </VStack>
                    ) : null}
                  </VStack>
                </Grid>
              )}
            </VStack>
          </LayoutContent>
        }
      />
    </Dialog>
  );
}
