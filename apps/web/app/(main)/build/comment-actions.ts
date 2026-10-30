"use server";

import { getTicketById } from "@westride/db/build";
import { addTicketComment, deleteOwnTicketComment } from "@westride/db/build-agents";
import { failure, isFailure, requireProjectMember, type Failure } from "@/lib/build/access";
import { ticketPath } from "@/lib/build/labels";
import { commentSchema, fieldErrorsFrom, uuidSchema } from "@/lib/build/schema";
import { revalidatePath } from "next/cache";

export async function addCommentAction(
  projectId: string,
  ticketId: string,
  input: unknown,
): Promise<{ status: "ok" } | Failure> {
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the comment.", fieldErrorsFrom(parsed.error));
  }
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  if (!uuidSchema.safeParse(ticketId).success) {
    return failure("That ticket does not exist.");
  }
  const ticket = await getTicketById(ticketId);
  if (!ticket || ticket.projectId !== projectId) {
    return failure("That ticket does not exist.");
  }
  try {
    await addTicketComment({
      ticketId,
      authorClerkUserId: context.userId,
      body: parsed.data.body,
    });
    revalidatePath(ticketPath(projectId, ticket.number));
    return { status: "ok" };
  } catch (error) {
    console.error("Comment save failed", error);
    return failure("The comment could not be saved. Try again.");
  }
}

export async function deleteCommentAction(
  projectId: string,
  ticketNumber: number,
  commentId: string,
): Promise<{ status: "ok" } | Failure> {
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  if (!uuidSchema.safeParse(commentId).success) {
    return failure("That comment does not exist.");
  }
  const removed = await deleteOwnTicketComment(commentId, context.userId);
  if (!removed) {
    return failure("You can only delete your own comments.");
  }
  revalidatePath(ticketPath(projectId, ticketNumber));
  return { status: "ok" };
}
