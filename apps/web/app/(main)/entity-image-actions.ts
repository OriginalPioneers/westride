"use server";

import { createHash } from "node:crypto";
import { ENTITY_IMAGE_KINDS, setEntityImage } from "@westride/db/entity-images";
import { logMuseRequest } from "@westride/db/idea-factory";
import { z } from "zod";
import { failure, isFailure, type Failure } from "@/lib/build/access";
import { requireImageEditor, revalidateEntity, type ImageEditorContext } from "@/lib/entity-images/access";
import { MAX_ENTITY_IMAGE_BYTES, MAX_IMAGE_PROMPT } from "@/lib/entity-images/limits";
import { IMAGE_PROMPT_SCHEMA, buildImagePromptRequest } from "@/lib/entity-images/prompt";
import {
  EntityImageError,
  deleteEntityImage,
  normalizeEntityImage,
  storeEntityImage,
} from "@/lib/entity-images/storage";
import { callMuse, generateMuseImage, parseJsonOutput, type MuseAttempt } from "@/lib/idea-factory/muse";
import { DEFAULT_MUSE_MODEL, MUSE_IMAGE_MODEL } from "@/lib/idea-factory/pricing";
import { getMuseApiKey } from "@/lib/meta/connection";

// Muse Image can take a minute or more. The pages that call these actions
// export `maxDuration`, since a "use server" file cannot.

const targetSchema = z.object({
  kind: z.enum(ENTITY_IMAGE_KINDS),
  id: z.string(),
});

const generateSchema = targetSchema.extend({
  prompt: z.string().trim().min(1, "Describe the image first.").max(MAX_IMAGE_PROMPT),
});

const suggestSchema = targetSchema.extend({
  draft: z.string().trim().max(MAX_IMAGE_PROMPT),
});

async function museKeyFor(userId: string): Promise<string | Failure> {
  try {
    const apiKey = await getMuseApiKey(userId);
    if (apiKey) {
      return apiKey;
    }
  } catch (error) {
    console.error("Meta key lookup failed", error);
    return failure("Your Meta key could not be refreshed. Try again in a moment.");
  }
  return {
    ...failure("Connect your Meta account in Settings to create images with Muse."),
    needsConnection: true,
  };
}

async function record(
  context: ImageEditorContext,
  purpose: "image" | "image-prompt",
  model: string,
  attempt: MuseAttempt,
): Promise<void> {
  try {
    await logMuseRequest({
      ideaId: context.kind === "idea" ? context.id : null,
      projectId: context.kind === "project" ? context.id : null,
      agentId: context.kind === "agent" ? context.id : null,
      clerkUserId: context.userId,
      agentSlug: null,
      purpose,
      model,
      endpoint: attempt.endpoint,
      requestBody: attempt.requestBody,
      responseBody: attempt.responseBody,
      statusCode: attempt.statusCode,
      inputTokens: attempt.usage.inputTokens,
      cachedTokens: attempt.usage.cachedTokens,
      outputTokens: attempt.usage.outputTokens,
      reasoningTokens: attempt.usage.reasoningTokens,
      totalTokens: attempt.usage.totalTokens,
      webSearchCalls: attempt.usage.webSearchCalls,
      estimatedCostMicros: attempt.usage.estimatedCostMicros,
      durationMs: attempt.durationMs,
      rateLimitRemainingTokens: attempt.rateLimit.remainingTokens,
      rateLimitRemainingRequests: attempt.rateLimit.remainingRequests,
      error: attempt.error,
    });
  } catch (error) {
    console.error("Muse request log failed", error);
  }
}

/** Swaps the stored image and removes the file it replaced. */
async function saveImage(context: ImageEditorContext, imageUrl: string | null): Promise<boolean> {
  const saved = await setEntityImage(context.kind, context.id, imageUrl);
  if (!saved) {
    return false;
  }
  await deleteEntityImage(saved.previousUrl);
  revalidateEntity(context.kind, context.id);
  return true;
}

export type SaveImageResult = { status: "ok"; imageUrl: string | null } | Failure;

/**
 * Expects `kind`, `id`, and `image`. The browser shrinks the picture first;
 * the server still crops and scales it to exactly 512×512.
 */
