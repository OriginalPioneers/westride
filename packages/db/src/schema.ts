import { relations } from "drizzle-orm";
import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const tracks = pgTable("tracks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
});

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
