"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import {
  ChatComposer,
  ChatComposerDrawer,
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatMessageMetadata,
  ChatSystemMessage,
} from "@astryxdesign/core/Chat";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Markdown } from "@astryxdesign/core/Markdown";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { Grid } from "@astryxdesign/core/Grid";
import { PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { IdeaFactoryArtifact, IdeaFactoryMessage } from "@westride/db";
import type { AgentDefinition } from "@/lib/idea-factory/agents";
import { formatBytes } from "@/lib/idea-factory/artifacts";
import {
  MAX_UPLOADS_PER_MESSAGE,
  UPLOAD_ACCEPT,
  uploadRejection,
} from "@/lib/idea-factory/uploads";
import type { MemberProfile } from "@/lib/ideas/members";
import { AGENT_ICONS } from "./agent-icons";
import { ArtifactCard, type ArtifactActions } from "./artifact-card";
import { SourceList } from "./evidence";

function AgentAvatar({ agent }: { agent: AgentDefinition }) {
  return <Avatar name={agent.name} size="md" tooltip={false} />;
}

export function AgentThread({
  agent,
  messages,
  artifacts,
  artifactActions,
  busyArtifactIds,
  members,
  isConnected,
  isSending,
  canStoreFiles,
  error,
  onSend,
}: {
  agent: AgentDefinition;
  messages: IdeaFactoryMessage[];
  /** Every file on the idea; the thread shows the ones attached to its messages. */
  artifacts: IdeaFactoryArtifact[];
  artifactActions: ArtifactActions;
  busyArtifactIds: ReadonlySet<string>;
  members: MemberProfile[];
  isConnected: boolean;
  isSending: boolean;
  canStoreFiles: boolean;
  error: string | null;
  onSend: (content: string, files: File[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);

  useEffect(() => {
    setPendingFiles([]);
    setAttachError(null);
  }, [agent.slug]);
  const profiles = new Map(members.map((member) => [member.clerkUserId, member]));
  const attachments = new Map<string, IdeaFactoryArtifact[]>();
  for (const artifact of artifacts) {
    if (artifact.messageId) {
      const list = attachments.get(artifact.messageId) ?? [];
      list.push(artifact);
      attachments.set(artifact.messageId, list);
    }
  }
  const waitingLabel = agent.createsImages
    ? "Drawing and writing…"
    : agent.usesWebSearch
      ? "Researching and writing…"
      : "Thinking…";

  const emptyState = (
    <VStack gap={5} hAlign="center" maxWidth={560}>
      <Icon icon={AGENT_ICONS[agent.icon]} size="lg" color="accent" />
      <VStack gap={2} hAlign="center">
        <Heading level={2} accessibilityLevel={3}>
          {agent.name}
        </Heading>
        <Text type="supporting">{agent.description}</Text>
      </VStack>
      <HStack gap={2} wrap="wrap" hAlign="center">
        {agent.starters.map((starter) => (
          <Button
            key={starter}
            label={starter}
            variant="secondary"
            size="sm"
            isDisabled={!isConnected || isSending}
            onClick={() => onSend(starter, [])}
          />
        ))}
      </HStack>
    </VStack>
  );

  return (
    <ChatLayout
      density="balanced"
      emptyState={emptyState}
      composer={
        <ChatComposer
          key={agent.slug}
          onSubmit={(value) => {
            if (value.trim() || pendingFiles.length > 0) {
              onSend(value, pendingFiles);
              setPendingFiles([]);
              setAttachError(null);
            }
          }}
          placeholder={
            isConnected
              ? pendingFiles.length > 0
                ? `Ask the ${agent.name} about these files…`
                : `Ask the ${agent.name}…`
              : "Connect your Meta account to talk to the team"
          }
          isDisabled={!isConnected || isSending}
          density="balanced"
          status={
            attachError
              ? { type: "error", message: attachError }
              : error
                ? { type: "error", message: error }
                : undefined
          }
          headerActions={
            canStoreFiles ? (
              <>
                <IconButton
                  label="Attach files"
                  tooltip="Attach an image, PDF, or text file"
                  icon={<Icon icon={PaperClipIcon} size="sm" />}
                  variant="ghost"
                  size="sm"
                  isDisabled={!isConnected || isSending}
                  onClick={() => fileInputRef.current?.click()}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={UPLOAD_ACCEPT}
                  multiple
                  hidden
                  onChange={(event) => {
                    const picked = [...(event.target.files ?? [])];
                    event.target.value = "";
                    if (picked.length === 0) {
                      return;
                    }
                    const next = [...pendingFiles, ...picked];
                    if (next.length > MAX_UPLOADS_PER_MESSAGE) {
                      setAttachError(`Attach up to ${MAX_UPLOADS_PER_MESSAGE} files at a time.`);
                      return;
                    }
                    const rejected = next.map(uploadRejection).find(Boolean);
                    if (rejected) {
                      setAttachError(rejected);
                      return;
                    }
                    setAttachError(null);
                    setPendingFiles(next);
                  }}
                />
              </>
            ) : undefined
          }
          drawer={
            pendingFiles.length > 0 ? (
              <ChatComposerDrawer count={pendingFiles.length} label="Attachments">
                <HStack gap={2} wrap="wrap">
                  {pendingFiles.map((file, index) => (
                    <Button
                      key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                      label={`${file.name} · ${formatBytes(file.size)}`}
                      variant="secondary"
                      size="sm"
                      isDisabled={isSending}
                      endContent={<Icon icon={XMarkIcon} size="sm" />}
                      onClick={() => {
                        setPendingFiles((current) => current.filter((_, item) => item !== index));
                      }}
                    />
                  ))}
                </HStack>
              </ChatComposerDrawer>
            ) : undefined
          }
          headerContext={
            agent.createsImages ? (
              <Text type="supporting">
                Can draw logos and mockups; you can attach files too.
              </Text>
            ) : agent.usesWebSearch ? (
              <Text type="supporting">May search the web; attach a file to review it.</Text>
            ) : (
              <Text type="supporting">Works from the idea, your files, and the team&apos;s findings.</Text>
            )
          }
        />
      }
    >
      {messages.length > 0 ? (
        <ChatMessageList density="balanced">
          <ChatSystemMessage variant="divider">
            Shared with everyone on this idea
          </ChatSystemMessage>
          {messages.map((message) => {
            if (message.role === "USER") {
              const profile = message.clerkUserId
                ? profiles.get(message.clerkUserId)
                : undefined;
              const name = profile?.name ?? "Team member";
              const attached = attachments.get(message.id) ?? [];
              return (
                <ChatMessage
                  key={message.id}
                  sender="user"
                  avatar={
                    <Avatar
                      name={name}
                      src={profile?.imageUrl ?? undefined}
                      size="md"
                      tooltip={false}
                    />
                  }
                >
                  <ChatMessageBubble
                    name={name}
                    metadata={
                      <ChatMessageMetadata
                        timestamp={
                          <Timestamp value={message.createdAt.toISOString()} format="auto" />
                        }
                      />
                    }
                  >
                    <VStack gap={3}>
                      {message.content.trim() ? message.content : null}
                      {attached.length > 0 ? (
                        <Grid columns={{ minWidth: 200, max: 3 }} gap={3}>
                          {attached.map((artifact) => (
                            <ArtifactCard
                              key={artifact.id}
                              artifact={artifact}
                              actions={artifactActions}
                              isBusy={busyArtifactIds.has(artifact.id)}
                              compact
                            />
                          ))}
                        </Grid>
                      ) : null}
                    </VStack>
                  </ChatMessageBubble>
                </ChatMessage>
              );
            }
            const attached = attachments.get(message.id) ?? [];
            return (
              <ChatMessage
                key={message.id}
                sender="assistant"
                avatar={<AgentAvatar agent={agent} />}
              >
                <ChatMessageBubble variant="ghost" name={agent.name} width="100%">
                  <VStack gap={4}>
                    {message.content.trim() ? (
                      <Markdown density="compact" headingLevelStart={3} contentWidth="100%">
                        {message.content}
                      </Markdown>
                    ) : null}
                    {attached.length > 0 ? (
                      <Grid columns={{ minWidth: 200, max: 3 }} gap={3}>
                        {attached.map((artifact) => (
                          <ArtifactCard
                            key={artifact.id}
                            artifact={artifact}
                            actions={artifactActions}
                            isBusy={busyArtifactIds.has(artifact.id)}
                            compact
                          />
                        ))}
                      </Grid>
                    ) : null}
                    <SourceList sources={message.sources} />
                  </VStack>
                </ChatMessageBubble>
                <ChatMessageMetadata
                  timestamp={
                    <Timestamp value={message.createdAt.toISOString()} format="auto" />
                  }
                />
              </ChatMessage>
            );
          })}
          {isSending ? (
            <ChatMessage sender="assistant" avatar={<AgentAvatar agent={agent} />}>
              <ChatMessageBubble variant="ghost" name={agent.name}>
                <HStack gap={2} vAlign="center">
                  <Spinner size="sm" aria-label={`${agent.name} is thinking`} />
                  <Text type="supporting">{waitingLabel}</Text>
                </HStack>
              </ChatMessageBubble>
            </ChatMessage>
          ) : null}
        </ChatMessageList>
      ) : null}
    </ChatLayout>
  );
}
