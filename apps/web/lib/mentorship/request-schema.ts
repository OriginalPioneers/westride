import { z } from "zod";

export const MAX_REQUEST_NAME = 80;
export const MAX_REQUEST_EMAIL = 200;
export const MAX_REQUEST_COMPANY = 120;
export const MAX_REQUEST_ROLE = 80;
export const MAX_REQUEST_PHONE = 40;
export const MAX_REQUEST_DETAILS = 2000;

export const INQUIRY_REASONS = [
  "Career guidance",
  "Technical review",
  "Product feedback",
  "Starting out",
  "Partnership",
  "General question",
  "Other",
] as const;

export const START_TIMES = [
  "This week",
  "This month",
  "In a few months",
  "Not sure yet",
] as const;

export type MentorRequestFieldErrors = Partial<Record<string, string>>;

export type SubmitMentorRequestState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      message: string;
      fieldErrors: MentorRequestFieldErrors;
    };

function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `Keep the ${label} under ${max} characters.`)
    .transform((value) => value || null);
}

function optionalChoice(options: readonly string[], label: string) {
  return z
    .string()
    .trim()
    .refine((value) => value === "" || options.includes(value), {
      error: `Choose a ${label} from the list.`,
    })
    .transform((value) => value || null);
}

export const mentorRequestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(MAX_REQUEST_NAME, `Keep your name under ${MAX_REQUEST_NAME} characters.`),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email.")
    .max(
      MAX_REQUEST_EMAIL,
      `Keep your email under ${MAX_REQUEST_EMAIL} characters.`,
    )
    .pipe(z.email({ error: "Enter a valid email address." })),
  company: optionalText(MAX_REQUEST_COMPANY, "company or project"),
  jobTitle: optionalText(MAX_REQUEST_ROLE, "role"),
  phone: optionalText(MAX_REQUEST_PHONE, "phone number"),
  inquiryReason: optionalChoice(INQUIRY_REASONS, "topic"),
  timing: optionalChoice(START_TIMES, "start time"),
  details: z
    .string()
    .trim()
    .min(1, "Tell them how they can help.")
    .max(
      MAX_REQUEST_DETAILS,
      `Keep your note under ${MAX_REQUEST_DETAILS} characters.`,
    ),
});

export type ParsedMentorRequest = z.output<typeof mentorRequestSchema>;

export function fieldErrorsFrom(error: z.ZodError): MentorRequestFieldErrors {
  const fieldErrors: MentorRequestFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

function formString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export function requestFromForm(formData: FormData) {
  return mentorRequestSchema.safeParse({
    fullName: formString(formData.get("fullName")),
    email: formString(formData.get("email")),
    company: formString(formData.get("company")),
    jobTitle: formString(formData.get("jobTitle")),
    phone: formString(formData.get("phone")),
    inquiryReason: formString(formData.get("inquiryReason")),
    timing: formString(formData.get("timing")),
    details: formString(formData.get("details")),
  });
}
