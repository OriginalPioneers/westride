import type { IdeaMemberRole, IdeaType } from "@westride/db";
import { z } from "zod";
import { prototypeUrl } from "@westride/db/builder";
import { tagSlug } from "@westride/db/categories";
import {
  MAX_CATEGORY_NAME,
  MAX_IDEA_CATEGORIES,
  MAX_IDEA_DESCRIPTION,
  MAX_IDEA_INVITES,
  MAX_IDEA_MEMBERS,
  MAX_IDEA_NAME,
} from "@westride/db/limits";
import { parseGithubRepoRef } from "@/lib/github/repo-ref";

/** What a member can type into the opening prompt before Muse drafts the idea. */
export const MAX_IDEA_PROMPT = 4000;

export {
  MAX_CATEGORY_NAME,
  MAX_IDEA_CATEGORIES,
  MAX_IDEA_DESCRIPTION,
  MAX_IDEA_INVITES,
  MAX_IDEA_MEMBERS,
  MAX_IDEA_NAME,
};

const ideaTypes = [
  "BUSINESS",
  "NON_PROFIT",
  "GAME",
  "OPEN_SOURCE",
  "WEBSITE",
  "MOBILE_APP",
] as const satisfies readonly IdeaType[];
const ideaRoles = [
  "FOUNDER",
  "MEMBER",
] as const satisfies readonly IdeaMemberRole[];

const inviteSchema = z.object({
  clerkUserId: z.string().trim().min(1).max(128),
  role: z.enum(ideaRoles, { error: "Choose a role." }),
});

const ideaNameSchema = z
  .string()
  .trim()
  .min(1, "Give the idea a name.")
  .max(MAX_IDEA_NAME, `Keep the name under ${MAX_IDEA_NAME} characters.`);

const ideaDescriptionSchema = z
  .string()
  .trim()
  .min(1, "Describe the idea.")
  .max(
    MAX_IDEA_DESCRIPTION,
    `Keep the description under ${MAX_IDEA_DESCRIPTION} characters.`,
  );

/**
 * Category names as typed. Two spellings of one category count once, and
 * names that slug to nothing (punctuation only) are dropped before the
 * minimum is checked.
 */
const categoriesSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(
        MAX_CATEGORY_NAME,
        `Keep each category under ${MAX_CATEGORY_NAME} characters.`,
      ),
  )
  .transform((names) => {
    const bySlug = new Map<string, string>();
    for (const name of names) {
      const slug = tagSlug(name);
      if (slug && !bySlug.has(slug)) {
        bySlug.set(slug, name);
      }
    }
    return [...bySlug.values()];
  })
  .refine((names) => names.length > 0, {
    error: "Pick at least one category.",
  })
  .refine((names) => names.length <= MAX_IDEA_CATEGORIES, {
    error: `Pick up to ${MAX_IDEA_CATEGORIES} categories.`,
  });

function memberListSchema(max: number, maxMessage: string) {
  return z
    .array(inviteSchema)
    .max(max, maxMessage)
    .transform((members) => {
      const byUser = new Map<string, z.output<typeof inviteSchema>>();
      for (const member of members) {
        byUser.set(member.clerkUserId, member);
      }
      return [...byUser.values()];
    });
}

export const createIdeaSchema = z.object({
  type: z.enum(ideaTypes, { error: "Choose a kind of idea." }),
  name: ideaNameSchema,
  description: ideaDescriptionSchema,
  categories: categoriesSchema,
  isPublic: z
    .boolean({ error: "Choose who can see this idea." })
    .nullable()
    .refine((value): value is boolean => value !== null, {
      error: "Choose who can see this idea.",
    }),
  invites: memberListSchema(
    MAX_IDEA_INVITES,
    `Invite up to ${MAX_IDEA_INVITES} people.`,
  ),
  /** The repository the idea was imported from. Empty when started fresh. */
  githubRepoUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (url) => !url || parseGithubRepoRef(url) !== null,
      "Use a GitHub repository link, like https://github.com/owner/repo.",
    )
    .default(""),
});

export const updateIdeaSchema = z
  .object({
    prototypeUrl: z
      .string()
      .trim()
      .max(2048)
      .refine(
        (url) => !url || prototypeUrl(url) !== null,
        "Use a full HTTPS link without a username or password.",
      )
      .default(""),
    prototypeInstructions: z.string().trim().max(600).default(""),
    prototypeTested: z.boolean().default(false),
    name: ideaNameSchema,
    description: ideaDescriptionSchema,
    categories: categoriesSchema,
    members: memberListSchema(
      MAX_IDEA_MEMBERS,
      `An idea can have up to ${MAX_IDEA_MEMBERS} people.`,
    ),
  })
  .refine(
    (value) => !value.prototypeUrl || Boolean(value.prototypeInstructions),
    {
      error: "Describe one thing people can try.",
      path: ["prototypeInstructions"],
    },
  )
  .refine(
    (value) => value.members.some((member) => member.role === "FOUNDER"),
    {
      error: "Keep at least one founder.",
      path: ["members"],
    },
  );

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
  /** Category names as picked or typed. */
  categories: string[];
  isPublic: boolean | null;
  invites: { clerkUserId: string; role: IdeaMemberRole }[];
  githubRepoUrl: string;
};

export function validateIdeaDraft(draft: IdeaDraft): CreateIdeaFieldErrors {
  const parsed = createIdeaSchema.safeParse(draft);
  if (parsed.success) {
    return {};
  }
  return fieldErrorsFrom(parsed.error);
}

/** Draft a founder edits. Membership is the full team after the save. */
export type IdeaEditDraft = {
  prototypeUrl: string;
  prototypeInstructions: string;
  prototypeTested: boolean;
  name: string;
  description: string;
  categories: string[];
  members: { clerkUserId: string; role: IdeaMemberRole }[];
};

export type UpdateIdeaSuccess = {
  status: "saved";
  /** False when the editor left a private idea and can no longer open it. */
  canStillView: boolean;
};

export type UpdateIdeaResult = CreateIdeaFailure | UpdateIdeaSuccess;

export function validateIdeaEdit(draft: IdeaEditDraft): CreateIdeaFieldErrors {
  const parsed = updateIdeaSchema.safeParse(draft);
  if (parsed.success) {
    return {};
  }
  return fieldErrorsFrom(parsed.error);
}
