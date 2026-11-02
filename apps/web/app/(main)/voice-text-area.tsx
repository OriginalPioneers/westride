"use client";

import { useCallback, useEffect, useRef } from "react";
import { FieldStatus } from "@astryxdesign/core/FieldStatus";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea, type TextAreaProps } from "@astryxdesign/core/TextArea";
import { MicrophoneIcon, StopIcon } from "@heroicons/react/24/outline";
import { signInPath } from "@/lib/auth-paths";
import { MAX_DICTATION_SECONDS } from "@/lib/voice/protocol";
import { useDictation, type DictationErrorCode } from "@/lib/voice/use-dictation";

/**
 * TextArea with a microphone. One press records, the next press sends the
 * take to Muse Voice Transcribe, and the words land where the caret was.
 * A drop-in for TextArea wherever members write more than a line.
 */

export type VoiceTextAreaProps = Omit<TextAreaProps, "onChange" | "ref"> & {
  onChange: (value: string) => void;
  /** Names and terms Muse should expect, so they come back spelled right. */
  keywords?: string[];
};

type Caret = { start: number; end: number; value: string };

/** Splices dictated text in at the caret with a space on whichever sides need one. */
export function insertDictation(
  value: string,
  text: string,
  caret: Pick<Caret, "start" | "end"> | null,
): { value: string; caret: number } {
  const clean = text.trim();
  if (!clean) {
    return { value, caret: value.length };
  }
  const start = Math.min(caret?.start ?? value.length, value.length);
  const end = Math.min(Math.max(caret?.end ?? value.length, start), value.length);
  const before = value.slice(0, start);
  const after = value.slice(end);
  const lead = before && !/\s$/.test(before) ? " " : "";
  const trail = after && !/^\s/.test(after) ? " " : "";
  const inserted = `${lead}${clean}${trail}`;
  return { value: before + inserted + after, caret: before.length + inserted.length };
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const SETTINGS_PATH = "/settings";

function ErrorAction({ code }: { code: DictationErrorCode }) {
  switch (code) {
    case "sign-in":
      return <Link href={signInPath}>Sign in</Link>;
    case "connect-meta":
      return <Link href={SETTINGS_PATH}>Open Settings</Link>;
    default:
      return null;
  }
}

export function VoiceTextArea({
  value,
  onChange,
  keywords,
  isDisabled,
  isReadOnly,
  width,
  ...rest
}: VoiceTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  // Where the caret was when the take ended, so the text goes there.
  const caretRef = useRef<Caret | null>(null);
  // Where to put the caret once the dictated value has rendered.
  const restoreCaretRef = useRef<number | null>(null);

  const handleTranscript = useCallback(
    (text: string) => {
      const current = valueRef.current;
      const caret = caretRef.current;
      caretRef.current = null;
      // If the member kept typing while Muse worked, append rather than guess.
      const target = caret && caret.value === current ? caret : null;
      const next = insertDictation(current, text, target);
      restoreCaretRef.current = next.caret;
      onChange(next.value);
    },
    [onChange],
  );

  const { state, elapsedSeconds, toggle, dismissError } = useDictation({
    onTranscript: handleTranscript,
    keywords,
  });

  useEffect(() => {
    const position = restoreCaretRef.current;
    const element = textareaRef.current;
    if (position === null || !element || element.value !== value) {
      return;
    }
    restoreCaretRef.current = null;
    element.focus();
    element.setSelectionRange(position, position);
  }, [value]);

  const handleMicClick = () => {
    if (state.phase === "listening") {
      const element = textareaRef.current;
      caretRef.current = element
        ? { start: element.selectionStart, end: element.selectionEnd, value: element.value }
        : null;
    }
    toggle();
  };

  const isListening = state.phase === "listening";
  const isBusy = state.phase === "starting" || state.phase === "transcribing";
  const statusText =
    state.phase === "starting"
      ? "Starting the microphone…"
      : state.phase === "listening"
        ? `Listening… ${formatClock(elapsedSeconds)} of ${formatClock(MAX_DICTATION_SECONDS)}`
        : state.phase === "transcribing"
          ? "Transcribing with Muse…"
          : null;

  return (
    <VStack gap={1} hAlign="stretch" width={width}>
      <TextArea
        {...rest}
        ref={textareaRef}
        value={value}
        onChange={(next) => {
          if (state.phase === "error") {
            dismissError();
          }
          onChange(next);
        }}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly}
      />
      <HStack gap={2} vAlign="center">
        <StackItem size="fill">
          {state.phase === "error" ? (
            <HStack gap={2} vAlign="center" wrap="wrap">
              <FieldStatus type="error" variant="detached" message={state.message} />
              <ErrorAction code={state.code} />
            </HStack>
          ) : statusText ? (
            <Text type="supporting" size="sm" aria-live="polite">
              {statusText}
            </Text>
          ) : null}
        </StackItem>
        <IconButton
          label={isListening ? "Stop dictating" : `Dictate ${rest.label}`}
          tooltip={isListening ? "Stop and transcribe" : "Dictate with your voice"}
          icon={<Icon icon={isListening ? StopIcon : MicrophoneIcon} />}
          variant={isListening ? "primary" : "ghost"}
          size="sm"
          isLoading={isBusy}
          isDisabled={isDisabled || isReadOnly}
          onClick={handleMicClick}
        />
      </HStack>
    </VStack>
  );
}
