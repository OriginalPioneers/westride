import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
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

export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
