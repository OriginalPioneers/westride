"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DICTATION_ROUTE,
  MAX_DICTATION_SECONDS,
  type DictationBlocker,
  type DictationReadiness,
  type DictationResponse,
} from "./protocol";
import { isDictationSupported, startRecording, type Recorder } from "./recorder";

/**
 * One take of dictation: press to start, press to stop, text arrives. The
 * microphone starts the moment the member presses, and the check that they
 * can dictate at all (signed in, Meta connected) runs alongside it, so the
 * first word is never lost to a round trip.
 */

export type DictationErrorCode =
  | DictationBlocker
  | "unsupported"
  | "microphone"
  | "silent"
  | "failed";

export type DictationState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "listening"; startedAt: number }
  | { phase: "transcribing" }
  | { phase: "error"; code: DictationErrorCode; message: string };

const BLOCKER_MESSAGES: Record<DictationBlocker, string> = {
  "sign-in": "Sign in to dictate.",
  "connect-meta": "Connect your Meta account to dictate. Transcription is billed to it.",
};

/** Anything quieter than this across a whole take is an unplugged or muted mic. */
const SILENCE_PEAK = 0.01;
const MIN_TAKE_MS = 300;

function microphoneError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Microphone access was blocked. Allow it in your browser's site settings and try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No microphone was found.";
    case "NotReadableError":
      return "The microphone is in use by another app.";
    default:
      return "The microphone could not be started.";
  }
}

export function useDictation({
  onTranscript,
  keywords,
}: {
  onTranscript: (text: string) => void;
  /** Names and terms Muse should expect, so they come back spelled right. */
  keywords?: string[];
}) {
  const [state, setState] = useState<DictationState>({ phase: "idle" });
  // Ticks while listening; the elapsed time is derived from it.
  const [now, setNow] = useState(0);
  const recorderRef = useRef<Recorder | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const keywordsRef = useRef(keywords);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    keywordsRef.current = keywords;
  });

  const fail = useCallback((code: DictationErrorCode, message: string) => {
    setState({ phase: "error", code, message });
  }, []);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) {
      return;
    }
    recorderRef.current = null;
    setState({ phase: "transcribing" });

    let recording;
    try {
      recording = await recorder.stop();
    } catch {
      fail("microphone", "The recording could not be read. Try again.");
      return;
    }
    if (recording.durationMs < MIN_TAKE_MS || recording.peakLevel < SILENCE_PEAK) {
      fail("silent", "Nothing was heard. Check that your microphone is working and try again.");
      return;
    }

    const form = new FormData();
    form.append("audio", recording.wav, "dictation.wav");
    const hints = keywordsRef.current?.filter((word) => word.trim());
    if (hints?.length) {
      form.append("keywords", JSON.stringify(hints));
    }

    let body: DictationResponse | null = null;
    try {
      const response = await fetch(DICTATION_ROUTE, { method: "POST", body: form });
      body = (await response.json().catch(() => null)) as DictationResponse | null;
      if (!response.ok || !body || "error" in body) {
        const code = body && "error" in body ? body.code : null;
        fail(code ?? "failed", body && "error" in body ? body.error : "Transcription failed. Try again.");
        return;
      }
    } catch {
      fail("failed", "WeStride could not be reached. Check your connection and try again.");
      return;
    }

    if (!body.transcript) {
      fail("silent", "Muse did not catch any words. Try again, a little closer to the microphone.");
      return;
    }
    onTranscriptRef.current(body.transcript);
    setState({ phase: "idle" });
  }, [fail]);

  const start = useCallback(async () => {
    if (!isDictationSupported()) {
      fail("unsupported", "This browser cannot record audio. Try a current Chrome, Edge, Firefox, or Safari.");
      return;
    }
    setState({ phase: "starting" });

    // If the check itself fails, the transcription request will say why.
    const readiness: Promise<DictationReadiness> = fetch(DICTATION_ROUTE, {
      method: "GET",
      headers: { Accept: "application/json" },
    })
      .then((response) => response.json() as Promise<DictationReadiness>)
      .catch(() => ({ status: "ready" }) as DictationReadiness);

    let recorder: Recorder;
    try {
      recorder = await startRecording();
    } catch (error) {
      fail("microphone", microphoneError(error));
      return;
    }

    const ready = await readiness;
    if (ready.status !== "ready") {
      recorder.cancel();
      fail(ready.status, BLOCKER_MESSAGES[ready.status]);
      return;
    }
    recorderRef.current = recorder;
    setState({ phase: "listening", startedAt: Date.now() });
  }, [fail]);

  // Count up while listening, and stop on the member's behalf at the cap.
  useEffect(() => {
    if (state.phase !== "listening") {
      return;
    }
    const startedAt = state.startedAt;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current - startedAt >= MAX_DICTATION_SECONDS * 1000) {
        void stop();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [state, stop]);

  const elapsedSeconds =
    state.phase === "listening"
      ? Math.max(0, Math.floor((now - state.startedAt) / 1000))
      : 0;

  // Leaving the page mid-take releases the microphone.
  useEffect(
    () => () => {
      recorderRef.current?.cancel();
      recorderRef.current = null;
    },
    [],
  );

  const toggle = useCallback(() => {
    switch (state.phase) {
      case "listening":
        void stop();
        return;
      case "idle":
      case "error":
        void start();
        return;
      default:
        return;
    }
  }, [state.phase, start, stop]);

  const dismissError = useCallback(() => {
    setState((current) => (current.phase === "error" ? { phase: "idle" } : current));
  }, []);

  return { state, elapsedSeconds, toggle, dismissError };
}
