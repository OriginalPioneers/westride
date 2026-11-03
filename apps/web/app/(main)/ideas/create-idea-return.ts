import { signInPath } from "@/lib/auth-paths";

/** Query that brings a signed-out visitor back to the home hero with the dialog open. */
const CREATE_IDEA_VALUE = "idea";

const CREATE_IDEA_RETURN_PATH = `/?create=${CREATE_IDEA_VALUE}`;

export const HERO_CREATE_IDEA_SIGN_IN_HREF = `${signInPath}?redirect_url=${encodeURIComponent(CREATE_IDEA_RETURN_PATH)}`;

export function isCreateIdeaReturn(
  value: string | string[] | undefined,
): boolean {
  const first = Array.isArray(value) ? value[0] : value;
  return first === CREATE_IDEA_VALUE;
}
