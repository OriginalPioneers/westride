import { z } from "zod";
import { MAX_CAPITAL_LINKS } from "@westride/db/support";
import { fieldErrorsFrom, uuidSchema, type FieldErrors } from "@/lib/build/schema";

export { MAX_CAPITAL_LINKS, fieldErrorsFrom };
export type { FieldErrors };

export const MAX_PLEDGE_NOTE = 500;
export const MAX_LINK_LABEL = 60;
/** A monthly or one-time cap, in whole dollars. Keeps a typo from pledging a fortune. */
export const MAX_CAP_DOLLARS = 10_000;
export const MICROS_PER_DOLLAR = 1_000_000;

export const wePledgePath = (kind?: "tokens" | "compute" | "capital") =>
  kind ? `/wepledge?kind=${kind}` : "/wepledge";
// ---------------------------------------------------------------------------
// Pledges
// ---------------------------------------------------------------------------

export const tokenPledgeSchema = z.object({
  ideaId: uuidSchema,
  /** Whole dollars; null means no cap. */
  capDollars: z
    .union([z.number().min(1, "Pledge at least $1.").max(MAX_CAP_DOLLARS, `Keep the cap under $${MAX_CAP_DOLLARS.toLocaleString()}.`), z.null()])
    .default(null),
  resetsMonthly: z.boolean().default(true),
  note: z.string().trim().max(MAX_PLEDGE_NOTE, `Keep the note under ${MAX_PLEDGE_NOTE} characters.`).default(""),
});
export type TokenPledgeInput = z.output<typeof tokenPledgeSchema>;

export const computePledgeSchema = z.object({
  ideaId: uuidSchema,
  note: z.string().trim().max(MAX_PLEDGE_NOTE, `Keep the note under ${MAX_PLEDGE_NOTE} characters.`).default(""),
});

export type TokenPledgeDraft = {
  capDollars: number | null;
  resetsMonthly: boolean;
  note: string;
};

export function validateTokenPledge(ideaId: string, draft: TokenPledgeDraft): FieldErrors {
  const parsed = tokenPledgeSchema.safeParse({ ideaId, ...draft });
  return parsed.success ? {} : fieldErrorsFrom(parsed.error);
}

export function dollarsToMicros(dollars: number | null): number | null {
  return dollars === null ? null : Math.round(dollars * MICROS_PER_DOLLAR);
}

export function formatMicros(micros: number): string {
  const dollars = micros / MICROS_PER_DOLLAR;
  if (dollars >= 100) return `$${Math.round(dollars).toLocaleString()}`;
  if (dollars >= 1) return `$${dollars.toFixed(2)}`;
  if (micros === 0) return "$0";
  return `$${dollars.toFixed(dollars >= 0.01 ? 2 : 4)}`;
}

export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 120) return `${minutes} min`;
  const hours = seconds / 3600;
  return `${hours.toFixed(hours >= 10 ? 0 : 1)} h`;
}

// ---------------------------------------------------------------------------
// Idea support settings (founder)
// ---------------------------------------------------------------------------

export const capitalLinkUrlSchema = z
  .string()
  .trim()
  .min(1, "Add a link.")
  .max(500, "Keep the link under 500 characters.")
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname.includes(".");
    } catch {
      return false;
    }
  }, "Use a full https:// link.");

export const capitalLinkSchema = z.object({
  url: capitalLinkUrlSchema,
  label: z.string().trim().max(MAX_LINK_LABEL, `Keep the label under ${MAX_LINK_LABEL} characters.`).default(""),
});

export const supportSettingsSchema = z
  .object({
    wantsTokens: z.boolean(),
    wantsCompute: z.boolean(),
    wantsCapital: z.boolean(),
    capitalLinks: z.array(capitalLinkSchema).max(MAX_CAPITAL_LINKS, `List up to ${MAX_CAPITAL_LINKS} links.`),
  })
  .superRefine((value, ctx) => {
    if (value.wantsCapital && value.capitalLinks.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Add at least one link where people can contribute, or turn off capital.",
        path: ["capitalLinks"],
      });
    }
    const seen = new Set<string>();
    value.capitalLinks.forEach((link, index) => {
      const key = link.url.toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({ code: "custom", message: "That link is already listed.", path: ["capitalLinks", index, "url"] });
      }
      seen.add(key);
    });
  });
export type SupportSettingsInput = z.output<typeof supportSettingsSchema>;

export type SupportSettingsDraft = {
  wantsTokens: boolean;
  wantsCompute: boolean;
  wantsCapital: boolean;
  capitalLinks: { url: string; label: string }[];
};

export function validateSupportSettings(draft: SupportSettingsDraft): FieldErrors {
  const parsed = supportSettingsSchema.safeParse(draft);
  return parsed.success ? {} : fieldErrorsFrom(parsed.error);
}

/** The part of a link people should recognise before they click. */
export function linkHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export const MAX_DEVICE_NAME = 80;

export const renameDeviceSchema = z.object({
  deviceId: uuidSchema,
  name: z.string().trim().min(1, "Give the computer a name.").max(MAX_DEVICE_NAME),
});
