import { Markdown } from "@astryxdesign/core/Markdown";
import { VStack } from "@astryxdesign/core/Stack";
import type { LessonArtifact } from "@westride/db";
import { LessonArtifactFigure } from "./lesson-artifact";

const ARTIFACT_LINE = /^\[artifact:([a-z0-9-]+)\]$/;

type Block =
  | { type: "markdown"; text: string }
  | { type: "artifact"; key: string };

/**
 * Lesson bodies are Markdown with `[artifact:<key>]` on its own line wherever
 * a piece of media belongs. Split on those lines so each artifact renders as
 * a component between the prose around it.
 */
export function splitLessonContent(content: string): Block[] {
  const blocks: Block[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text) {
      blocks.push({ type: "markdown", text });
    }
    buffer = [];
  };

  for (const line of content.split(/\r?\n/)) {
    const match = ARTIFACT_LINE.exec(line.trim());
    if (match) {
      flush();
      blocks.push({ type: "artifact", key: match[1] });
    } else {
      buffer.push(line);
    }
  }
  flush();
  return blocks;
}

export function LessonContent({
  content,
  artifacts,
  contentWidth = "100%",
}: {
  content: string;
  artifacts: LessonArtifact[];
  contentWidth?: number | string;
}) {
  const byKey = new Map(artifacts.map((artifact) => [artifact.key, artifact]));

  return (
    <VStack gap={6}>
      {splitLessonContent(content).map((block, index) => {
        if (block.type === "markdown") {
          // Lesson sections are written as "##", so "#" → h1 puts them at
          // h2 beneath the page title.
          return (
            <Markdown
              key={index}
              headingLevelStart={1}
              contentWidth={contentWidth}
            >
              {block.text}
            </Markdown>
          );
        }
        const artifact = byKey.get(block.key);
        // A marker without a matching row is a catalog bug the seed already
        // rejects; skip it rather than break the lesson.
        return artifact ? (
          <LessonArtifactFigure key={artifact.id} artifact={artifact} />
        ) : null;
      })}
    </VStack>
  );
}
