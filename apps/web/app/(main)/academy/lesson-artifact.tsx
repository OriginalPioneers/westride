"use client";

import Image from "next/image";
import { AspectRatio } from "@astryxdesign/core/AspectRatio";
import { Card } from "@astryxdesign/core/Card";
import { Icon } from "@astryxdesign/core/Icon";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import {
  ChartBarSquareIcon,
  PhotoIcon,
  SpeakerWaveIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import type { LessonArtifact, LessonArtifactKind } from "@westride/db";

const KIND_LABEL: Record<LessonArtifactKind, string> = {
  IMAGE: "Illustration",
  VIDEO: "Video",
  AUDIO: "Audio",
  DIAGRAM: "Diagram",
};

const KIND_ICON: Record<LessonArtifactKind, typeof PhotoIcon> = {
  IMAGE: PhotoIcon,
  VIDEO: VideoCameraIcon,
  AUDIO: SpeakerWaveIcon,
  DIAGRAM: ChartBarSquareIcon,
};

function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/**
 * A lesson's media. Until the asset is generated the row has no URL and we
 * show a placeholder describing what will go there, so the lesson reads
 * correctly today and the real media drops in later without a UI change.
 */
export function LessonArtifactFigure({
  artifact,
}: {
  artifact: LessonArtifact;
}) {
  if (artifact.url) {
    return <ArtifactMedia artifact={artifact} url={artifact.url} />;
  }

  const details = [KIND_LABEL[artifact.kind]];
  if (artifact.durationSeconds) {
    details.push(formatSeconds(artifact.durationSeconds));
  }
  details.push("Coming soon");

  const Glyph = KIND_ICON[artifact.kind];

  return (
    <AspectRatio ratio={artifact.kind === "AUDIO" ? 16 / 5 : 16 / 9}>
      <Card variant="muted" height="100%" padding={6}>
        <VStack gap={2} hAlign="center" vAlign="center" height="100%">
          <Icon icon={Glyph} size="lg" color="secondary" label="" />
          <Text weight="semibold" justify="center" textWrap="balance">
            {artifact.title}
          </Text>
          <Text type="supporting" justify="center">
            {details.join(" · ")}
          </Text>
          <Text type="supporting" justify="center" maxLines={3} textWrap="pretty">
            {artifact.brief}
          </Text>
        </VStack>
      </Card>
    </AspectRatio>
  );
}

function ArtifactMedia({
  artifact,
  url,
}: {
  artifact: LessonArtifact;
  url: string;
}) {
  switch (artifact.kind) {
    case "VIDEO":
      return (
        <VStack gap={2}>
          <AspectRatio ratio={16 / 9} fit="cover">
            <video controls preload="metadata" src={url} title={artifact.title} />
          </AspectRatio>
          <Text type="supporting">{artifact.title}</Text>
        </VStack>
      );
    case "AUDIO":
      return (
        <VStack gap={2}>
          <audio controls preload="metadata" src={url} title={artifact.title} />
          <Text type="supporting">{artifact.title}</Text>
        </VStack>
      );
    case "IMAGE":
    case "DIAGRAM":
      return (
        <VStack gap={2}>
          <AspectRatio ratio={16 / 9} fit="contain">
            <Image
              src={url}
              alt={artifact.brief}
              fill
              unoptimized
              sizes="(max-width: 800px) 100vw, 800px"
            />
          </AspectRatio>
          <Text type="supporting">{artifact.title}</Text>
        </VStack>
      );
  }
}
