"use client";

import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import {
  ChatComposer,
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatMessageMetadata,
  ChatSystemMessage,
} from "@astryxdesign/core/Chat";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Markdown } from "@astryxdesign/core/Markdown";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { IdeaFactoryMessage } from "@westride/db";
import type { AgentDefinition } from "@/lib/idea-factory/agents";
import type { MemberProfile } from "@/lib/ideas/members";
import { AGENT_ICONS } from "./agent-icons";
import { SourceList } from "./evidence";

function AgentAvatar({ agent }: { agent: AgentDefinition }) {
  return <Avatar name={agent.name} size="md" tooltip={false} />;
}

export function AgentThread({
  agent,
  messages,
  members,
  isConnected,
  isSending,
  error,
  onSend,
}: {
  agent: AgentDefinition;
  messages: IdeaFactoryMessage[];
  members: MemberProfile[];
  isConnected: boolean;
  isSending: boolean;
  error: string | null;
  onSend: (content: string) => void;
}) {
  const profiles = new Map(members.map((member) => [member.clerkUserId, member]));

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
            onClick={() => onSend(starter)}
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
            if (value.trim()) {
              onSend(value);
            }
          }}
          placeholder={
            isConnected
              ? `Ask the ${agent.name}…`
              : "Connect your Meta account to talk to the team"
          }
          isDisabled={!isConnected || isSending}
          density="balanced"
          status={error ? { type: "error", message: error } : undefined}
          headerContext={
            agent.usesWebSearch ? (
              <Text type="supporting">May search the web; sources are cited.</Text>
            ) : (
              <Text type="supporting">Works from the idea and the team&apos;s findings.</Text>
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
                    {message.content}
                  </ChatMessageBubble>
                </ChatMessage>
              );
            }
            return (
              <ChatMessage
                key={message.id}
                sender="assistant"
                avatar={<AgentAvatar agent={agent} />}
              >
                <ChatMessageBubble variant="ghost" name={agent.name} width="100%">
                  <VStack gap={4}>
                    <Markdown density="compact" headingLevelStart={3} contentWidth="100%">
                      {message.content}
                    </Markdown>
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
                  <Text type="supporting">
                    {agent.usesWebSearch ? "Researching and writing…" : "Thinking…"}
                  </Text>
                </HStack>
              </ChatMessageBubble>
            </ChatMessage>
          ) : null}
        </ChatMessageList>
      ) : null}
    </ChatLayout>
  );
}
