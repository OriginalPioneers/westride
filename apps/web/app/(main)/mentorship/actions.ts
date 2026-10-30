"use server";

import { auth } from "@clerk/nextjs/server";
import {
  createMentorRequest,
  deleteMentorProfile,
  getMentorProfile,
  getMentorProfileForUser,
  reviewMentorRequest,
  upsertMentorProfile,
} from "@westride/db/mentorship";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteHeadshot,
  HeadshotError,
  uploadHeadshot,
} from "@/lib/mentorship/headshots";
import {
  fieldErrorsFrom,
  mentorProfileSchema,
  type MentorProfileFieldErrors,
  type SaveMentorProfileState,
} from "@/lib/mentorship/profile-schema";
import {
  fieldErrorsFrom as requestFieldErrorsFrom,
  requestFromForm,
  type MentorRequestFieldErrors,
  type SubmitMentorRequestState,
} from "@/lib/mentorship/request-schema";

function failure(
  message: string,
  fieldErrors: MentorProfileFieldErrors = {},
): SaveMentorProfileState {
  return { status: "error", message, fieldErrors };
}

/**
 * Expects `profile` (JSON of MentorProfileDraft) and `headshotAction`
 * ("keep", "replace", or "remove"). "replace" also sends `headshot`.
 */
export async function saveMentorProfile(
  _previous: SaveMentorProfileState,
  formData: FormData,
): Promise<SaveMentorProfileState> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in to save your mentor profile.");
  }

  let draft: unknown;
  try {
    draft = JSON.parse(String(formData.get("profile") ?? ""));
  } catch {
    return failure("The form could not be read. Refresh the page and try again.");
  }

  const parsed = mentorProfileSchema.safeParse(draft);
  if (!parsed.success) {
    return failure("Fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  const profile = parsed.data;

  const existing = await getMentorProfileForUser(userId);
  let headshotUrl = existing?.headshotUrl ?? null;
  let uploadedUrl: string | null = null;

  const headshotAction = formData.get("headshotAction");
  if (headshotAction === "remove") {
    headshotUrl = null;
  } else if (headshotAction === "replace") {
    const file = formData.get("headshot");
    if (!(file instanceof File)) {
      return failure("Fix the highlighted fields.", {
        headshot: "Choose a photo to upload.",
      });
    }
    try {
      uploadedUrl = await uploadHeadshot(file);
    } catch (error) {
      if (error instanceof HeadshotError) {
        return failure("Fix the highlighted fields.", {
          headshot: error.message,
        });
      }
      console.error("Headshot upload failed", error);
      return failure("Your photo could not be uploaded. Try again.", {
        headshot: "Upload failed.",
      });
    }
    headshotUrl = uploadedUrl;
  }

  let saved: Awaited<ReturnType<typeof upsertMentorProfile>>;
  try {
    saved = await upsertMentorProfile(userId, {
      displayName: profile.displayName,
      bio: profile.bio,
      headshotUrl,
      githubUrl: profile.githubUrl,
      linkedinUrl: profile.linkedinUrl,
      facebookUrl: profile.facebookUrl,
      isGlobal: profile.isGlobal,
      skillNames: profile.skills,
      locations: profile.locations,
      languageCodes: profile.languageCodes,
    });
  } catch (error) {
    await deleteHeadshot(uploadedUrl);
    console.error("Mentor profile save failed", error);
    return failure("Your profile could not be saved. Try again.");
  }

  await deleteHeadshot(saved.replacedHeadshotUrl);
  revalidatePath("/mentorship", "layout");
  redirect(`/mentorship/mentors/${saved.id}`);
}

export async function removeMentorProfile(): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Sign in to remove your mentor profile.");
  }

  const removed = await deleteMentorProfile(userId);
  await deleteHeadshot(removed?.headshotUrl ?? null);
  revalidatePath("/mentorship", "layout");
  redirect("/mentorship");
}

const MENTOR_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requestFailure(
  message: string,
  fieldErrors: MentorRequestFieldErrors = {},
): SubmitMentorRequestState {
  return { status: "error", message, fieldErrors };
}

export async function submitMentorRequest(
  mentorId: string,
  _previous: SubmitMentorRequestState,
  formData: FormData,
): Promise<SubmitMentorRequestState> {
  const { userId } = await auth();
  if (!userId) {
    return requestFailure("Sign in to send a request.");
  }
  if (!MENTOR_ID.test(mentorId)) {
    return requestFailure("That mentor is no longer available.");
  }

  const parsed = requestFromForm(formData);
  if (!parsed.success) {
    return requestFailure(
      "Fix the highlighted fields.",
      requestFieldErrorsFrom(parsed.error),
    );
  }

  const mentor = await getMentorProfile(mentorId);
  if (!mentor) {
    return requestFailure("That mentor is no longer available.");
  }
  if (mentor.clerkUserId === userId) {
    return requestFailure("You can't request mentorship from yourself.");
  }

  try {
    await createMentorRequest({
      mentorProfileId: mentor.id,
      requesterClerkUserId: userId,
      ...parsed.data,
    });
  } catch (error) {
    console.error("Mentor request save failed", error);
    return requestFailure("Your request could not be sent. Try again.");
  }

  revalidatePath(`/mentorship/mentors/${mentor.id}`);
  return { status: "success" };
}

export async function markMentorRequestReviewed(
  requestId: string,
): Promise<boolean> {
  const { userId } = await auth();
  if (!userId || !MENTOR_ID.test(requestId)) {
    return false;
  }

  const saved = await reviewMentorRequest(userId, requestId);
  if (saved) {
    const profile = await getMentorProfileForUser(userId);
    if (profile) {
      revalidatePath(`/mentorship/mentors/${profile.id}`);
    }
  }
  return saved;
}
