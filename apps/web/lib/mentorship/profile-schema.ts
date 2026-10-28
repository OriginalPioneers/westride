import { skillSlug } from "@westride/db";
import { z } from "zod";
import { COUNTRY_CODES } from "./countries";
import { LANGUAGE_CODES } from "./languages";

export const MAX_SKILLS = 20;
export const MAX_LOCATIONS = 10;
export const MAX_BIO_LENGTH = 2000;

/** What the profile form sends. Every field is a raw, unvalidated value. */
export type MentorProfileDraft = {
  displayName: string;
  bio: string;
  githubUrl: string;
  linkedinUrl: string;
  facebookUrl: string;
  isGlobal: boolean;
  skills: string[];
  locations: { countryCode: string; region: string; city: string }[];
  languageCodes: string[];
};

/**
 * Keys are form fields, with array entries addressed by index
 * ("locations.0.countryCode"). "headshot" covers the photo upload.
 */
export type MentorProfileFieldErrors = Partial<Record<string, string>>;

export type SaveMentorProfileState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors: MentorProfileFieldErrors;
    };

function toUrl(value: string): URL | null {
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

function isOnSite(url: URL, hosts: readonly string[]): boolean {
  const hostname = url.hostname.toLowerCase();
  return hosts.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  );
}

/** Accepts "github.com/name" as well as a full URL. Empty means none. */
function profileUrl(site: string, hosts: readonly string[]) {
  return z
    .string()
    .trim()
    .max(300, `Keep the ${site} link under 300 characters.`)
    .refine(
      (value) => {
        if (!value) {
          return true;
        }
        const url = toUrl(value);
        return url !== null && isOnSite(url, hosts) && url.pathname.length > 1;
      },
      { error: `Enter your ${site} profile link, like ${hosts[0]}/yourname.` },
    )
    .transform((value) => {
      const url = value ? toUrl(value) : null;
      if (!url) {
        return null;
      }
      url.protocol = "https:";
      url.hash = "";
      return url.toString();
    });
}

/** Collapses runs of whitespace. "|" is reserved by the location filter. */
function placeName(label: string) {
  return z
    .string()
    .transform((value) => value.replaceAll("|", " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(80, `Keep the ${label} under 80 characters.`))
    .transform((value) => value || null);
}

export const mentorProfileSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "Enter the name mentees will see.")
      .max(80, "Keep your name under 80 characters."),
    bio: z
      .string()
      .trim()
      .min(1, "Tell mentees a little about yourself.")
      .max(
        MAX_BIO_LENGTH,
        `Keep your description under ${MAX_BIO_LENGTH} characters.`,
      ),
    githubUrl: profileUrl("GitHub", ["github.com"]),
    linkedinUrl: profileUrl("LinkedIn", ["linkedin.com"]),
    facebookUrl: profileUrl("Facebook", ["facebook.com", "fb.com"]),
    isGlobal: z.boolean(),
    skills: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(40, "Keep each skill under 40 characters.")
          .refine((name) => skillSlug(name) !== "", {
            error: "Skills need at least one letter or number.",
          }),
      )
      .min(1, "Add at least one skill.")
      .max(MAX_SKILLS, `Add up to ${MAX_SKILLS} skills.`),
    locations: z
      .array(
        z.object({
          countryCode: z.enum(COUNTRY_CODES, { error: "Choose a country." }),
          region: placeName("state or province"),
          city: placeName("city"),
        }),
      )
      .max(MAX_LOCATIONS, `Add up to ${MAX_LOCATIONS} locations.`),
    languageCodes: z
      .array(z.enum(LANGUAGE_CODES, { error: "Choose languages from the list." }))
      .min(1, "Choose at least one language.")
      .max(20, "Choose up to 20 languages."),
  })
  .refine((profile) => profile.isGlobal || profile.locations.length > 0, {
    error: "Add a location, or choose to mentor globally.",
    path: ["locations"],
  });

export type ParsedMentorProfile = z.output<typeof mentorProfileSchema>;

export function fieldErrorsFrom(error: z.ZodError): MentorProfileFieldErrors {
  const fieldErrors: MentorProfileFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}
