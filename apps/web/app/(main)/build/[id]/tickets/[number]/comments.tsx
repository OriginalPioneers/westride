"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Markdown } from "@astryxdesign/core/Markdown";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { SparklesIcon, TrashIcon } from "@heroicons/react/20/solid";
import { MAX_COMMENT } from "@/lib/build/schema";
import { addCommentAction, deleteCommentAction } from "../../../comment-actions";

export type CommentView = {
  id: string;
  body: string;
  createdAt: string;
  /** Null for comments an agent run left. */
  author: { clerkUserId: string; name: string; imageUrl: string | null } | null;
  isOwn: boolean;
};

export function TicketComments({
  projectId,
  ticketId,
  ticketNumber,
  comments,
  canComment,
}: {
  projectId: string;
  ticketId: string;
  ticketNumber: number;
  comments: CommentView[];
  canComment: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [deleting, setDeleting] = useState<string | null>(null);

  function submit() {
    setMessage(null);
    startSaving(async () => {
      const result = await addCommentAction(projectId, ticketId, { body });
      if (result.status === "error") {
        setMessage(result.fieldErrors.body ?? result.message);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  function remove(commentId: string) {
    setDeleting(commentId);
    startSaving(async () => {
      const result = await deleteCommentAction(projectId, ticketNumber, commentId);
      setDeleting(null);
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <VStack gap={4}>
      {comments.length === 0 ? (
        <Text type="supporting">No comments yet.</Text>
      ) : (
        <VStack gap={5}>
          {comments.map((comment) => (
            <HStack key={comment.id} gap={3} vAlign="start">
              {comment.author ? (
                <Avatar
                  src={comment.author.imageUrl ?? undefined}
                  name={comment.author.name}
                  size="sm"
                  tooltip={false}
                />
              ) : (
                <Badge
                  variant="purple"
                  icon={<Icon icon={SparklesIcon} size="xsm" />}
                  label="Muse"
                />
              )}
              <StackItem size="fill">
                <VStack gap={1}>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <Text type="label">{comment.author?.name ?? "Muse Code"}</Text>
                    <Text type="supporting">
                      <Timestamp value={comment.createdAt} format="auto" />
                    </Text>
                    <StackItem size="fill" />
                    {comment.isOwn ? (
                      <IconButton
                        label="Delete comment"
                        icon={<Icon icon={TrashIcon} size="sm" />}
                        variant="ghost"
                        size="sm"
                        isLoading={deleting === comment.id}
                        onClick={() => remove(comment.id)}
                      />
                    ) : null}
                  </HStack>
                  <Markdown density="compact" headingLevelStart={4} contentWidth="100%">
                    {comment.body}
                  </Markdown>
                </VStack>
              </StackItem>
            </HStack>
          ))}
        </VStack>
      )}
      {canComment ? (
        <VStack gap={2}>
          {message ? <Banner status="error" title={message} /> : null}
          <TextArea
            label="Add a comment"
            isLabelHidden
            placeholder="Leave a note for the team or the next agent run. Markdown is fine."
            value={body}
            onChange={setBody}
            rows={3}
            maxLength={MAX_COMMENT}
          />
          <HStack gap={2}>
            <StackItem size="fill" />
            <Button
              label="Comment"
              variant="primary"
              size="sm"
              isLoading={isSaving && deleting === null}
              isDisabled={body.trim().length === 0}
              onClick={submit}
            />
          </HStack>
        </VStack>
      ) : null}
    </VStack>
  );
}