export async function uploadEntityImageAction(formData: FormData): Promise<SaveImageResult> {
  const target = targetSchema.safeParse({ kind: formData.get("kind"), id: formData.get("id") });
  if (!target.success) {
    return failure("That image has nowhere to go.");
  }
  const context = await requireImageEditor(target.data.kind, target.data.id);
  if (isFailure(context)) {
    return context;
  }
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return failure("Choose an image to upload.", { image: "Choose an image to upload." });
  }
  if (file.size > MAX_ENTITY_IMAGE_BYTES) {
    return failure("That image is too large. Choose a smaller one.", {
      image: "That image is too large. Choose a smaller one.",
    });
  }

  let imageUrl: string;
  try {
    const image = await normalizeEntityImage(Buffer.from(await file.arrayBuffer()));
    imageUrl = await storeEntityImage(context.kind, image);
  } catch (error) {
    if (error instanceof EntityImageError) {
      return failure(error.message, { image: error.message });
    }
    console.error("Entity image upload failed", error);
    return failure("The image could not be saved. Try again.");
  }

  try {
    if (!(await saveImage(context, imageUrl))) {
      await deleteEntityImage(imageUrl);
      return failure("That no longer exists.");
    }
  } catch (error) {
    console.error("Entity image save failed", error);
    await deleteEntityImage(imageUrl);
    return failure("The image could not be saved. Try again.");
  }
  return { status: "ok", imageUrl };
}

export async function removeEntityImageAction(input: unknown): Promise<SaveImageResult> {
  const target = targetSchema.safeParse(input);
  if (!target.success) {
    return failure("That image has nowhere to go.");
  }
  const context = await requireImageEditor(target.data.kind, target.data.id);
  if (isFailure(context)) {
    return context;
  }
  try {
    await saveImage(context, null);
  } catch (error) {
    console.error("Entity image removal failed", error);
    return failure("The image could not be removed. Try again.");
  }
  return { status: "ok", imageUrl: null };
}

export type GenerateImageResult =
  | {
      status: "ok";
      /** A 512×512 WebP data URL. Nothing is saved until the member keeps it. */
      preview: string;
    }
  | Failure;

/** Draws one image with Muse Image on the member's own Meta key. */
export async function generateEntityImageAction(input: unknown): Promise<GenerateImageResult> {
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Describe the image first.");
  }
  const context = await requireImageEditor(parsed.data.kind, parsed.data.id);
  if (isFailure(context)) {
    return context;
  }
  const apiKey = await museKeyFor(context.userId);
  if (isFailure(apiKey)) {
    return apiKey;
  }

  const result = await generateMuseImage({
    apiKey,
    model: MUSE_IMAGE_MODEL.id,
    prompt: parsed.data.prompt,
    size: "1024x1024",
    user: createHash("sha256").update(context.userId).digest("hex"),
    costPerImageMicros: MUSE_IMAGE_MODEL.perImageMicros,
  });
  await record(context, "image", MUSE_IMAGE_MODEL.id, result.attempt);
  if (!result.image) {
    return failure(result.attempt.error ?? "Muse did not return an image. Try again.");
  }

  try {
    const image = await normalizeEntityImage(result.image);
    return { status: "ok", preview: `data:image/webp;base64,${image.toString("base64")}` };
  } catch (error) {
    console.error("Generated image could not be processed", error);
    return failure("Muse's image could not be read. Try again.");
  }
}

export type SuggestPromptResult = { status: "ok"; prompt: string } | Failure;

/** Asks Muse to write, or sharpen, an image prompt from the entity's own words. */
export async function suggestEntityImagePromptAction(input: unknown): Promise<SuggestPromptResult> {
  const parsed = suggestSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Shorten your description and try again.");
  }
  const context = await requireImageEditor(parsed.data.kind, parsed.data.id);
  if (isFailure(context)) {
    return context;
  }
  const apiKey = await museKeyFor(context.userId);
  if (isFailure(apiKey)) {
    return apiKey;
  }

  const request = buildImagePromptRequest({
    kind: context.kind,
    name: context.name,
    description: context.description,
    draft: parsed.data.draft,
  });
  const result = await callMuse({
    apiKey,
    model: DEFAULT_MUSE_MODEL,
    instructions: request.instructions,
    input: request.input,
    webSearch: false,
    jsonFormat: { name: "image_prompt", schema: IMAGE_PROMPT_SCHEMA },
    reasoningEffort: "low",
    maxOutputTokens: 800,
    timeoutMs: 60_000,
  });
  await record(context, "image-prompt", DEFAULT_MUSE_MODEL, result.attempt);

  const prompt = parseJsonOutput<{ prompt?: unknown }>(result.text)?.prompt;
  if (typeof prompt !== "string" || !prompt.trim()) {
    return failure(result.attempt.error ?? "Muse could not write a prompt. Try again.");
  }
  return { status: "ok", prompt: prompt.trim().slice(0, MAX_IMAGE_PROMPT) };
}
