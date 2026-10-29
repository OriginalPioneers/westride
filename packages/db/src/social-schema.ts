import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  index,
} from "drizzle-orm/pg-core";
export const socialPosts = pgTable(
  "social_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    platform: text("platform").notNull(),
    brief: text("brief").notNull(),
    body: text("body").notNull().default(""),
    generatedAt: timestamp("generated_at", {
      withTimezone: true,
      mode: "date",
    }),
    operationId: uuid("operation_id"),
    busyUntil: timestamp("busy_until", { withTimezone: true, mode: "date" }),
    sharedUrl: text("shared_url"),
    sharedAt: timestamp("shared_at", { withTimezone: true, mode: "date" }),
    sharedDay: text("shared_day"),
    timeZone: text("time_zone"),
    engagement: text("engagement"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("social_posts_user_url_unique").on(
      table.clerkUserId,
      table.sharedUrl,
    ),
    index("social_posts_user_idx").on(table.clerkUserId),
  ],
);
export type SocialPost = typeof socialPosts.$inferSelect;
