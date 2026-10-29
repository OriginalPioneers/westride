import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Interest, Depth } from "./challenge-catalog";
export type LearningFeedback = { observation: string; suggestion: string };
export const learningAttempts = pgTable(
  "learning_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    challengeSlug: text("challenge_slug").notNull(),
    interest: text("interest").$type<Interest>().notNull(),
    depth: text("depth").$type<Depth>().notNull(),
    prompt: text("prompt").notNull(),
    answer: text("answer").notNull().default(""),
    feedback: jsonb("feedback").$type<LearningFeedback>(),
    revision: text("revision").notNull().default(""),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
    busyUntil: timestamp("busy_until", { withTimezone: true, mode: "date" }),
    operationId: uuid("operation_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("learning_attempts_user_challenge_interest_unique").on(
      t.clerkUserId,
      t.challengeSlug,
      t.interest,
    ),
  ],
);
export const learningMuseBudgets = pgTable("learning_muse_budgets", {
  key: text("key").primaryKey(),
  calls: integer("calls").notNull().default(0),
});
export type LearningAttempt = typeof learningAttempts.$inferSelect;
