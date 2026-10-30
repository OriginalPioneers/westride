"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { completeLesson, uncompleteLesson } from "@westride/db/academy";

export type LessonCompletionResult =
  | { status: "ok"; isComplete: boolean }
  | { status: "error"; message: string };

/** Marks a lesson complete (or not) for the signed-in member. */
export async function setLessonCompletion(
  lessonId: string,
  isComplete: boolean,
): Promise<LessonCompletionResult> {
  if (!z.uuid().safeParse(lessonId).success) {
    return { status: "error", message: "That lesson could not be found." };
  }
  const { userId } = await auth();
  if (!userId) {
    return { status: "error", message: "Sign in to track your progress." };
  }
  try {
    if (isComplete) {
      await completeLesson(userId, lessonId);
    } else {
      await uncompleteLesson(userId, lessonId);
    }
    // Progress shows on the Academy index, the track page, the lesson page
    // and its theater view, all under this path.
    revalidatePath("/academy", "layout");
    return { status: "ok", isComplete };
  } catch {
    return {
      status: "error",
      message: "We couldn't save that change. Please try again.",
    };
  }
}
