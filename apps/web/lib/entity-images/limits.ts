/** Edge length of every stored idea, project, and agent image, in pixels. */
export const ENTITY_IMAGE_SIZE = 512;

/** The browser shrinks uploads to 512px first. Server Action bodies are capped at 1 MB. */
export const MAX_ENTITY_IMAGE_BYTES = 900_000;

/** Largest photo the browser will try to shrink. */
export const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;

export const MAX_IMAGE_PROMPT = 1_000;
