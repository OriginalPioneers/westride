// ---------------------------------------------------------------------------
// WeStride Cloud
//
// Members who do not have a Meta account or a Vercel account of their own
// can fund a WeStride balance and use WeStride's shared Meta key and Modal
// compute instead. The balance is a ledger: top-ups through Stripe and
// redeemed codes add to it, every metered Muse call and sandbox second
// takes from it. The balance itself is never stored; it is the sum of the
// ledger, so concurrent writes cannot drift it.
//
// Every ledger entry carries a unique `reference` so a retried webhook, a
// re-run settlement, or a double-click never charges or credits twice.
// ---------------------------------------------------------------------------
import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Which provider the member wants used when both are available. OWN means
 * their connected Meta and Vercel accounts; WESTRIDE_CLOUD means the shared
 * key and Modal compute, billed to their balance. Either way, work falls
 * back to whichever one is actually available.
 */
export const cloudProviderPreference = pgEnum("cloud_provider_preference", [
  "OWN",
  "WESTRIDE_CLOUD",
]);

/**
 * TOP_UP: paid through Stripe. CODE: a redeemed code. AI_USAGE: a metered
 * Muse call or run. COMPUTE_USAGE: sandbox time on Modal. ADJUSTMENT: a
 * manual correction by the WeStride team.
 */
export const cloudLedgerKind = pgEnum("cloud_ledger_kind", [
  "TOP_UP",
  "CODE",
  "AI_USAGE",
  "COMPUTE_USAGE",
  "ADJUSTMENT",
]);

export const cloudAccounts = pgTable("cloud_accounts", {
  /** Clerk user id. One WeStride Cloud account per member. */
  clerkUserId: text("clerk_user_id").primaryKey(),
  providerPreference: cloudProviderPreference("provider_preference").notNull().default("OWN"),
  /** Stripe's customer id, once the member has paid at least once. */
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const cloudLedgerEntries = pgTable(
  "cloud_ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    kind: cloudLedgerKind("kind").notNull(),
    /** USD in millionths. Positive adds to the balance, negative spends it. */
    amountMicros: bigint("amount_micros", { mode: "number" }).notNull(),
    /**
     * What this entry settles, unique so it can only be written once:
     * `stripe:<checkout session id>`, `code:<code id>:<clerk user id>`,
     * `muse:<muse request id>`, `job:<agent job id>`, `job-compute:<id>`,
     * `run:<agent run id>`, `run-compute:<id>`, `adjustment:<anything>`.
     */
    reference: text("reference").notNull(),
    /** One line shown in the member's ledger. */
    description: text("description").notNull(),
    /** Muse model id for AI usage. */
    model: text("model"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    /** Billed sandbox time and size, for compute usage. */
    computeSeconds: integer("compute_seconds").notNull().default(0),
    vcpus: integer("vcpus").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("cloud_ledger_entries_reference_unique").on(table.reference),
    index("cloud_ledger_entries_user_created_idx").on(table.clerkUserId, table.createdAt),
  ],
);

/** A code the WeStride team hands out that adds funds when redeemed. */
export const cloudRedemptionCodes = pgTable(
  "cloud_redemption_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Upper case, no spaces. Compared case-insensitively on entry. */
    code: text("code").notNull(),
    /** USD in millionths each redemption adds. */
    amountMicros: bigint("amount_micros", { mode: "number" }).notNull(),
    /** How many different members may redeem it. Null is unlimited. */
    maxRedemptions: integer("max_redemptions"),
    redemptionCount: integer("redemption_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    isActive: boolean("is_active").notNull().default(true),
    /** Why it exists, e.g. "Hackathon judges". Never shown to members. */
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("cloud_redemption_codes_code_unique").on(table.code)],
);

/** Each member can redeem a given code once. */
export const cloudCodeRedemptions = pgTable(
  "cloud_code_redemptions",
  {
    codeId: uuid("code_id")
      .notNull()
      .references(() => cloudRedemptionCodes.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.codeId, table.clerkUserId] }),
    index("cloud_code_redemptions_user_idx").on(table.clerkUserId),
  ],
);

export const cloudRedemptionCodesRelations = relations(cloudRedemptionCodes, ({ many }) => ({
  redemptions: many(cloudCodeRedemptions),
}));

export const cloudCodeRedemptionsRelations = relations(cloudCodeRedemptions, ({ one }) => ({
  code: one(cloudRedemptionCodes, {
    fields: [cloudCodeRedemptions.codeId],
    references: [cloudRedemptionCodes.id],
  }),
}));

export type CloudProviderPreference = (typeof cloudProviderPreference.enumValues)[number];
export type CloudLedgerKind = (typeof cloudLedgerKind.enumValues)[number];
export type CloudAccount = typeof cloudAccounts.$inferSelect;
export type NewCloudAccount = typeof cloudAccounts.$inferInsert;
export type CloudLedgerEntry = typeof cloudLedgerEntries.$inferSelect;
export type NewCloudLedgerEntry = typeof cloudLedgerEntries.$inferInsert;
export type CloudRedemptionCode = typeof cloudRedemptionCodes.$inferSelect;
export type NewCloudRedemptionCode = typeof cloudRedemptionCodes.$inferInsert;
export type CloudCodeRedemption = typeof cloudCodeRedemptions.$inferSelect;
