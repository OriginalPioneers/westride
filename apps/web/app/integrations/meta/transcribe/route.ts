import { randomUUID } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { settleMuseUsage } from "@/lib/cloud/billing";
import { resolveMuseAccess, type MuseAccess } from "@/lib/cloud/provider";
import { transcribeMuseAudio } from "@/lib/idea-factory/muse";
import { MUSE_TRANSCRIBE_MODEL } from "@/lib/idea-factory/pricing";
import {
  MAX_DICTATION_BYTES,
  MAX_DICTATION_KEYWORD_LENGTH,
  MAX_DICTATION_KEYWORDS,
  type DictationBlocker,
  type DictationReadiness,
  type DictationResponse,
} from "@/lib/voice/protocol";

/**
 * Voice entry for text fields. The browser records one take as a WAV clip
 * and posts it here; WeStride forwards it to Muse Voice Transcribe with the
 * member's own Meta key, or WeStride Cloud's when they use that, and returns
 * the text. The key never leaves the server, which is why the browser does
 * not talk to Meta directly.
 */

export const maxDuration = 60;

const keywordsSchema = z
  .array(z.string().trim().min(1).max(MAX_DICTATION_KEYWORD_LENGTH))
  .max(MAX_DICTATION_KEYWORDS);

function json(status: number, body: DictationReadiness | DictationResponse) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

function blocked(code: DictationBlocker) {
  const message =
    code === "sign-in"
      ? "Sign in to dictate."
      : "Connect your Meta account in Settings, or add funds to WeStride Cloud, to dictate. Muse Voice Transcribe is billed per hour of audio.";
  return json(code === "sign-in" ? 401 : 412, { error: message, code });
}

type Member =
  | { blocker: DictationBlocker }
  | { blocker: null; userId: string; access: MuseAccess };

/** Who is dictating and with which key, or why they cannot right now. */
async function member(): Promise<Member> {
  const { userId } = await auth();
  if (!userId) {
    return { blocker: "sign-in" };
  }
  const resolved = await resolveMuseAccess(userId).catch(() => null);
  if (!resolved?.ok) {
    return { blocker: "connect-meta" };
  }
  return { blocker: null, userId, access: resolved.access };
}

/** Checked by the browser while the microphone warms up. */
export async function GET() {
  const who = await member();
  return json(200, { status: who.blocker ?? "ready" });
}

/** The 44-byte header every clip the recorder makes starts with. */
function looksLikeWav(header: Uint8Array): boolean {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...header.subarray(start, end));
  return header.length >= 44 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE";
}

export async function POST(request: NextRequest) {
  const who = await member();
  if (who.blocker) {
    return blocked(who.blocker);
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_DICTATION_BYTES * 1.1) {
    return json(413, { error: "That recording is too long for one take.", code: null });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { error: "Send the recording as multipart form data.", code: null });
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return json(400, { error: "No recording was attached.", code: null });
  }
  if (audio.size > MAX_DICTATION_BYTES) {
    return json(413, { error: "That recording is too long for one take.", code: null });
  }
  if (!looksLikeWav(new Uint8Array(await audio.slice(0, 44).arrayBuffer()))) {
    return json(400, { error: "That recording is not a WAV clip.", code: null });
  }

  let keywords: string[] | undefined;
  const rawKeywords = form.get("keywords");
  if (typeof rawKeywords === "string" && rawKeywords) {
    try {
      keywords = keywordsSchema.parse(JSON.parse(rawKeywords));
    } catch {
      return json(400, { error: "Bad vocabulary hints.", code: null });
    }
  }

  const result = await transcribeMuseAudio({ apiKey: who.access.apiKey, audio, keywords });
  if (!result.ok) {
    if (result.status === 401) {
      return blocked("connect-meta");
    }
    console.error("Dictation failed", { status: result.status, error: result.error });
    return json(result.status === 429 ? 429 : 502, { error: result.error, code: null });
  }
  // Dictation is not logged to muse_requests, so it settles under its own reference.
  await settleMuseUsage(who.access, {
    reference: `transcribe:${randomUUID()}`,
    model: MUSE_TRANSCRIBE_MODEL.id,
    purpose: "dictation",
    estimatedCostMicros: result.estimatedCostMicros,
  });
  return json(200, { transcript: result.transcript, audioDurationMs: result.audioDurationMs });
}
