import type { IdeaMemberRole, IdeaType } from "@westride/db";
import { z } from "zod";

export const MAX_IDEA_NAME = 120;
export const MAX_IDEA_DESCRIPTION = 8000;
export const MAX_IDEA_INVITES = 20;

const ideaTypes = ["BUSINESS", "NON_PROFIT"] as const satisfies readonly IdeaType[];
const ideaRoles = ["FOUNDER", "MEMBER"] as const satisfies readonly IdeaMemberRole[];

const inviteSchema = z.object({
  clerkUserId: z.string().trim().min(1).max(128),
  role: z.enum(ideaRoles, { error: "Choose a role." }),
});

export const createIdeaSchema = z.object({
  type: z.enum(ideaTypes, { error: "Choose Business or Non-profit." }),
  name: z
    .string()
    .trim()
    .min(1, "Give the idea a name.")
    .max(MAX_IDEA_NAME, `Keep the name under ${MAX_IDEA_NAME} characters.`),
  description: z
    .string()
    .trim()
    .min(1, "Describe the idea.")
    .max(
      MAX_IDEA_DESCRIPTION,
      `Keep the description under ${MAX_IDEA_DESCRIPTION} characters.`,
    ),
  isPublic: z
    .boolean({ error: "Choose who can see this idea." })
    .nullable()
    .refine((value): value is boolean => value !== null, {
      error: "Choose who can see this idea.",
    }),
  invites: z
    .array(inviteSchema)
    .max(MAX_IDEA_INVITES, `Invite up to ${MAX_IDEA_INVITES} people.`)
    .transform((invites) => {
      const byUser = new Map<string, z.output<typeof inviteSchema>>();
      for (const invite of invites) {
        byUser.set(invite.clerkUserId, invite);
      }
      return [...byUser.values()];
    }),
});

export type CreateIdeaInput = z.output<typeof createIdeaSchema>;

export type CreateIdeaFieldErrors = Partial<Record<string, string>>;

export type CreateIdeaFailure = {
  status: "error";
  message: string;
  fieldErrors: CreateIdeaFieldErrors;
};

export type CreateIdeaSuccess = {
  status: "created";
  id: string;
};

export type CreateIdeaResult = CreateIdeaFailure | CreateIdeaSuccess;

export function fieldErrorsFrom(error: z.ZodError): CreateIdeaFieldErrors {
  const fieldErrors: CreateIdeaFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

/** Draft the wizard holds. `null` means the person has not chosen yet. */
export type IdeaDraft = {
  type: IdeaType | null;
  name: string;
  description: string;
  isPublic: boolean | null;
  invites: { clerkUserId: string; role: IdeaMemberRole }[];
};

export function validateIdeaDraft(draft: IdeaDraft): CreateIdeaFieldErrors {
  const parsed = createIdeaSchema.safeParse(draft);
  if (parsed.success) {
    return {};
  }
  return fieldErrorsFrom(parsed.error);
}
