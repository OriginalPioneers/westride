/**
 * What the browser and the transcription route agree on. Nothing here is
 * server-only: the recorder imports it to size its clips, and the route
 * imports it to refuse clips the browser should never have sent.
 */

/** Muse Voice Transcribe accepts 16 kHz or 24 kHz; 16 kHz halves the upload. */
export const DICTATION_SAMPLE_RATE = 16_000;

/**
 * One press of the mic button records at most this long. Vercel caps request
 * bodies at 4.5 MB, and two minutes of 16 kHz 16-bit mono is 3.84 MB.
 */
export const MAX_DICTATION_SECONDS = 120;

const WAV_HEADER_BYTES = 44;
const BYTES_PER_SAMPLE = 2;

export const MAX_DICTATION_BYTES =
  WAV_HEADER_BYTES + MAX_DICTATION_SECONDS * DICTATION_SAMPLE_RATE * BYTES_PER_SAMPLE;

/** Vocabulary hints are a short list of names, not a glossary. */
export const MAX_DICTATION_KEYWORDS = 20;
export const MAX_DICTATION_KEYWORD_LENGTH = 60;

export const DICTATION_ROUTE = "/integrations/meta/transcribe";

/** Why dictation is not available to this member right now. */
export type DictationBlocker = "sign-in" | "connect-meta";

export type DictationReadiness = { status: "ready" } | { status: DictationBlocker };

export type DictationResponse =
  | { transcript: string; audioDurationMs: number }
  | { error: string; code: DictationBlocker | null };
