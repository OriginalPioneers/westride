import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const trackDifficulty = pgEnum("track_difficulty", [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
]);

export const tracks = pgTable(
  "tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    difficulty: trackDifficulty("difficulty").notNull(),
    category: text("category").notNull(),
    estimatedDurationMinutes: integer("estimated_duration_minutes").notNull(),
    /** Planned lesson count. Lesson rows are added in a later seed. */
    lessonCount: integer("lesson_count").notNull(),
    sortOrder: integer("sort_order").notNull(),
    icon: text("icon").notNull(),
    tags: text("tags").array().notNull(),
    prerequisiteSlugs: text("prerequisite_slugs").array().notNull(),
    learningObjectives: text("learning_objectives").array().notNull(),
    achievementTitle: text("achievement_title").notNull(),
  },
  (table) => [
    uniqueIndex("tracks_slug_unique").on(table.slug),
    index("tracks_sort_order_idx").on(table.sortOrder),
  ],
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id),
  },
  (table) => [index("lessons_track_id_idx").on(table.trackId)],
);

export const tracksRelations = relations(tracks, ({ many }) => ({
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  track: one(tracks, {
    fields: [lessons.trackId],
    references: [tracks.id],
  }),
}));

export const achievements = pgTable(
  "achievements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    badgeUrl: text("badge_url").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    uniqueIndex("achievements_slug_unique").on(table.slug),
    index("achievements_sort_order_idx").on(table.sortOrder),
  ],
);

export const userAchievements = pgTable(
  "user_achievements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Clerk user id. Guests are never written here. */
    clerkUserId: text("clerk_user_id").notNull(),
    achievementId: uuid("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_achievements_user_achievement_unique").on(
      table.clerkUserId,
      table.achievementId,
    ),
    index("user_achievements_clerk_user_id_idx").on(table.clerkUserId),
  ],
);

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(
  userAchievements,
  ({ one }) => ({
    achievement: one(achievements, {
      fields: [userAchievements.achievementId],
      references: [achievements.id],
    }),
  }),
);

export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type NewUserAchievement = typeof userAchievements.$inferInsert;
